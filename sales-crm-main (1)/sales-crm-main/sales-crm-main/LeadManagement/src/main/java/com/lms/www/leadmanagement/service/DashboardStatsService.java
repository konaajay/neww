package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.dto.DashboardStatsDTO;
import com.lms.www.leadmanagement.entity.*;
import com.lms.www.leadmanagement.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@org.springframework.transaction.annotation.Transactional(readOnly = true)
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

    public DashboardStatsDTO getStats(User user, LocalDate from, LocalDate to, boolean includeSubordinates) {
        if (user == null)
            return null;

        LocalDateTime start = (from != null ? from : LocalDate.now()).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);

        List<User> targetUsers = includeSubordinates ? getTargetUsers(user) : Collections.singletonList(user);
        List<Long> targetUserIds = targetUsers.stream().map(User::getId).collect(Collectors.toList());

        if (targetUserIds.isEmpty()) {
            return DashboardStatsDTO.builder()
                    .dailyRevenue(BigDecimal.ZERO).monthlyRevenue(BigDecimal.ZERO).expectedRevenue(BigDecimal.ZERO)
                    .monthlyTarget(BigDecimal.ZERO).targetAchievement(0.0)
                    .build();
        }

        // 1. Attendance
        List<AttendanceSession> sessions = attendanceRepository.findFilteredByUserIds(targetUserIds, start, end);
        long present = sessions != null
                ? sessions.stream().filter(s -> s.getUser() != null).map(s -> s.getUser().getId()).distinct().count()
                : 0;
        long late = sessions != null
                ? sessions.stream().filter(s -> s.isLate() && s.getUser() != null).map(s -> s.getUser().getId())
                        .distinct().count()
                : 0;

        long totalActiveUsers = targetUserIds.size();
        long absent = Math.max(0, totalActiveUsers - present);

        // 2. Targets & Revenue
        LocalDateTime nowIndia = LocalDateTime.now(ZoneId.of("Asia/Kolkata"));
        BigDecimal monthlyTarget = BigDecimal.ZERO;

        // If viewing global/team stats as Admin/Manager, default to the GlobalTarget
        // goal if no specific node target is set
        monthlyTarget = targetRepository
                .findByUserIdAndMonthAndYear(user.getId(), nowIndia.getMonthValue(), nowIndia.getYear())
                .map(RevenueTarget::getTargetAmount)
                .orElse(user.getMonthlyTarget());

        if (monthlyTarget == null || monthlyTarget.compareTo(BigDecimal.ZERO) == 0) {
            // Fallback to GlobalTarget settings for high-level dashboards
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

        List<Payment> payments = paymentRepository.findFilteredByUserIds(targetUserIds, start, end);
        BigDecimal daily = BigDecimal.ZERO;
        BigDecimal monthly = BigDecimal.ZERO;

        if (payments != null) {
            monthly = payments.stream()
                    .filter(p -> p.getStatus() == Payment.Status.PAID || p.getStatus() == Payment.Status.SUCCESS
                            || p.getStatus() == Payment.Status.APPROVED)
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Daily is a subset of monthly (specifically for 'today' if range includes
            // today)
            daily = payments.stream()
                    .filter(p -> p.getStatus() == Payment.Status.PAID || p.getStatus() == Payment.Status.SUCCESS
                            || p.getStatus() == Payment.Status.APPROVED)
                    .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(LocalDate.now().atStartOfDay()))
                    .map(Payment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // Expected Revenue is defined as Target gap (Target - Achieved) per user
        // request
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

        // Add overdue payments to pending count (Status-independent scan)
        long pendingPayments = 0;
        List<Payment> allPendingPayments = paymentRepository.findFilteredByUserIds(targetUserIds, null, null);
        if (allPendingPayments != null) {
            pendingPayments = allPendingPayments.stream()
                    .filter(p -> (p.getStatus() == Payment.Status.PENDING || p.getStatus() == Payment.Status.OVERDUE)
                            && p.getDueDate() != null && p.getDueDate().isBefore(LocalDateTime.now()))
                    .count();
        }

        // 4. Interested Logic
        long interestedCount = leadRepository.countByAssignedToInAndStatusIn(targetUsers,
                List.of(Lead.Status.INTERESTED, Lead.Status.UNDER_REVIEW));

        // This is a rough estimation for "Today" interest, usually defined by recent
        // lead modification or creation
        long interestedToday = leadRepository
                .findByCreatedAtBetweenAndAssignedToIn(LocalDate.now().atStartOfDay(), LocalDateTime.now(), targetUsers)
                .stream()
                .filter(l -> l.getStatus() == Lead.Status.INTERESTED || l.getStatus() == Lead.Status.UNDER_REVIEW)
                .count();

        // 5. Lost Logic
        long totalLostCount = leadRepository.countByAssignedToInAndStatusIn(targetUsers,
                List.of(Lead.Status.LOST, Lead.Status.NOT_INTERESTED, Lead.Status.CLOSED, Lead.Status.PAYMENT_FAILED));

        Double achievement = 0.0;
        if (monthlyTarget.compareTo(BigDecimal.ZERO) > 0) {
            achievement = monthly.divide(monthlyTarget, 4, java.math.RoundingMode.HALF_UP).multiply(new BigDecimal(100))
                    .doubleValue();
        }

        return DashboardStatsDTO.builder()
                .presentCount(present)
                .absentCount(absent)
                .lateCount(late)
                .dailyRevenue(daily)
                .monthlyRevenue(monthly)
                .expectedRevenue(expected)
                .todayFollowups(todayFollowups)
                .pendingFollowups(pendingAppointments + pendingPayments) // Combined for legacy support
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
        result.add(user); // Include self
        return result;
    }
}
