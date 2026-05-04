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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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
    private final SecurityService securityService;
    private final AttendanceShiftRepository attendanceShiftRepository;

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final double MAX_ALLOWED_ACCURACY = 5000.0;
    private static final double STABLE_GPS_THRESHOLD = 150.0;
    private static final double TRACKING_TOLERANCE = 30.0;
    private static final int GAP_CAP_SECONDS = 1200; // 20 mins

    private static final List<AttendanceStatus> ACTIVE_STATUSES = List.of(
            AttendanceStatus.WORKING,
            AttendanceStatus.OUTSIDE_UNAUTHORIZED);

    private final Map<Long, Queue<Boolean>> locationBufferMap = new ConcurrentHashMap<>();
    private volatile List<OfficeLocation> officeCache = null;
    private volatile LocalDateTime lastCacheRefresh = null;

    private enum InternalWorkState { WORK, BREAK, IDLE }

    private LocalDateTime nowInIndia() { return LocalDateTime.now(INDIA_ZONE); }
    private LocalDate todayInIndia() { return LocalDate.now(INDIA_ZONE); }

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
        if (officeCache == null || lastCacheRefresh == null || lastCacheRefresh.isBefore(nowInIndia().minusMinutes(1))) {
            officeCache = officeLocationRepository.findAll();
            lastCacheRefresh = nowInIndia();
        }
        return officeCache;
    }

    @Transactional
    public AttendanceDTO clockIn(LocationRequestDTO request, String ua, String ip) {
        Long userId = request.getUserId();
        LocalDate today = todayInIndia();
        
        // Rule: Only one punch per day
        if (!attendanceSessionRepository.findByUserIdAndDate(userId, today).isEmpty()) {
            throw new RuntimeException("You have already punched in for today.");
        }

        validateClockInAccuracy(request.getAccuracy());
        attendanceSessionRepository.findAllByUserIdAndStatusIn(userId, ACTIVE_STATUSES)
                .forEach(this::finalizeSession);

        OfficeLocation office = findNearestOffice(request.getLat(), request.getLng());
        double dist = calculateDistance(request.getLat(), request.getLng(), office.getLatitude(), office.getLongitude());
        double radius = (office.getRadius() != null) ? office.getRadius() : 100.0;
        double accuracy = (request.getAccuracy() != null) ? request.getAccuracy() : 0.0;
        
        log.info("Clock-in attempt: User={}, Lat={}, Lng={}, Accuracy={}, Dist={}, Radius={}", userId, request.getLat(), request.getLng(), accuracy, (int)dist, radius);

        // Rule 5: Production-ready check - combine radius with accuracy tolerance
        if (dist > (radius + accuracy + 50.0)) {
            throw new RuntimeException("Outside office zone (" + (int)dist + "m). Move closer to " + office.getName());
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        LocalDateTime now = nowInIndia();
        
        AttendancePolicy policy = attendancePolicyRepository.findByOfficeId(office.getId())
                .orElseGet(() -> AttendancePolicy.builder().office(office).build());

        LocalTime shiftStart = (user.getShift() != null) ? user.getShift().getStartTime() : (policy.getShiftStartTime() != null ? policy.getShiftStartTime() : LocalTime.of(9, 30));
        LocalTime shiftEnd = (user.getShift() != null) ? user.getShift().getEndTime() : (policy.getShiftEndTime() != null ? policy.getShiftEndTime() : LocalTime.of(18, 30));
        int grace = (user.getShift() != null) ? user.getShift().getGraceMinutes() : (policy.getGracePeriodMinutes() != null ? policy.getGracePeriodMinutes() : 0);

        if (now.toLocalTime().isAfter(shiftEnd)) {
            throw new RuntimeException("Cannot clock in. Your shift ended at " + shiftEnd);
        }

        boolean isLate = now.toLocalTime().isAfter(shiftStart.plusMinutes(grace));
        int lateMins = isLate ? (int) Duration.between(shiftStart, now.toLocalTime()).toMinutes() : 0;

        AttendanceSession session = AttendanceSession.builder()
                .user(user).office(office).checkInTime(now).status(AttendanceStatus.WORKING)
                .isAutoCheckout(false)
                .lastLat(request.getLat()).lastLng(request.getLng()).lastAccuracy(request.getAccuracy())
                .isLowAccuracy(accuracy > STABLE_GPS_THRESHOLD)
                .lastLocationTime(now).lastSeenTime(now).deviceId(request.getDeviceId() != null ? request.getDeviceId() : "WEB")
                .userAgent(ua).ipHash(String.valueOf(ip.hashCode()))
                .totalWorkSeconds(0L).totalBreakSeconds(0L).unauthorizedOutsideSeconds(0L)
                .shortBreakSeconds(0L).longBreakSeconds(0L)
                .isLate(isLate).lateMinutes(lateMins).build();

        return convertToDTO(attendanceSessionRepository.save(session), now.toLocalDate());
    }

    @Transactional
    public AttendanceDTO trackLocation(LocationRequestDTO request, String ua, String ip) {
        AttendanceSession session = attendanceSessionRepository.findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(request.getUserId(), ACTIVE_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("No active session."));

        LocalDateTime now = nowInIndia();
        long secs = Duration.between(session.getLastSeenTime(), now).toSeconds();
        if (secs < 5) return convertToDTO(session, session.getCheckInTime().toLocalDate());
        if (secs > GAP_CAP_SECONDS) secs = GAP_CAP_SECONDS;

        // Auto Logout check
        if (isShiftEnded(session, now)) {
            finalizeSession(session);
            return convertToDTO(session, session.getCheckInTime().toLocalDate());
        }

        // Stability Filter
        boolean rawInside = (request.getAccuracy() != null && request.getAccuracy() > MAX_ALLOWED_ACCURACY) 
                ? isInsideLastKnown(session) : isInsideOffice(session, request);
        boolean stableInside = updateAndCheckStability(session.getUser().getId(), rawInside);

        // Core Classification Engine
        InternalWorkState state = resolveWorkState(stableInside, session, now);
        updateCounters(session, state, secs);

        // Finalize heartbeat
        session.setLastLat(request.getLat());
        session.setLastLng(request.getLng());
        session.setLastAccuracy(request.getAccuracy());
        session.setLastSeenTime(now);
        session.setLastLocationTime(now);
        
        // Sync Visual Status
        syncVisualStatus(session, stableInside);

        AttendanceSession saved = attendanceSessionRepository.save(session);
        reconcileDailySummary(session.getUser().getId(), saved.getCheckInTime().toLocalDate(), saved.getOffice());
        return convertToDTO(saved, saved.getCheckInTime().toLocalDate());
    }

    private InternalWorkState resolveWorkState(boolean inside, AttendanceSession session, LocalDateTime now) {
        // Rule 1: Manual break = IDLE (Per requirement)
        if (session.getStatus() == AttendanceStatus.OUTSIDE_UNAUTHORIZED) return InternalWorkState.IDLE;
        
        // Rule 2: Physically outside = IDLE
        if (!inside) return InternalWorkState.IDLE;
        
        // Rule 3: Auto-break window precedence
        if (isInAutoBreakWindow(session, now)) return InternalWorkState.BREAK;
        
        // Rule 4: Otherwise WORK
        return InternalWorkState.WORK;
    }

    private void updateCounters(AttendanceSession s, InternalWorkState state, long secs) {
        switch (state) {
            case WORK:
                s.setTotalWorkSeconds((s.getTotalWorkSeconds() != null ? s.getTotalWorkSeconds() : 0) + secs);
                break;
            case BREAK:
                s.setTotalBreakSeconds((s.getTotalBreakSeconds() != null ? s.getTotalBreakSeconds() : 0) + secs);
                // Sub-bucket break types if window allows (optional refinement)
                break;
            case IDLE:
                s.setUnauthorizedOutsideSeconds((s.getUnauthorizedOutsideSeconds() != null ? s.getUnauthorizedOutsideSeconds() : 0) + secs);
                break;
        }
        // Sync minutes
        s.setTotalWorkMinutes((int) (s.getTotalWorkSeconds() / 60));
        s.setTotalBreakMinutes((int) (s.getTotalBreakSeconds() / 60));
        s.setUnauthorizedOutsideMinutes((int) (s.getUnauthorizedOutsideSeconds() / 60));
    }

    private void syncVisualStatus(AttendanceSession session, boolean inside) {
        if (session.getStatus() == AttendanceStatus.OUTSIDE_UNAUTHORIZED) return;
        
        if (!inside) {
            if (session.getOutsideStartTime() == null) session.setOutsideStartTime(nowInIndia());
            // Grace check (e.g. 2 mins)
            if (Duration.between(session.getOutsideStartTime(), nowInIndia()).toSeconds() > 120) {
                session.setStatus(AttendanceStatus.OUTSIDE_UNAUTHORIZED);
            }
        } else {
            session.setOutsideStartTime(null);
            session.setStatus(AttendanceStatus.WORKING);
        }
    }

    private boolean updateAndCheckStability(Long userId, boolean currentInside) {
        Queue<Boolean> buffer = locationBufferMap.computeIfAbsent(userId, k -> new LinkedList<>());
        buffer.add(currentInside);
        if (buffer.size() > 3) buffer.poll();
        return buffer.stream().filter(v -> v).count() >= 2; // Majority rule
    }

    private boolean isInsideOffice(AttendanceSession s, LocationRequestDTO req) {
        double dist = calculateDistance(req.getLat(), req.getLng(), s.getOffice().getLatitude(), s.getOffice().getLongitude());
        double rad = (s.getOffice().getRadius() != null) ? s.getOffice().getRadius() : 100.0;
        return dist <= (rad + TRACKING_TOLERANCE);
    }

    private boolean isInsideLastKnown(AttendanceSession s) {
        LocationRequestDTO req = new LocationRequestDTO();
        req.setLat(s.getLastLat()); req.setLng(s.getLastLng());
        return isInsideOffice(s, req);
    }

    private boolean isInAutoBreakWindow(AttendanceSession s, LocalDateTime now) {
        LocalTime t = now.toLocalTime();
        AttendanceShift shift = s.getUser().getShift();
        AttendancePolicy p = attendancePolicyRepository.findByOfficeId(s.getOffice().getId()).orElse(null);
        
        LocalTime sbS = (shift != null && shift.getShortBreakStartTime() != null) ? shift.getShortBreakStartTime() : (p != null ? p.getShortBreakStartTime() : LocalTime.of(17, 0));
        LocalTime sbE = (shift != null && shift.getShortBreakEndTime() != null) ? shift.getShortBreakEndTime() : (p != null ? p.getShortBreakEndTime() : LocalTime.of(17, 10));
        LocalTime lbS = (shift != null && shift.getLongBreakStartTime() != null) ? shift.getLongBreakStartTime() : (p != null ? p.getLongBreakStartTime() : LocalTime.of(13, 0));
        LocalTime lbE = (shift != null && shift.getLongBreakEndTime() != null) ? shift.getLongBreakEndTime() : (p != null ? p.getLongBreakEndTime() : LocalTime.of(14, 0));

        return (t.isAfter(sbS) && t.isBefore(sbE)) || (t.isAfter(lbS) && t.isBefore(lbE));
    }

    private boolean isShiftEnded(AttendanceSession s, LocalDateTime now) {
        AttendanceShift shift = s.getUser().getShift();
        LocalTime end = (shift != null) ? shift.getEndTime() : LocalTime.of(18, 30);
        return now.toLocalTime().isAfter(end.plusMinutes(1));
    }

    private void finalizeSession(AttendanceSession s) {
        LocalDateTime now = nowInIndia();
        long secs = Math.min(Duration.between(s.getLastSeenTime(), now).toSeconds(), 300);
        if (secs > 0) {
            InternalWorkState state = resolveWorkState(isInsideLastKnown(s), s, now);
            updateCounters(s, state, secs);
        }
        s.setStatus(AttendanceStatus.PUNCHED_OUT);
        s.setCheckOutTime(now);
        attendanceSessionRepository.save(s);
        reconcileDailySummary(s.getUser().getId(), s.getCheckInTime().toLocalDate(), s.getOffice());
    }

    @Transactional
    public void reconcileDailySummary(Long userId, LocalDate date, OfficeLocation office) {
        List<AttendanceSession> sessions = attendanceSessionRepository.findByUserIdAndDate(userId, date);
        if (sessions.isEmpty()) return;
        AttendanceDaily d = attendanceDailyRepository.findSingleByUserIdAndDate(userId, date)
                .orElse(AttendanceDaily.builder().user(userRepository.findById(userId).get()).date(date).build());
        
        d.setTotalWorkSeconds(sessions.stream().mapToLong(s -> s.getTotalWorkSeconds() != null ? s.getTotalWorkSeconds() : 0).sum());
        d.setTotalBreakSeconds(sessions.stream().mapToLong(s -> s.getTotalBreakSeconds() != null ? s.getTotalBreakSeconds() : 0).sum());
        long idleSecs = sessions.stream().mapToLong(s -> s.getUnauthorizedOutsideSeconds() != null ? s.getUnauthorizedOutsideSeconds() : 0).sum();
        
        d.setTotalWorkMinutes((int) (d.getTotalWorkSeconds() / 60));
        d.setTotalBreakMinutes((int) (d.getTotalBreakSeconds() / 60));
        d.setIdleMinutes((int) (idleSecs / 60));
        d.setProductiveMinutes(d.getTotalWorkMinutes());
        d.setStatus(d.getTotalWorkMinutes() >= 480 ? "PRESENT" : (d.getTotalWorkMinutes() >= 240 ? "HALF_DAY" : "ABSENT"));
        
        attendanceDailyRepository.save(d);
    }

    @Transactional
    public AttendanceDTO clockOut(Long userId) {
        AttendanceSession s = attendanceSessionRepository.findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES).orElseThrow();
        finalizeSession(s);
        return convertToDTO(s, s.getCheckInTime().toLocalDate());
    }

    @Transactional
    public AttendanceDTO startBreak(Long userId, String type) {
        AttendanceSession s = attendanceSessionRepository.findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES).orElseThrow();
        s.setStatus(AttendanceStatus.OUTSIDE_UNAUTHORIZED);
        return convertToDTO(attendanceSessionRepository.save(s), s.getCheckInTime().toLocalDate());
    }

    @Transactional
    public AttendanceDTO endBreak(Long userId) {
        AttendanceSession s = attendanceSessionRepository.findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES).orElseThrow();
        s.setStatus(AttendanceStatus.WORKING);
        return convertToDTO(attendanceSessionRepository.save(s), s.getCheckInTime().toLocalDate());
    }

    private void validateClockInAccuracy(Double accuracy) {
        if (accuracy == null || accuracy > MAX_ALLOWED_ACCURACY) throw new RuntimeException("Low GPS accuracy.");
    }

    private OfficeLocation findNearestOffice(double lat, double lng) {
        return getOffices().stream()
                .min(Comparator.comparingDouble(o -> calculateDistance(lat, lng, o.getLatitude(), o.getLongitude())))
                .orElseThrow(() -> new RuntimeException("No offices."));
    }

    private AttendanceDTO convertToDTO(AttendanceSession s, LocalDate d) {
        AttendanceDTO dto = attendanceMapper.toDTO(s);
        dto.setDate(d);
        return dto;
    }

    public GlobalTarget getGlobalTarget() { return globalTargetRepository.findFirstByOrderByIdAsc().orElseGet(GlobalTarget::defaultTarget); }
    public List<AttendanceShift> getAllShifts() { return attendanceShiftRepository.findAll(); }

    @Transactional(readOnly = true)
    public AttendanceDTO getPrePunchStatus(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        OfficeLocation office = user.getAssignedOffice();
        
        // If user has no assigned office, find nearest one as fallback if possible
        // but typically they should have an assigned office.
        
        AttendancePolicy policy = (office != null) 
                ? attendancePolicyRepository.findByOfficeId(office.getId()).orElse(null)
                : null;

        return AttendanceDTO.builder()
                .status("NOT_STARTED")
                .userId(userId)
                .userName(user.getName())
                .officeName(office != null ? office.getName() : null)
                .officeLat(office != null ? office.getLatitude() : null)
                .officeLng(office != null ? office.getLongitude() : null)
                .officeRadius(office != null ? office.getRadius() : 100.0)
                .totalWorkMinutes(0)
                .totalBreakMinutes(0)
                .totalWorkHours("0h 0m")
                .totalBreakHours("0h 0m")
                .build();
    }

    @Transactional(readOnly = true)
    public Optional<AttendanceDTO> getCurrentStatus(Long userId) {
        return attendanceSessionRepository.findFirstByUserIdAndStatusInOrderByCheckInTimeDesc(userId, ACTIVE_STATUSES)
                .map(s -> convertToDTO(s, s.getCheckInTime().toLocalDate()));
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getMyLogs(Long userId, LocalDate from, LocalDate to) {
        if (from == null) from = todayInIndia().minusDays(7);
        if (to == null) to = todayInIndia();
        
        List<AttendanceSession> sessions = attendanceSessionRepository.findByUserIdAndCheckInTimeBetween(
                userId, from.atStartOfDay(), to.atTime(LocalTime.MAX));
        
        return sessions.stream()
                .map(s -> convertToDTO(s, s.getCheckInTime().toLocalDate()))
                .sorted(Comparator.comparing(AttendanceDTO::getCheckInTime).reversed())
                .collect(java.util.stream.Collectors.toList());
    }

    public com.lms.www.leadmanagement.dto.AttendancePreviewResponse calculatePreview(com.lms.www.leadmanagement.dto.AttendancePreviewRequest req) {
        // Simple passthrough for manual entry logic
        return com.lms.www.leadmanagement.dto.AttendancePreviewResponse.builder()
                .workedMinutes(req.getWorkMinutes() != null ? req.getWorkMinutes() : 0)
                .breakMinutes(req.getBreakMinutes() != null ? req.getBreakMinutes() : 0)
                .status("MANUAL")
                .build();
    }

    @Transactional
    public void saveManualEntry(com.lms.www.leadmanagement.dto.AttendancePreviewRequest req) {
        User user = userRepository.findById(req.getUserId()).orElseThrow();
        LocalDate date = req.getDate() != null ? req.getDate() : todayInIndia();
        
        AttendanceDaily daily = attendanceDailyRepository.findSingleByUserIdAndDate(req.getUserId(), date)
                .orElse(AttendanceDaily.builder().user(user).date(date).build());
        
        daily.setTotalWorkMinutes(req.getWorkMinutes() != null ? req.getWorkMinutes() : 0);
        daily.setTotalBreakMinutes(req.getBreakMinutes() != null ? req.getBreakMinutes() : 0);
        daily.setProductiveMinutes(daily.getTotalWorkMinutes());
        daily.setStatus("PRESENT");
        attendanceDailyRepository.save(daily);
    }

    @Transactional(readOnly = true)
    public List<AttendanceDTO> getDailySummaries(LocalDate start, LocalDate end, Long filterUserId, Long requesterId) {
        if (start == null) start = todayInIndia().minusDays(7);
        if (end == null) end = todayInIndia();
        
        User requester = userRepository.findById(requesterId).orElseThrow();
        Set<Long> allowedIds = securityService.getAllowedUserIds(requester);
        
        List<AttendanceDaily> dailyLogs;
        if (filterUserId != null) {
            if (!allowedIds.contains(filterUserId)) throw new com.lms.www.leadmanagement.exception.UnauthorizedAccessException("User outside hierarchy");
            dailyLogs = attendanceDailyRepository.findValidUserAttendanceBetween(filterUserId, start, end);
        } else {
            List<User> visibleUsers = userRepository.findAllById(allowedIds);
            dailyLogs = attendanceDailyRepository.findAllByUserInAndDateBetween(visibleUsers, start, end);
        }

        return dailyLogs.stream()
                .map(attendanceMapper::toDTO)
                .sorted(Comparator.comparing(AttendanceDTO::getDate).reversed())
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public GlobalTarget updateGlobalTarget(GlobalTarget target) {
        GlobalTarget existing = globalTargetRepository.findFirstByOrderByIdAsc().orElse(new GlobalTarget());
        existing.setMonthlyLeadQuota(target.getMonthlyLeadQuota());
        existing.setMonthlyRevenueGoal(target.getMonthlyRevenueGoal());
        return globalTargetRepository.save(existing);
    }

    @Transactional
    public void updateDailyNote(Long userId, LocalDate date, String note) {
        AttendanceDaily daily = attendanceDailyRepository.findSingleByUserIdAndDate(userId, date)
                .orElseThrow(() -> new ResourceNotFoundException("No record found for this date"));
        daily.setNote(note);
        attendanceDailyRepository.save(daily);
    }
}
