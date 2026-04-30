package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.dto.AttendanceDTO;
import com.lms.www.leadmanagement.dto.LocationRequestDTO;
import com.lms.www.leadmanagement.entity.*;
import com.lms.www.leadmanagement.exception.ResourceNotFoundException;
import com.lms.www.leadmanagement.exception.SecurityViolationException;
import com.lms.www.leadmanagement.mapper.AttendanceMapper;
import com.lms.www.leadmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceDailyRepository attendanceDailyRepository;
    private final OfficeLocationRepository officeLocationRepository;
    private final AttendancePolicyRepository attendancePolicyRepository;
    private final UserRepository userRepository;
    private final AttendanceMapper attendanceMapper;
    private final GlobalTargetRepository globalTargetRepository;
    private final AttendanceAuditLogRepository auditLogRepository;
    private final SecurityService securityService;
    private final AttendanceShiftRepository attendanceShiftRepository;

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");

    private double maxSpeedKmph = 150.0;
    private double maxAccuracyMeters = 100000.0; // 100km default for high-tolerance environments
    private double velocityJumpThresholdMeters = 500.0;

    private volatile List<OfficeLocation> officeCache = null;
    private volatile LocalDateTime lastCacheRefresh = null;

    private static final int DEFAULT_TRACKING_INTERVAL = 300;
    private static final int DEFAULT_GRACE_PERIOD = 2;
    private static final LocalTime DEFAULT_SHORT_BREAK_START = LocalTime.of(17, 0);
    private static final LocalTime DEFAULT_SHORT_BREAK_END = LocalTime.of(17, 10);
    private static final LocalTime DEFAULT_LONG_BREAK_START = LocalTime.of(13, 0);
    private static final LocalTime DEFAULT_LONG_BREAK_END = LocalTime.of(14, 0);

    private static final List<AttendanceStatus> ACTIVE_STATUSES = List.of(
            AttendanceStatus.WORKING,
            AttendanceStatus.ON_SHORT_BREAK,
            AttendanceStatus.ON_LONG_BREAK,
            AttendanceStatus.AUTO_BREAK,
            AttendanceStatus.OUTSIDE_UNAUTHORIZED);

    private LocalDateTime nowInIndia() {
        return LocalDateTime.now(INDIA_ZONE);
    }

    private LocalDate todayInIndia() {
        return LocalDate.now(INDIA_ZONE);
    }

    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private List<OfficeLocation> getOffices() {
        if (officeCache == null || lastCacheRefresh == null
                || lastCacheRefresh.isBefore(nowInIndia().minusMinutes(5))) {
            officeCache = officeLocationRepository.findAll();
            lastCacheRefresh = nowInIndia();
        }
        return officeCache;
    }

    private Optional<OfficeLocation> findNearestOffice(double lat, double lng) {
        return getOffices().stream()
                .min((o1, o2) -> Double.compare(
                        calculateDistance(lat, lng, o1.getLatitude(), o1.getLongitude()),
                        calculateDistance(lat, lng, o2.getLatitude(), o2.getLongitude())));
    }

    @Transactional
    public AttendanceDTO clockIn(LocationRequestDTO request, String ua, String ip) {
        Long userId = request.getUserId();

        if (request.isMockLocation()) {
            throw new SecurityViolationException("Security violation: Mock location detected.");
        }

        attendanceSessionRepository.findByUserIdAndStatusIn(userId, ACTIVE_STATUSES)
                .ifPresent(this::finalizeSession);

        OfficeLocation office = findNearestOffice(request.getLat(), request.getLng())
                .orElseThrow(() -> new RuntimeException("No office locations defined."));

        if (calculateDistance(request.getLat(), request.getLng(), office.getLatitude(),
                office.getLongitude()) > 100000) {
            throw new RuntimeException("Outside office zone. Move closer to " + office.getName());
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Safeguard: Prevent clock-in before joining date
        if (user.getJoiningDate() != null && todayInIndia().isBefore(user.getJoiningDate())) {
            throw new RuntimeException("Cannot clock in before your official joining date: " + user.getJoiningDate());
        }

        AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(office.getId())
                .orElseGet(() -> AttendancePolicy.builder().office(office).build());

        LocalDateTime now = nowInIndia();

        double effectiveMaxAccuracy = (policy != null && policy.getMaxAccuracyMeters() != null)
                ? policy.getMaxAccuracyMeters().doubleValue()
                : maxAccuracyMeters;

        if (request.getAccuracy() != null && request.getAccuracy() > effectiveMaxAccuracy) {
            String officeName = office != null ? office.getName() : "Unknown Office";
            throw new RuntimeException("Inaccurate location (" + request.getAccuracy() + "m) for " + officeName
                    + ". Governance Policy allows max " + effectiveMaxAccuracy + "m accuracy.");
        }

        // Priority: User's assigned shift, then Office Policy
        LocalTime shiftStart = (user.getShift() != null) ? user.getShift().getStartTime() : policy.getShiftStartTime();
        int graceMins = (user.getShift() != null) ? user.getShift().getGraceMinutes()
                : (policy.getGracePeriodMinutes() != null ? policy.getGracePeriodMinutes() : 0);

        boolean isLate = now.toLocalTime().isAfter(shiftStart.plusMinutes(graceMins));
        int lateMinutes = 0;
        if (isLate) {
            lateMinutes = (int) java.time.Duration.between(shiftStart, now.toLocalTime()).toMinutes();
        }

        AttendanceSession session = AttendanceSession.builder()
                .user(user).office(office).checkInTime(now).status(AttendanceStatus.WORKING)
                .lastLat(request.getLat()).lastLng(request.getLng())
                .lastAccuracy(request.getAccuracy() != null ? request.getAccuracy() : 0.0)
                .lastLocationTime(now).lastSeenTime(now)
                .deviceId(request.getDeviceId() != null ? request.getDeviceId() : "WEB_BROWSER")
                .userAgent(ua).ipHash(secureHash(ip))
                .totalWorkMinutes(0).totalBreakMinutes(0).isAutoCheckout(false)
                .isLate(isLate)
                .lateMinutes(lateMinutes)
                .build();

        return convertToDTO(attendanceSessionRepository.save(session), session.getCheckInTime().toLocalDate());
    }

    @Transactional
    public AttendanceDTO trackLocation(LocationRequestDTO request, String ua, String ip) {
        Long userId = request.getUserId();
        if (request.isMockLocation())
            throw new SecurityViolationException("Mock location detected.");

        try {
            AttendanceSession session = attendanceSessionRepository
                    .findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES)
                    .orElseThrow(() -> new ResourceNotFoundException("No active session found."));

            AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(session.getOffice().getId())
                    .orElseGet(() -> AttendancePolicy.builder().office(session.getOffice()).build());

            LocalDateTime now = nowInIndia();
            performVelocityCheck(session, request, now, policy);

            long secondsSinceLast = Duration.between(session.getLastLocationTime(), now).getSeconds();
            int interval = policy.getTrackingIntervalSec() != null ? policy.getTrackingIntervalSec()
                    : DEFAULT_TRACKING_INTERVAL;
            if (secondsSinceLast < (interval / 2))
                return convertToDTO(session, session.getCheckInTime().toLocalDate());

            resolveAttendanceState(session, policy, now, isInsideOffice(session, request));

            session.setLastLat(request.getLat());
            session.setLastLng(request.getLng());
            session.setLastAccuracy(request.getAccuracy() != null ? request.getAccuracy() : session.getLastAccuracy());
            session.setLastLocationTime(now);

            return convertToDTO(attendanceSessionRepository.save(session), session.getCheckInTime().toLocalDate());
        } catch (PessimisticLockingFailureException e) {
            throw new RuntimeException("System busy. Try again.");
        }
    }

    private boolean isInsideOffice(AttendanceSession session, LocationRequestDTO request) {
        User user = session.getUser();
        // Check assigned office first (highest probability)
        if (user.getAssignedOffice() != null) {
            double dist = calculateDistance(request.getLat(), request.getLng(), user.getAssignedOffice().getLatitude(),
                    user.getAssignedOffice().getLongitude());
            if (dist <= user.getAssignedOffice().getRadius())
                return true;
        }
        // Check other offices from cache
        return getOffices().stream().anyMatch(o -> calculateDistance(request.getLat(), request.getLng(),
                o.getLatitude(), o.getLongitude()) <= o.getRadius());
    }

    private void performVelocityCheck(AttendanceSession session, LocationRequestDTO request, LocalDateTime now,
            AttendancePolicy policy) {
        double effectiveMaxAccuracy = (policy != null && policy.getMaxAccuracyMeters() != null)
                ? policy.getMaxAccuracyMeters().doubleValue()
                : maxAccuracyMeters;

        // Apply a 50% leniency factor for heartbeats vs initial clock-in to prevent
        // random drops
        double toleranceFactor = 1.5;
        if (request.getAccuracy() != null && request.getAccuracy() > (effectiveMaxAccuracy * toleranceFactor))
            throw new RuntimeException("Inaccurate location data (Received: " + request.getAccuracy() + "m, Allowed: "
                    + (effectiveMaxAccuracy * toleranceFactor) + "m). Please move to a clearer area.");

        if (session.getLastLat() != null && session.getLastLocationTime() != null) {
            double metersMoved = calculateDistance(session.getLastLat(), session.getLastLng(), request.getLat(),
                    request.getLng());
            long secondsElapsed = Duration.between(session.getLastLocationTime(), now).toSeconds();

            if (secondsElapsed > 0) {
                double kmph = (metersMoved / 1000.0) / (secondsElapsed / 3600.0);
                if (kmph > maxSpeedKmph)
                    throw new RuntimeException("Suspicious activity detected.");
                if (secondsElapsed < 10 && metersMoved > velocityJumpThresholdMeters)
                    throw new RuntimeException("Sudden location jump detected.");
            }
        }
    }

    private long calculateOverlapSeconds(LocalDateTime start, LocalDateTime end, LocalTime targetStart,
            LocalTime targetEnd) {
        if (targetStart == null || targetEnd == null)
            return 0;

        LocalDateTime tStart = end.toLocalDate().atTime(targetStart);
        LocalDateTime tEnd = end.toLocalDate().atTime(targetEnd);

        LocalDateTime overlapStart = start.isAfter(tStart) ? start : tStart;
        LocalDateTime overlapEnd = end.isBefore(tEnd) ? end : tEnd;

        if (overlapStart.isBefore(overlapEnd)) {
            return Duration.between(overlapStart, overlapEnd).toSeconds();
        }
        return 0;
    }

    private long getBreakOverlap(LocalDateTime start, LocalDateTime end, AttendancePolicy policy) {
        LocalTime lStart = policy.getLongBreakStartTime() != null ? policy.getLongBreakStartTime()
                : DEFAULT_LONG_BREAK_START;
        LocalTime lEnd = policy.getLongBreakEndTime() != null ? policy.getLongBreakEndTime() : DEFAULT_LONG_BREAK_END;
        LocalTime sStart = policy.getShortBreakStartTime() != null ? policy.getShortBreakStartTime()
                : DEFAULT_SHORT_BREAK_START;
        LocalTime sEnd = policy.getShortBreakEndTime() != null ? policy.getShortBreakEndTime()
                : DEFAULT_SHORT_BREAK_END;

        return calculateOverlapSeconds(start, end, lStart, lEnd) + calculateOverlapSeconds(start, end, sStart, sEnd);
    }

    private void resolveAttendanceState(AttendanceSession session, AttendancePolicy policy, LocalDateTime now,
            boolean currentlyInside) {
        if (session.getLastLocationTime() == null) {
            return;
        }

        AttendanceStatus oldStatus = session.getStatus();
        LocalDateTime lastPing = session.getLastSeenTime() != null ? session.getLastSeenTime()
                : (session.getCheckInTime() != null ? session.getCheckInTime() : now.minusMinutes(1));

        long segmentSecs = Duration.between(lastPing, now).toSeconds();
        if (segmentSecs <= 0) return;

        long shortBreakOverlap = calculateOverlapSeconds(lastPing, now, 
                policy.getShortBreakStartTime() != null ? policy.getShortBreakStartTime() : DEFAULT_SHORT_BREAK_START,
                policy.getShortBreakEndTime() != null ? policy.getShortBreakEndTime() : DEFAULT_SHORT_BREAK_END);
        
        long longBreakOverlap = calculateOverlapSeconds(lastPing, now,
                policy.getLongBreakStartTime() != null ? policy.getLongBreakStartTime() : DEFAULT_LONG_BREAK_START,
                policy.getLongBreakEndTime() != null ? policy.getLongBreakEndTime() : DEFAULT_LONG_BREAK_END);

        long autoBreakSecs = shortBreakOverlap + longBreakOverlap;

        // 1. Manual Status Tracking
        if (oldStatus == AttendanceStatus.ON_SHORT_BREAK) {
            session.setShortBreakSeconds(session.getShortBreakSeconds() + segmentSecs);
            session.setTotalBreakSeconds(session.getTotalBreakSeconds() + segmentSecs);
        } else if (oldStatus == AttendanceStatus.ON_LONG_BREAK) {
            session.setLongBreakSeconds(session.getLongBreakSeconds() + segmentSecs);
            session.setTotalBreakSeconds(session.getTotalBreakSeconds() + segmentSecs);
        } else {
            // Either WORKING or OUTSIDE_UNAUTHORIZED
            if (currentlyInside) {
                // Calculate overlap with Shift Window [ShiftStart, ShiftEnd]
                User user = session.getUser();
                LocalTime sStart = (user.getShift() != null) ? user.getShift().getStartTime() : (policy.getShiftStartTime() != null ? policy.getShiftStartTime() : LocalTime.of(9, 30));
                LocalTime sEnd = (user.getShift() != null) ? user.getShift().getEndTime() : (policy.getShiftEndTime() != null ? policy.getShiftEndTime() : LocalTime.of(18, 30));

                long billableOverlapSecs = calculateOverlapSeconds(lastPing, now, sStart, sEnd);
                
                // Subtract automatic breaks from the billable work time
                long workSecs = Math.max(0, billableOverlapSecs - autoBreakSecs);
                
                session.setTotalWorkSeconds(session.getTotalWorkSeconds() + workSecs);
                
                // If it was an auto-break, add those seconds to the break total too
                if (autoBreakSecs > 0) {
                    session.setShortBreakSeconds(session.getShortBreakSeconds() + shortBreakOverlap);
                    session.setLongBreakSeconds(session.getLongBreakSeconds() + longBreakOverlap);
                    session.setTotalBreakSeconds(session.getTotalBreakSeconds() + autoBreakSecs);
                }

                session.setOutsideStartTime(null);
            } else {
                session.setUnauthorizedOutsideSeconds(session.getUnauthorizedOutsideSeconds() + segmentSecs);
                if (session.getOutsideStartTime() == null) {
                    session.setOutsideStartTime(now.minusSeconds(segmentSecs));
                }
            }
        }

        session.setTotalWorkMinutes((int) (session.getTotalWorkSeconds() / 60));
        session.setTotalBreakMinutes((int) (session.getTotalBreakSeconds() / 60));
        session.setLastSeenTime(now);

        updateVisualStatus(session, policy, now, currentlyInside, oldStatus);
    }

    private void updateVisualStatus(AttendanceSession session, AttendancePolicy policy, LocalDateTime now,
            boolean inside, AttendanceStatus old) {
        
        // If the user manually selected a break, KEEP IT. 
        // Do not auto-switch back to WORKING or OUTSIDE unless they click Resume.
        if (old == AttendanceStatus.ON_SHORT_BREAK || old == AttendanceStatus.ON_LONG_BREAK) {
            return; 
        }

        if (inside) {
            session.setStatus(AttendanceStatus.WORKING);
        } else {
            int graceSecs = (policy.getGracePeriodMinutes() != null ? policy.getGracePeriodMinutes()
                    : DEFAULT_GRACE_PERIOD) * 60;
            
            if (session.getOutsideStartTime() != null
                    && Duration.between(session.getOutsideStartTime(), now).toSeconds() > graceSecs) {
                session.setStatus(AttendanceStatus.OUTSIDE_UNAUTHORIZED);
            } else {
                // Show as WORKING during the grace period
                session.setStatus(AttendanceStatus.WORKING);
            }
        }
    }

    private boolean isTimeInBreak(LocalTime time, AttendancePolicy policy) {
        return isWithin(time, policy.getLongBreakStartTime(), policy.getLongBreakEndTime(), DEFAULT_LONG_BREAK_START,
                DEFAULT_LONG_BREAK_END) ||
                isWithin(time, policy.getShortBreakStartTime(), policy.getShortBreakEndTime(),
                        DEFAULT_SHORT_BREAK_START, DEFAULT_SHORT_BREAK_END);
    }

    private boolean isLongBreak(LocalTime time, AttendancePolicy policy) {
        return isWithin(time, policy.getLongBreakStartTime(), policy.getLongBreakEndTime(), DEFAULT_LONG_BREAK_START,
                DEFAULT_LONG_BREAK_END);
    }

    private boolean isWithin(LocalTime current, LocalTime start, LocalTime end, LocalTime dStart, LocalTime dEnd) {
        LocalTime s = start != null ? start : dStart;
        LocalTime e = end != null ? end : dEnd;
        // Fix: Exclude end time to prevent overlap (e.g., 14:00 is end of lunch, 14:00
        // is working)
        return !current.isBefore(s) && current.isBefore(e);
    }

    private String secureHash(String input) {
        if (input == null)
            return "0";
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return String.valueOf(input.hashCode());
        }
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getDailySummaries(LocalDate startDate, LocalDate endDate, Long targetUserId,
            Long requesterId) {
        User requester = userRepository.findById(requesterId).orElseThrow();
        java.util.Set<Long> visibleUserIds = securityService.getAllowedUserIds(requester);

        if (targetUserId != null) {
            securityService.validateAccess(requester, targetUserId);
            visibleUserIds = java.util.Collections.singleton(targetUserId);
        }

        if (startDate == null)
            startDate = todayInIndia();
        if (endDate == null)
            endDate = startDate;

        List<AttendanceDTO> results = new ArrayList<>();
        for (Long uid : visibleUserIds) {
            User user = userRepository.findById(uid).orElse(null);
            if (user == null)
                continue;

            LocalDate userJoinDate = user.getJoiningDate();
            if (userJoinDate == null && user.getCreatedAt() != null) {
                userJoinDate = user.getCreatedAt().toLocalDate();
            }

            // If we still have no date, or user joined after the end of the range, skip
            if (userJoinDate != null && userJoinDate.isAfter(endDate)) {
                continue;
            }

            // Start from the later of (startDate) or (userJoinDate)
            LocalDate effectiveStart = startDate;
            if (userJoinDate != null && userJoinDate.isAfter(startDate)) {
                effectiveStart = userJoinDate;
            }

            for (LocalDate date = effectiveStart; !date.isAfter(endDate); date = date.plusDays(1)) {
                AttendanceDTO dto = fetchAttendanceForDate(user, date);
                if (dto != null) {
                    results.add(dto);
                }
            }
        }
        return results;
    }

    private AttendanceDTO fetchAttendanceForDate(User user, LocalDate date) {
        LocalDate userJoinDate = user.getJoiningDate();
        if (userJoinDate == null && user.getCreatedAt() != null) {
            userJoinDate = user.getCreatedAt().toLocalDate();
        }

        // Business Rule: Attendance is invalid before joining/creation date
        if (userJoinDate != null && date.isBefore(userJoinDate)) {
            return null;
        }

        Optional<AttendanceSession> session = attendanceSessionRepository
                .findSessionsForDate(user.getId(), date.atStartOfDay(), date.atTime(23, 59, 59))
                .stream().findFirst();

        if (session.isPresent()) {
            return convertToDTO(session.get(), date);
        }

        Optional<AttendanceDaily> daily = attendanceDailyRepository
                .findByUserIdAndDate(user.getId(), date);

        if (daily.isPresent()) {
            return convertDailyToDTO(daily.get(), user, date);
        }

        return createAbsentDTO(user, date);
    }

    private void finalizeSession(AttendanceSession s) {
        LocalDateTime now = nowInIndia();

        // Final segment calculation before closing
        try {
            AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(s.getOffice().getId())
                    .orElseGet(() -> AttendancePolicy.builder().office(s.getOffice()).build());
            // Assume the user was in their last known state for radius check
            boolean lastInside = isInsideLastKnown(s);
            resolveAttendanceState(s, policy, now, lastInside);
        } catch (Exception e) {
            log.warn("Could not resolve final segment for session {}", s.getId());
        }

        s.setStatus(AttendanceStatus.PUNCHED_OUT);
        s.setCheckOutTime(now);
        attendanceSessionRepository.save(s);
        if (s.getCheckInTime() != null) {
            reconcileDailySummary(s.getUser().getId(), s.getCheckInTime().toLocalDate(), s.getOffice());
        }
    }

    private boolean isInsideLastKnown(AttendanceSession s) {
        if (s.getLastLat() == null)
            return true; // Fallback
        LocationRequestDTO lastLoc = new LocationRequestDTO();
        lastLoc.setLat(s.getLastLat());
        lastLoc.setLng(s.getLastLng());
        return isInsideOffice(s, lastLoc);
    }

    private void reconcileDailySummary(Long userId, LocalDate date, OfficeLocation office) {
        User user = userRepository.findById(userId).orElseThrow();

        if (user.getJoiningDate() != null && date.isBefore(user.getJoiningDate())) {
            return;
        }

        List<AttendanceSession> sessions = attendanceSessionRepository.findSessionsForDate(userId, date.atStartOfDay(),
                date.atTime(23, 59, 59));

        if (sessions.isEmpty()) {
            return;
        }

        long totalWorkSecs = sessions.stream()
                .mapToLong(s -> s.getTotalWorkSeconds() != null ? s.getTotalWorkSeconds() : 0).sum();
        long totalBreakSecs = sessions.stream()
                .mapToLong(s -> s.getTotalBreakSeconds() != null ? s.getTotalBreakSeconds() : 0).sum();
        long totalShortBreakSecs = sessions.stream()
                .mapToLong(s -> s.getShortBreakSeconds() != null ? s.getShortBreakSeconds() : 0).sum();
        long totalLongBreakSecs = sessions.stream()
                .mapToLong(s -> s.getLongBreakSeconds() != null ? s.getLongBreakSeconds() : 0).sum();
        long totalOutsideSecs = sessions.stream()
                .mapToLong(s -> s.getUnauthorizedOutsideSeconds() != null ? s.getUnauthorizedOutsideSeconds() : 0)
                .sum();

        // 1. Calculate Core Timings
        LocalDateTime earliestLogin = sessions.stream()
                .map(AttendanceSession::getCheckInTime)
                .min(LocalDateTime::compareTo)
                .orElse(null);

        LocalDateTime latestLogout = sessions.stream()
                .map(AttendanceSession::getCheckOutTime)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        AttendanceDaily daily = attendanceDailyRepository.findByUserIdAndDate(userId, date)
                .orElse(AttendanceDaily.builder().user(user).date(date).build());

        // 1. Core Logic: totalWorked = logout - login
        daily.setLoginTime(earliestLogin);
        daily.setLogoutTime(latestLogout);

        long totalWorkedMins = 0;
        if (earliestLogin != null && latestLogout != null) {
            totalWorkedMins = Duration.between(earliestLogin, latestLogout).toMinutes();
        }

        // 2. Fetch Shift & Policy Timing (Defaults: 11:00 AM, 15m grace)
        LocalTime shiftStart = LocalTime.of(11, 0);
        int graceMins = 15;
        long fullDayThresholdSecs = 28800; // 480 mins
        long halfDayThresholdSecs = 14400; // 240 mins

        LocalTime shortBreakStart = LocalTime.of(17, 0);
        LocalTime shortBreakEnd = LocalTime.of(17, 10);
        LocalTime longBreakStart = LocalTime.of(13, 0);
        LocalTime longBreakEnd = LocalTime.of(14, 0);

        AttendanceShift shift = user.getShift();
        if (shift != null) {
            shiftStart = shift.getStartTime();
            graceMins = shift.getGraceMinutes();
            fullDayThresholdSecs = shift.getMinFullDayMinutes() * 60L;
            halfDayThresholdSecs = shift.getMinHalfDayMinutes() * 60L;
        } else {
            AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(office.getId()).orElse(null);
            if (policy != null) {
                shiftStart = policy.getShiftStartTime() != null ? policy.getShiftStartTime() : shiftStart;
                graceMins = policy.getGracePeriodMinutes() != null ? policy.getGracePeriodMinutes() : graceMins;
                fullDayThresholdSecs = policy.getMinimumWorkMinutes() != null ? policy.getMinimumWorkMinutes() * 60L
                        : fullDayThresholdSecs;
                halfDayThresholdSecs = policy.getHalfDayMinutes() != null ? policy.getHalfDayMinutes() * 60L
                        : fullDayThresholdSecs / 2;
                shortBreakStart = policy.getShortBreakStartTime() != null ? policy.getShortBreakStartTime()
                        : shortBreakStart;
                shortBreakEnd = policy.getShortBreakEndTime() != null ? policy.getShortBreakEndTime() : shortBreakEnd;
                longBreakStart = policy.getLongBreakStartTime() != null ? policy.getLongBreakStartTime()
                        : longBreakStart;
                longBreakEnd = policy.getLongBreakEndTime() != null ? policy.getLongBreakEndTime() : longBreakEnd;
            }
        }

        // 3. Break calculation (short + long)
        long shortBreakMins = totalShortBreakSecs / 60;
        long longBreakMins = totalLongBreakSecs / 60;

        // Automated overlap deduction
        LocalDateTime effectiveEnd = latestLogout != null ? latestLogout : LocalDateTime.now();
        if (earliestLogin != null) {
            LocalDateTime sbStartDT = earliestLogin.toLocalDate().atTime(shortBreakStart);
            LocalDateTime sbEndDT = earliestLogin.toLocalDate().atTime(shortBreakEnd);
            long autoShortBreakMins = calculateOverlapMinutes(earliestLogin, effectiveEnd, sbStartDT, sbEndDT);

            LocalDateTime lbStartDT = earliestLogin.toLocalDate().atTime(longBreakStart);
            LocalDateTime lbEndDT = earliestLogin.toLocalDate().atTime(longBreakEnd);
            long autoLongBreakMins = calculateOverlapMinutes(earliestLogin, effectiveEnd, lbStartDT, lbEndDT);

            shortBreakMins = Math.max(shortBreakMins, autoShortBreakMins);
            longBreakMins = Math.max(longBreakMins, autoLongBreakMins);
        }

        long totalBreakMins = shortBreakMins + longBreakMins;

        // Validation: break time should not exceed totalWorked
        if (totalBreakMins > totalWorkedMins) {
            totalBreakMins = totalWorkedMins;
        }

        // 4. workingMinutes = totalWorked - (shortBreak + longBreak)
        long workingMinutes = totalWorkedMins - totalBreakMins;
        if (workingMinutes < 0)
            workingMinutes = 0; // Validation: never negative

        // 5. idleMinutes = workingMinutes - productiveMinutes
        long productiveMinutes = totalWorkSecs / 60;
        long idleMinutes = workingMinutes - productiveMinutes;
        if (idleMinutes < 0)
            idleMinutes = 0;

        // 6. Apply Status Rule: Based on workingMinutes (FULL >= 480, HALF >= 240)
        String status = calculateAttendanceStatus(workingMinutes * 60, fullDayThresholdSecs, halfDayThresholdSecs);

        // 7. Late Rule: graceTime = shift_start + grace_minutes
        if (earliestLogin != null) {
            LocalTime loginTime = earliestLogin.toLocalTime();
            LocalTime graceTime = shiftStart.plusMinutes(graceMins);

            if (loginTime.isAfter(graceTime)) {
                // If login > graceTime → lateMinutes = difference
                long lateMillis = Duration.between(graceTime, loginTime).toMillis();
                daily.setLateMinutes((int) (lateMillis / 60000));
            } else {
                daily.setLateMinutes(0);
            }
        }

        daily.setTotalWorkSeconds(workingMinutes * 60);
        daily.setTotalWorkMinutes((int) workingMinutes);
        daily.setTotalBreakSeconds(totalBreakMins * 60);
        daily.setTotalBreakMinutes((int) totalBreakMins);
        daily.setShortBreakMinutes((int) shortBreakMins);
        daily.setLongBreakMinutes((int) longBreakMins);
        daily.setProductiveMinutes((int) productiveMinutes);
        daily.setIdleMinutes((int) idleMinutes);
        daily.setStatus(status);
        attendanceDailyRepository.save(daily);
    }

    private long calculateOverlapMinutes(LocalDateTime shiftStart, LocalDateTime shiftEnd, LocalDateTime breakStart,
            LocalDateTime breakEnd) {
        LocalDateTime latestStart = shiftStart.isAfter(breakStart) ? shiftStart : breakStart;
        LocalDateTime earliestEnd = shiftEnd.isBefore(breakEnd) ? shiftEnd : breakEnd;
        if (latestStart.isBefore(earliestEnd)) {
            return Duration.between(latestStart, earliestEnd).toMinutes();
        }
        return 0;
    }

    /**
     * Internal calculation logic for attendance status.
     * FULL if >= 480 mins, HALF if >= 240 mins, else ABSENT.
     */
    public String calculateAttendanceStatus(long workSecs, long fullDaySecs, long halfDaySecs) {
        long workingMinutes = workSecs / 60;
        if (workingMinutes >= 480) {
            return "PRESENT";
        } else if (workingMinutes >= 240) {
            return "HALF_DAY";
        } else {
            return "ABSENT";
        }
    }

    public com.lms.www.leadmanagement.dto.AttendancePreviewResponse calculatePreview(
            com.lms.www.leadmanagement.dto.AttendancePreviewRequest request) {
        LocalDateTime login = request.getLoginTime();
        LocalDateTime logout = request.getLogoutTime();

        if (login == null || logout == null || logout.isBefore(login)) {
            return com.lms.www.leadmanagement.dto.AttendancePreviewResponse.builder()
                    .workedMinutes(0).breakMinutes(0).effectiveMinutes(0).status("ABSENT").build();
        }

        long totalSecs = Duration.between(login, logout).toSeconds();

        // Calculate break overlap using provided or default timings
        long breakSecs = 0;

        // Long Break
        LocalTime lbStart = request.getLongBreakStart() != null ? request.getLongBreakStart()
                : DEFAULT_LONG_BREAK_START;
        LocalTime lbEnd = request.getLongBreakEnd() != null ? request.getLongBreakEnd() : DEFAULT_LONG_BREAK_END;
        breakSecs += calculateOverlapSeconds(login, logout, lbStart, lbEnd);

        // Short Break
        LocalTime sbStart = request.getShortBreakStart() != null ? request.getShortBreakStart()
                : DEFAULT_SHORT_BREAK_START;
        LocalTime sbEnd = request.getShortBreakEnd() != null ? request.getShortBreakEnd() : DEFAULT_SHORT_BREAK_END;
        breakSecs += calculateOverlapSeconds(login, logout, sbStart, sbEnd);

        long effectiveSecs = totalSecs - breakSecs;
        if (effectiveSecs < 0)
            effectiveSecs = 0;

        // Determine status
        long fullDaySecs = request.getMinFullDayMinutes() != null ? request.getMinFullDayMinutes() * 60L : 28800;
        long halfDaySecs = request.getMinHalfDayMinutes() != null ? request.getMinHalfDayMinutes() * 60L : 14400;

        String status = calculateAttendanceStatus(effectiveSecs, fullDaySecs, halfDaySecs);

        boolean isLate = false;
        if (request.getShiftStart() != null) {
            int grace = request.getGraceMinutes() != null ? request.getGraceMinutes() : 0;
            isLate = login.toLocalTime().isAfter(request.getShiftStart().plusMinutes(grace));
        }

        return com.lms.www.leadmanagement.dto.AttendancePreviewResponse.builder()
                .workedMinutes(totalSecs / 60)
                .breakMinutes(breakSecs / 60)
                .effectiveMinutes(effectiveSecs / 60)
                .status(status)
                .isLate(isLate)
                .build();
    }

    @Transactional
    public void saveManualEntry(com.lms.www.leadmanagement.dto.AttendancePreviewRequest request) {
        User requester = securityService.getCurrentUser();
        securityService.validateAccess(requester, request.getUserId());

        User user = userRepository.findById(request.getUserId()).orElseThrow();
        LocalDate date = request.getLoginTime().toLocalDate();

        com.lms.www.leadmanagement.dto.AttendancePreviewResponse preview = calculatePreview(request);

        AttendanceDaily daily = attendanceDailyRepository.findByUserIdAndDate(user.getId(), date)
                .orElse(AttendanceDaily.builder().user(user).date(date).build());

        daily.setTotalWorkSeconds(preview.getEffectiveMinutes() * 60L);
        daily.setTotalWorkMinutes((int) preview.getEffectiveMinutes());
        daily.setTotalBreakSeconds(preview.getBreakMinutes() * 60L);
        daily.setTotalBreakMinutes((int) preview.getBreakMinutes());
        daily.setStatus(preview.getStatus());
        daily.setLateMinutes(preview.isLate() ? 15 : 0);

        attendanceDailyRepository.save(daily);

        log.info("Manual attendance saved for user {} on date {}", user.getId(), date);
    }

    @Transactional
    public AttendanceDTO clockOut(Long userId) {
        AttendanceSession session = attendanceSessionRepository
                .findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("No active session."));
        finalizeSession(session);
        return convertToDTO(session, session.getCheckInTime().toLocalDate());
    }

    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 300000)
    @Transactional
    public void autoPunchOutIdleSessions() {
        LocalDateTime cutoff = nowInIndia().minusHours(2);
        List<AttendanceSession> inactiveSessions = attendanceSessionRepository.findInactiveSessions(ACTIVE_STATUSES,
                cutoff);
        for (AttendanceSession session : inactiveSessions) {
            try {
                log.info("Auto punch-out triggered for session id {}", session.getId());
                session.setAutoCheckout(true);
                finalizeSession(session);
            } catch (Exception e) {
                log.error("Failed to auto punch-out session {}", session.getId(), e);
            }
        }
    }

    @Transactional
    public AttendanceDTO startBreak(Long userId, String type) {
        AttendanceSession session = attendanceSessionRepository
                .findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES)
                .orElseThrow(() -> new IllegalArgumentException("No active session. Please Punch In first."));
        session.setStatus(
                "LONG".equalsIgnoreCase(type) ? AttendanceStatus.ON_LONG_BREAK : AttendanceStatus.ON_SHORT_BREAK);
        session.setOutsideStartTime(nowInIndia());
        return convertToDTO(attendanceSessionRepository.save(session), session.getCheckInTime().toLocalDate());
    }

    @Transactional
    public AttendanceDTO endBreak(Long userId) {
        AttendanceSession session = attendanceSessionRepository
                .findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES)
                .orElseThrow(() -> new IllegalArgumentException("No active session found."));
        session.setStatus(AttendanceStatus.WORKING);
        session.setOutsideStartTime(null);
        return convertToDTO(attendanceSessionRepository.save(session), session.getCheckInTime().toLocalDate());
    }

    @Transactional(readOnly = true)
    public Optional<AttendanceDTO> getCurrentStatus(Long userId) {
        List<AttendanceSession> sessions = attendanceSessionRepository.findLatestStatusNoLock(userId,
                ACTIVE_STATUSES,
                org.springframework.data.domain.PageRequest.of(0, 1));

        return sessions.stream().findFirst()
                .map(s -> convertToDTO(s,
                        s.getCheckInTime() != null ? s.getCheckInTime().toLocalDate() : todayInIndia()));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getMyLogs(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDate end = todayInIndia();
        LocalDate start = end.minusDays(30);

        // Optimize: Don't look back further than joining date
        if (user.getJoiningDate() != null && user.getJoiningDate().isAfter(start)) {
            start = user.getJoiningDate();
        }

        return getDailySummaries(start, end, userId, userId);
    }

    private AttendanceDTO convertToDTO(AttendanceSession s, LocalDate date) {
        if (s == null)
            return null;

        // Safety Recalculation: If lateMinutes is 0, double check against user's
        // current shift
        if (s.getLateMinutes() == null || s.getLateMinutes() == 0) {
            User user = s.getUser();
            AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(s.getOffice().getId()).orElse(null);
            LocalTime shiftStart = (user.getShift() != null) ? user.getShift().getStartTime()
                    : (policy != null ? policy.getShiftStartTime() : null);
            int grace = (user.getShift() != null) ? user.getShift().getGraceMinutes()
                    : (policy != null ? (policy.getGracePeriodMinutes() != null ? policy.getGracePeriodMinutes() : 0)
                            : 0);

            System.out.println("[DEBUG-LATE] Checking session " + s.getId() + " for user " + user.getEmail());
            System.out.println("[DEBUG-LATE] Check-in: " + s.getCheckInTime().toLocalTime() + ", Shift Start: "
                    + shiftStart + ", Grace: " + grace);

            boolean needsSave = false;
            if (shiftStart != null && s.getCheckInTime().toLocalTime().isAfter(shiftStart.plusMinutes(grace))) {
                LocalDateTime loginDT = s.getCheckInTime();
                LocalDateTime shiftStartDT = loginDT.toLocalDate().atTime(shiftStart);

                int rawLate = (int) java.time.Duration.between(shiftStartDT, loginDT).toMinutes();

                // Subtract automatic breaks that fell within the late period
                long breakDeduction = 0;
                if (policy != null) {
                    if (policy.getShortBreakStartTime() != null && policy.getShortBreakEndTime() != null) {
                        breakDeduction += calculateOverlapMinutes(shiftStartDT, loginDT,
                                loginDT.toLocalDate().atTime(policy.getShortBreakStartTime()),
                                loginDT.toLocalDate().atTime(policy.getShortBreakEndTime()));
                    }
                    if (policy.getLongBreakStartTime() != null && policy.getLongBreakEndTime() != null) {
                        breakDeduction += calculateOverlapMinutes(shiftStartDT, loginDT,
                                loginDT.toLocalDate().atTime(policy.getLongBreakStartTime()),
                                loginDT.toLocalDate().atTime(policy.getLongBreakEndTime()));
                    }
                }

                int actualLate = (int) (rawLate - breakDeduction);
                System.out.println("[DEBUG-LATE] Found LATE: " + actualLate + " mins (Raw: " + rawLate + ", Breaks: "
                        + breakDeduction + ")");
                s.setLateMinutes(Math.max(0, actualLate));
                s.setLate(actualLate > 0);
                needsSave = true;
            } else {
                System.out.println("[DEBUG-LATE] Result: NOT LATE");
            }

            // --- ADDED: Work & Break time calculation if missing ---
            if (s.getCheckOutTime() != null) {
                LocalDateTime start = s.getCheckInTime();
                LocalDateTime end = s.getCheckOutTime();
                long totalMins = java.time.Duration.between(start, end).toMinutes();

                long autoShortBreakMins = 0;
                long autoLongBreakMins = 0;
                if (policy != null) {
                    if (policy.getShortBreakStartTime() != null && policy.getShortBreakEndTime() != null) {
                        autoShortBreakMins = calculateOverlapMinutes(start, end,
                                start.toLocalDate().atTime(policy.getShortBreakStartTime()),
                                start.toLocalDate().atTime(policy.getShortBreakEndTime()));
                    }
                    if (policy.getLongBreakStartTime() != null && policy.getLongBreakEndTime() != null) {
                        autoLongBreakMins = calculateOverlapMinutes(start, end,
                                start.toLocalDate().atTime(policy.getLongBreakStartTime()),
                                start.toLocalDate().atTime(policy.getLongBreakEndTime()));
                    }
                }

                int totalBreak = (int) (autoShortBreakMins + autoLongBreakMins);
                int totalWork = (int) (totalMins - totalBreak);

                if (s.getTotalWorkMinutes() == null || s.getTotalWorkMinutes() == 0) {
                    s.setTotalWorkMinutes(Math.max(0, totalWork));
                    needsSave = true;
                }
                if (s.getTotalBreakMinutes() == null || s.getTotalBreakMinutes() == 0) {
                    s.setTotalBreakMinutes(totalBreak);
                    needsSave = true;
                }
            }

            if (needsSave) {
                attendanceSessionRepository.save(s);
            }
        }

        AttendanceDTO dto = attendanceMapper.toDTO(s);
        if (dto != null) {
            dto.setDate(date != null ? date
                    : (s.getCheckInTime() != null ? s.getCheckInTime().toLocalDate() : todayInIndia()));

            // Sync note from AttendanceDaily
            attendanceDailyRepository.findByUserIdAndDate(s.getUser().getId(), dto.getDate())
                    .ifPresent(daily -> dto.setNote(daily.getNote()));

            // Sync Idle Time
            dto.setTotalIdleMinutes(s.getUnauthorizedOutsideMinutes() != null ? s.getUnauthorizedOutsideMinutes() : 0);
        }
        return dto;
    }

    private AttendanceDTO convertDailyToDTO(AttendanceDaily d, User u, LocalDate date) {
        AttendanceDTO dto = new AttendanceDTO();
        dto.setUserId(u.getId());
        dto.setUserName(u.getName());
        dto.setDate(date);
        dto.setStatus(d.getStatus());
        dto.setTotalWorkMinutes(d.getTotalWorkMinutes());
        dto.setTotalBreakMinutes(d.getTotalBreakMinutes());
        dto.setShortBreakMinutes(d.getShortBreakMinutes());
        dto.setLongBreakMinutes(d.getLongBreakMinutes());
        dto.setTotalIdleMinutes(d.getIdleMinutes());
        dto.setProductiveMinutes(d.getProductiveMinutes());
        dto.setLateMinutes(d.getLateMinutes());
        dto.setLate(d.getLateMinutes() != null && d.getLateMinutes() > 0);
        dto.setLoginTime(d.getLoginTime());
        dto.setLogoutTime(d.getLogoutTime());
        dto.setNote(d.getNote());

        if (d.getTotalWorkSeconds() != null) {
            dto.setTotalWorkHours(String.format("%dh %dm", d.getTotalWorkMinutes() / 60, d.getTotalWorkMinutes() % 60));
        }
        if (d.getIdleMinutes() != null) {
            dto.setTotalIdleHours(String.format("%dh %dm", d.getIdleMinutes() / 60, d.getIdleMinutes() % 60));
        }

        return dto;
    }

    @Transactional
    public void updateDailyNote(Long userId, LocalDate date, String note) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        AttendanceDaily daily = attendanceDailyRepository.findByUserIdAndDate(userId, date)
                .orElse(AttendanceDaily.builder().user(user).date(date).build());
        daily.setNote(note);
        attendanceDailyRepository.save(daily);
    }

    private AttendanceDTO createAbsentDTO(User u, LocalDate date) {
        AttendanceDTO dto = new AttendanceDTO();
        dto.setUserId(u.getId());
        dto.setUserName(u.getName());
        dto.setDate(date);
        dto.setStatus("ABSENT");
        return dto;
    }

    // Delegated to AttendancePolicyService in controllers, but kept here for
    // internal compatibility if needed
    public GlobalTarget getGlobalTarget() {
        return globalTargetRepository.findFirstByOrderByIdAsc().orElseGet(GlobalTarget::defaultTarget);
    }

    public GlobalTarget updateGlobalTarget(GlobalTarget updated) {
        GlobalTarget existing = getGlobalTarget();
        existing.setMonthlyLeadQuota(updated.getMonthlyLeadQuota());
        return globalTargetRepository.save(existing);
    }

    public List<AttendanceShift> getAllShifts() {
        return attendanceShiftRepository.findAll();
    }
}
