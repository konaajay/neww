package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.dto.*;
import com.lms.www.leadmanagement.entity.*;
import com.lms.www.leadmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardStatsService {

    @Autowired
    private AttendanceSessionRepository attendanceRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private LeadTaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RevenueTargetRepository targetRepository;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private ReportService reportService;

    public DashboardSummaryDTO getUnifiedSummary(User user, LocalDate from, LocalDate to, Long targetUserId, Long teamId) {
        if (user == null) return null;
        String viewerRole = (user.getRole() != null) ? user.getRole().getName() : "ASSOCIATE";

        LocalDateTime start = (from != null ? from : LocalDate.now().minusDays(30)).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);

        // Security / Scoping Logic
        Collection<User> allowedUsers = determineAllowedUsers(user, targetUserId, teamId);
        
        // 1. Basic Stats
        boolean isGlobalAdmin = viewerRole.equals("ADMIN") && targetUserId == null && teamId == null;
        DashboardStatsDTO stats = getStats(user, from, to, allowedUsers.size() > 1 || isGlobalAdmin);

        // 2. Trend Data (Revenue, Leads, Lost)
        ReportFilterDTO filter = ReportFilterDTO.builder()
                .fromDate(from != null ? from : LocalDate.now().minusDays(30))
                .toDate(to != null ? to : LocalDate.now())
                .build();
        if (targetUserId != null) filter.setUserId(targetUserId);
        else if (teamId != null) filter.setTeamLeaderId(teamId);
        
        List<TimeSeriesStatsDTO> trend = reportService.getFilteredTrend(filter);

        // 3. Status Distribution (Pre-aggregated)
        Map<String, Long> statusDistribution;
        if (viewerRole.equals("ADMIN") && targetUserId == null && teamId == null) {
            statusDistribution = leadRepository.getGlobalSummaryStats(start, end);
        } else {
            statusDistribution = allowedUsers.isEmpty() ? new HashMap<>() : leadRepository.getSummaryStats(allowedUsers, start, end);
        }

        // 4. Member Performance
        List<MemberPerformanceDTO> performance = new java.util.ArrayList<>();
        if (!allowedUsers.isEmpty()) {
            List<Map<String, Object>> perfStats = leadRepository.getMemberPerformanceStats(allowedUsers, start, end);
            for (Map<String, Object> row : perfStats) {
                performance.add(MemberPerformanceDTO.builder()
                    .userId((Long) row.get("userId"))
                    .username((String) row.get("username"))
                    .role((String) row.get("role"))
                    .totalLeads(asLong(row.get("totalLeads")))
                    .convertedLeads(asLong(row.get("convertedLeads")))
                    .lostLeads(asLong(row.get("lostLeads")))
                    .build());
            }
        }

        return DashboardSummaryDTO.builder()
                .stats(stats)
                .trend(trend)
                .statusDistribution(statusDistribution)
                .performance(performance)
                .build();
    }

    private long asLong(Object val) {
        if (val instanceof Number) {
            return ((Number) val).longValue();
        }
        return 0L;
    }

    private Collection<User> determineAllowedUsers(User requester, Long targetUserId, Long teamId) {
        Set<User> users = new HashSet<>();
        String role = (requester.getRole() != null) ? requester.getRole().getName() : "ASSOCIATE";

        if (role.equals("ADMIN")) {
            if (targetUserId != null) {
                userRepository.findById(targetUserId).ifPresent(users::add);
            } else if (teamId != null) {
                userRepository.findById(teamId).ifPresent(tl -> {
                    users.add(tl);
                    collectSubordinates(tl, users);
                });
            } else {
                // For global view, we return an empty set and handle the 'All' case in the repository specifically
                return Collections.emptyList();
            }
        } else if (role.equals("MANAGER") || role.equals("TEAM_LEADER")) {
            if (targetUserId != null) {
                userRepository.findById(targetUserId).ifPresent(target -> {
                    Set<User> subordinates = new HashSet<>();
                    collectSubordinates(requester, subordinates);
                    if (subordinates.contains(target) || requester.getId().equals(target.getId())) {
                        users.add(target);
                    }
                });
            } else if (teamId != null) {
                userRepository.findById(teamId).ifPresent(tl -> {
                    Set<User> subordinates = new HashSet<>();
                    collectSubordinates(requester, subordinates);
                    if (subordinates.contains(tl) || requester.getId().equals(tl.getId())) {
                        users.add(tl);
                        collectSubordinates(tl, users);
                    }
                });
            } else {
                users.add(requester);
                collectSubordinates(requester, users);
            }
        } else {
            users.add(requester);
        }

        return users;
    }

    private void collectSubordinates(User user, Set<User> collector) {
        if (user.getSubordinates() != null) {
            for (User sub : user.getSubordinates()) {
                if (!collector.contains(sub)) {
                    collector.add(sub);
                    collectSubordinates(sub, collector);
                }
            }
        }
        if (user.getManagedAssociates() != null) {
            for (User assoc : user.getManagedAssociates()) {
                if (!collector.contains(assoc)) {
                    collector.add(assoc);
                    collectSubordinates(assoc, collector);
                }
            }
        }
    }

    public DashboardStatsDTO getStats(User user, LocalDate from, LocalDate to, boolean includeSubordinates) {
        if (user == null)
            return null;

        LocalDateTime start = (from != null ? from : LocalDate.now()).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);

        boolean isGlobalAdmin = user.getRole() != null && user.getRole().getName().equals("ADMIN") && includeSubordinates;

        List<Long> targetUserIds = Collections.emptyList();
        if (!isGlobalAdmin) {
            List<User> targetUsers = includeSubordinates ? getTargetUsers(user) : Collections.singletonList(user);
            targetUserIds = targetUsers.stream().map(User::getId).collect(Collectors.toList());
            if (targetUserIds.isEmpty()) {
                return DashboardStatsDTO.builder()
                        .dailyRevenue(BigDecimal.ZERO).monthlyRevenue(BigDecimal.ZERO).expectedRevenue(BigDecimal.ZERO)
                        .monthlyTarget(BigDecimal.ZERO).targetAchievement(0.0)
                        .build();
            }
        }

        // 1. Attendance
        long present;
        long late;
        long totalActiveUsers;

        if (isGlobalAdmin) {
            present = attendanceRepository.countPresentUsers(start, end);
            late = attendanceRepository.countLateUsers(start, end);
            totalActiveUsers = userRepository.count();
        } else {
            List<AttendanceSession> sessions = attendanceRepository.findFilteredByUserIds(targetUserIds, start, end);
            present = sessions != null
                    ? sessions.stream().filter(s -> s.getUser() != null).map(s -> s.getUser().getId()).distinct().count()
                    : 0;
            late = sessions != null
                    ? sessions.stream().filter(s -> s.isLate() && s.getUser() != null).map(s -> s.getUser().getId())
                            .distinct().count()
                    : 0;
            totalActiveUsers = targetUserIds.size();
        }

        // 2. Targets & Revenue
        LocalDateTime nowIndia = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        BigDecimal monthlyTarget = BigDecimal.ZERO;

        monthlyTarget = targetRepository
                .findByUserIdAndMonthAndYear(user.getId(), nowIndia.getMonthValue(), nowIndia.getYear())
                .map(RevenueTarget::getTargetAmount)
                .orElse(user.getMonthlyTarget());

        if (monthlyTarget == null || monthlyTarget.compareTo(BigDecimal.ZERO) == 0) {
            try {
                GlobalTarget gt = attendanceService.getGlobalTarget();
                if (gt != null)
                    monthlyTarget = gt.getMonthlyRevenueGoal();
            } catch (Exception e) {
                // ignore
            }
        }

        if (monthlyTarget == null)
            monthlyTarget = BigDecimal.ZERO;

        BigDecimal daily = BigDecimal.ZERO;
        BigDecimal monthly = BigDecimal.ZERO;

        if (isGlobalAdmin) {
            monthly = paymentRepository.getGlobalTotalRevenue(start, end);
            daily = paymentRepository.getGlobalTotalRevenue(LocalDate.now().atStartOfDay(), LocalDateTime.now());
        } else {
            List<Payment> payments = paymentRepository.findFilteredByUserIds(targetUserIds, start, end);
            if (payments != null) {
                monthly = payments.stream()
                        .filter(p -> p.getStatus() == Payment.Status.PAID || p.getStatus() == Payment.Status.SUCCESS
                                || p.getStatus() == Payment.Status.APPROVED)
                        .map(Payment::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                daily = payments.stream()
                        .filter(p -> p.getStatus() == Payment.Status.PAID || p.getStatus() == Payment.Status.SUCCESS
                                || p.getStatus() == Payment.Status.APPROVED)
                        .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(LocalDate.now().atStartOfDay()))
                        .map(Payment::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }
        }

        BigDecimal expected = monthlyTarget.subtract(monthly).max(BigDecimal.ZERO);

        // 3. Follow-ups
        List<LeadTask> tasks = taskRepository.findFilteredByUserIds(targetUserIds, start, end);
        long todayFollowups = tasks != null ? tasks.stream()
                .filter(t -> t.getDueDate() != null && t.getDueDate().isAfter(LocalDate.now().atStartOfDay())
                        && t.getDueDate().isBefore(LocalDate.now().atTime(LocalTime.MAX)))
                .count() : 0;

        long pendingAppointments = 0;
        if (tasks != null) {
            pendingAppointments = tasks.stream()
                    .filter(t -> t.getStatus() == LeadTask.TaskStatus.PENDING && t.getDueDate() != null
                            && t.getDueDate().isBefore(LocalDateTime.now()))
                    .count();
        }

        BigDecimal pendingPaymentsAmount = BigDecimal.ZERO;
        BigDecimal forecastRevenue = BigDecimal.ZERO;
        long pendingPayments = 0;
        
        if (targetUserIds != null && !targetUserIds.isEmpty()) {
            pendingPaymentsAmount = paymentRepository.getPendingRevenueAmount(targetUserIds, LocalDateTime.now());
            forecastRevenue = paymentRepository.getForecastRevenue(targetUserIds, LocalDateTime.now(), LocalDateTime.now().plusDays(30));
            pendingPayments = paymentRepository.countPendingPayments(targetUserIds, LocalDateTime.now());
        }

        // 4. Interested Logic
        long interestedCount;
        long interestedToday;
        long totalLostCount;

        if (isGlobalAdmin) {
            interestedCount = leadRepository.countByStatusIn(List.of(Lead.Status.INTERESTED, Lead.Status.UNDER_REVIEW));
            interestedToday = leadRepository.countByCreatedAtBetweenAndStatusIn(
                LocalDate.now().atStartOfDay(), LocalDateTime.now(), 
                List.of(Lead.Status.INTERESTED, Lead.Status.UNDER_REVIEW));
            totalLostCount = leadRepository.countByStatusIn(
                List.of(Lead.Status.LOST, Lead.Status.NOT_INTERESTED, Lead.Status.CLOSED, Lead.Status.PAYMENT_FAILED));
        } else {
            List<User> targetUsers = includeSubordinates ? getTargetUsers(user) : Collections.singletonList(user);
            interestedCount = leadRepository.countByAssignedToInAndStatusIn(targetUsers,
                    List.of(Lead.Status.INTERESTED, Lead.Status.UNDER_REVIEW));
            interestedToday = leadRepository
                    .findByCreatedAtBetweenAndAssignedToIn(LocalDate.now().atStartOfDay(), LocalDateTime.now(), targetUsers)
                    .stream()
                    .filter(l -> l.getStatus() == Lead.Status.INTERESTED || l.getStatus() == Lead.Status.UNDER_REVIEW)
                    .count();
            totalLostCount = leadRepository.countByAssignedToInAndStatusIn(targetUsers,
                    List.of(Lead.Status.LOST, Lead.Status.NOT_INTERESTED, Lead.Status.CLOSED, Lead.Status.PAYMENT_FAILED));
        }

        Double achievement = 0.0;
        if (monthlyTarget.compareTo(BigDecimal.ZERO) > 0) {
            achievement = monthly.divide(monthlyTarget, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal(100))
                    .doubleValue();
        }

        return DashboardStatsDTO.builder()
                .presentCount(present)
                .absentCount(totalActiveUsers - present)
                .lateCount(late)
                .dailyRevenue(daily)
                .monthlyRevenue(monthly)
                .expectedRevenue(expected)
                .pendingPaymentsAmount(pendingPaymentsAmount)
                .forecastRevenue(forecastRevenue)
                .todayFollowups(todayFollowups)
                .pendingFollowups(pendingAppointments + pendingPayments)
                .pendingAppointments(pendingAppointments)
                .pendingPayments(pendingPayments)
                .monthlyTarget(monthlyTarget)
                .targetAchievement(achievement)
                .totalLostCount(totalLostCount)
                .interestedCount(interestedCount)
                .interestedToday(interestedToday)
                .totalUsers(totalActiveUsers)
                .build();
    }

    private List<User> getTargetUsers(User user) {
        if (user.getRole() != null && user.getRole().getName().equals("ADMIN")) {
            return userRepository.findAll();
        }

        List<Long> ids = userRepository.findSubordinateIds(user.getId());
        List<User> result = new java.util.ArrayList<>();
        if (ids != null && !ids.isEmpty()) {
            result.addAll(userRepository.findAllById(ids));
        }
        result.add(user);
        return result;
    }
}
