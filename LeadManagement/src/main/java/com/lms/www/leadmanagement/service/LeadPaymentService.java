package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.entity.Lead;
import com.lms.www.leadmanagement.entity.Payment;
import com.lms.www.leadmanagement.entity.User;
import com.lms.www.leadmanagement.entity.LeadTask;
import com.lms.www.leadmanagement.repository.LeadRepository;
import com.lms.www.leadmanagement.repository.LeadTaskRepository;
import com.lms.www.leadmanagement.repository.PaymentRepository;
import com.lms.www.leadmanagement.repository.UserRepository;
import com.lms.www.leadmanagement.dto.PaymentDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class LeadPaymentService {

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LeadTaskRepository leadTaskRepository;

    @Autowired
    private MailService mailService;

    // @Value("${lms.base-url}")
    // private String baseUrl;

    // @Value("${cashfree.environment:SANDBOX}")
    // private String environment;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Transactional
    public Map<String, String> createPaymentLink(Long leadId, BigDecimal initialAmount, BigDecimal totalAmount,
            com.lms.www.leadmanagement.dto.PaymentSplitRequest split) {
        if (leadId == null)
            throw new IllegalArgumentException("Lead ID cannot be null");
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        // Cancel previous pending manual payments for this lead to ensure a single
        // active link
        List<Payment> pendingPayments = paymentRepository.findByLeadIdAndStatus(leadId, Payment.Status.PENDING);
        for (Payment p : pendingPayments) {
            p.setStatus(Payment.Status.CANCELLED);
            p.setUpdatedAt(LocalDateTime.now());
            paymentRepository.save(p);
        }

        String orderId = "MAN_PAY_" + System.currentTimeMillis();

        Payment payment = Payment.builder()
                .leadId(leadId)
                .amount(initialAmount)
                .totalAmount(totalAmount != null ? totalAmount : initialAmount)
                .status(Payment.Status.PENDING)
                .paymentGatewayId(orderId)
                .paymentType(split != null ? "INSTALLMENT" : "FULL")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        java.util.Objects.requireNonNull(paymentRepository.save(payment));

        if (split != null && split.getInstallments() != null && !split.getInstallments().isEmpty()) {
            for (int i = 0; i < split.getInstallments().size(); i++) {
                com.lms.www.leadmanagement.dto.PaymentSplitRequest.InstallmentPart inst = split.getInstallments()
                        .get(i);
                if (inst.getAmount() == null || inst.getAmount().compareTo(BigDecimal.ZERO) <= 0)
                    continue;

                String emiOrderId = "EMI_PEND_" + orderId + "_" + i;
                java.time.LocalDateTime due = null;
                if (inst.getDueDate() != null && inst.getDueDate().length() >= 10) {
                    try {
                        due = java.time.LocalDateTime.parse(inst.getDueDate());
                    } catch (Exception e) {
                        due = java.time.LocalDate.parse(inst.getDueDate().substring(0, 10)).atTime(23, 59, 59);
                    }
                }

                Payment futurePayment = Payment.builder()
                        .leadId(leadId)
                        .amount(inst.getAmount())
                        .totalAmount(totalAmount != null ? totalAmount : initialAmount)
                        .status(Payment.Status.PENDING)
                        .paymentGatewayId(emiOrderId)
                        .paymentType("INSTALLMENT")
                        .dueDate(due)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                java.util.Objects.requireNonNull(paymentRepository.save(futurePayment));
            }
        }

        lead.setPaymentOrderId(orderId);
        lead.setStatus(Lead.Status.INTERESTED);
        leadRepository.save(lead);

        Map<String, String> response = new HashMap<>();
        response.put("payment_url", frontendUrl + "/payment-gateway/" + orderId);
        response.put("payment_session_id", orderId);
        return response;
    }

    @Transactional
    public void markAsPaid(Long leadId) {
        if (leadId == null)
            throw new IllegalArgumentException("Lead ID cannot be null");
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new RuntimeException("Lead not found"));

        String orderId = lead.getPaymentOrderId();
        if (orderId == null) {
            // Create a manual audit order record if one doesn't exist
            orderId = "MAN_MARK_" + System.currentTimeMillis();
            lead.setPaymentOrderId(orderId);
            leadRepository.save(lead);

            Payment manualPayment = Payment.builder()
                    .leadId(leadId)
                    .amount(BigDecimal.ZERO) // Audit only
                    .status(Payment.Status.PENDING)
                    .paymentGatewayId(orderId)
                    .createdAt(LocalDateTime.now())
                    .build();
            java.util.Objects.requireNonNull(paymentRepository.save(manualPayment));
        }

        handlePaymentSuccess(orderId);
    }

    @Transactional
    public void handlePaymentSuccess(String orderId) {
        // Use pessimistic lock to prevent concurrent processing
        Payment payment = paymentRepository.findByPaymentGatewayIdWithLock(orderId)
                .orElseThrow(() -> new RuntimeException("Payment record not found for order: " + orderId));

        if (payment.getStatus() == Payment.Status.PAID) {
            log.info(">>> Order {} already processed as PAID, skipping", orderId);
            return;
        }

        payment.setStatus(Payment.Status.PAID);
        paymentRepository.save(payment);

        Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(payment.getLeadId()))
                .orElseThrow(() -> new RuntimeException("Lead not found for payment"));

        if (lead.getStatus() == Lead.Status.CONVERTED) {
            log.info(">>> Lead {} already marked as CONVERTED, skipping duplicate processing", lead.getEmail());
            return;
        }

        lead.setStatus(Lead.Status.CONVERTED);
        leadRepository.save(lead);

        log.info(">>> ADMISSION SUCCESSFUL for student {}!", lead.getEmail());

        // Send REAL Admission & Invoice Email
        sendAdmissionSuccessEmail(lead, payment);

        /*
         * // Disabled per user request: Do not create student account automatically
         * try {
         * createUserFromLead(lead);
         * } catch (org.springframework.dao.DataIntegrityViolationException e) {
         * log.
         * warn(">>> User already exists or being created by another thread for lead: {}"
         * , lead.getEmail());
         * }
         */
    }

    @Transactional
    public void handlePaymentFailure(String orderId) {
        Payment payment = paymentRepository.findByPaymentGatewayId(orderId)
                .orElseThrow(() -> new RuntimeException("Payment record not found for order: " + orderId));

        if (payment.getStatus() == Payment.Status.PAID) {
            return; // Cannot fail a successful payment
        }

        payment.setStatus(Payment.Status.FAILED);
        paymentRepository.save(payment);

        Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(payment.getLeadId()))
                .orElseThrow(() -> new RuntimeException("Lead not found for payment"));

        lead.setStatus(Lead.Status.LOST);
        leadRepository.save(lead);

        log.info(">>> PAYMENT FAILED for lead {}!", lead.getEmail());
    }

    @Transactional(readOnly = true)
    public PaymentDTO getPaymentStatus(String orderId) {
        // Try Gateway ID first, then numeric ID if numeric
        Optional<Payment> paymentOpt = paymentRepository.findByPaymentGatewayId(orderId);

        if (paymentOpt.isEmpty() && orderId.matches("\\d+")) {
            paymentOpt = paymentRepository.findById(Long.parseLong(orderId));
        }

        Payment payment = paymentOpt.orElseThrow(
                () -> new jakarta.persistence.EntityNotFoundException("Transaction record not found: " + orderId));
        return convertToDTO(payment);
    }

    /**
     * Specialized wrapper to ensure payment status is committed even if
     * downstream items (email, user creation) have issues.
     */
    @Transactional
    public void handlePaymentSuccessWithSafety(String orderId) {
        log.info(">>> STARTING SAFE PAYMENT PROCESSING for order: {}", orderId);
        try {
            // First update: Isolate the payment and lead status update
            updateInternalPaymentStatus(orderId, Payment.Status.PAID, Lead.Status.CONVERTED);

            // Post-Status Steps: Try email and account creation, but don't fail the payment
            // if they skip
            try {
                Payment payment = paymentRepository.findByPaymentGatewayId(orderId).orElseThrow();
                Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(payment.getLeadId()))
                        .orElseThrow();

                // Step 2: Email notification
                sendAdmissionSuccessEmail(lead, payment);

                // Step 3: Account creation (Disabled per user request)
                // createUserFromLead(lead);

            } catch (Exception e) {
                log.warn(">>> NOTIFICATION/ACCOUNT WARNING: Payment was successful, but background steps lagged: {}",
                        e.getMessage());
            }
        } catch (Exception e) {
            log.error(">>> CRITICAL ERROR in Safe Payment Processing: {}", e.getMessage());
            throw e; // Re-throw critical DB errors
        }
    }

    @Transactional
    public void updateInternalPaymentStatus(String orderId, Payment.Status pStatus, Lead.Status lStatus) {
        Payment payment = paymentRepository.findByPaymentGatewayIdWithLock(orderId)
                .orElseThrow(() -> new RuntimeException("Payment record not found: " + orderId));

        if (payment.getStatus() != pStatus) {
            payment.setStatus(pStatus);
            paymentRepository.save(payment);
        }

        Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(payment.getLeadId()))
                .orElseThrow(() -> new RuntimeException("Lead not found for payment"));

        if (lead.getStatus() != lStatus) {
            lead.setStatus(lStatus);
            leadRepository.save(lead);
        }
    }

    private void sendAdmissionSuccessEmail(Lead lead, Payment payment) {
        log.info(">>> SENDING PROFESSIONAL INVOICE to {}", lead.getEmail());
        String subject = "Admission Confirmed - Official Invoice #" + payment.getPaymentGatewayId();

        String body = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'>"
                        +
                        "  <div style='background-color: #2e7d32; color: white; padding: 20px; text-align: center;'>" +
                        "    <h2 style='margin: 0;'>ADMISSION CONFIRMED</h2>" +
                        "    <p style='margin: 5px 0 0;'>Official Payment Receipt</p>" +
                        "  </div>" +
                        "  <div style='padding: 30px; line-height: 1.6; color: #333;'>" +
                        "    <p>Dear <strong>%s</strong>,</p>" +
                        "    <p>We are delighted to confirm that your payment has been successfully verified. Your admission is now official.</p>"
                        +
                        "    <div style='background-color: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0;'>"
                        +
                        "      <table style='width: 100%%; border-collapse: collapse;'>" +
                        "        <tr><td style='padding: 8px 0; color: #666;'>Invoice ID:</td><td style='padding: 8px 0; text-align: right; font-weight: bold;'>%s</td></tr>"
                        +
                        "        <tr><td style='padding: 8px 0; color: #666;'>Amount Paid:</td><td style='padding: 8px 0; text-align: right; color: #2e7d32; font-weight: bold;'>₹%s</td></tr>"
                        +
                        "        <tr><td style='padding: 8px 0; color: #666;'>Method:</td><td style='padding: 8px 0; text-align: right;'>%s</td></tr>"
                        +
                        "        <tr><td style='padding: 8px 0; color: #666;'>Status:</td><td style='padding: 8px 0; text-align: right; color: #2e7d32; font-weight: bold;'>SUCCESSFUL</td></tr>"
                        +
                        "      </table>" +
                        "    </div>" +
                        "    <p>Your admission is confirmed. Our team will contact you shortly to discuss the next steps.</p>"
                        +
                        "    <p style='margin-top: 30px;'>Best Regards,<br/><strong>The Admissions Team</strong></p>" +
                        "  </div>" +
                        "  <div style='background-color: #f5f5f5; color: #888; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e0e0e0;'>"
                        +
                        "    This is a system-generated invoice for your transaction. No signature required." +
                        "  </div>" +
                        "</div>",
                lead.getName(), payment.getPaymentGatewayId(), payment.getAmount(),
                (payment.getPaymentMethod() != null ? payment.getPaymentMethod() : "MANUAL"));
        mailService.sendEmail(lead.getEmail(), subject, body);
    }

    public List<com.lms.www.leadmanagement.dto.UserDTO> getTeamLeaders() {
        return userRepository.findByRoleName("TEAM_LEADER").stream()
                .map(com.lms.www.leadmanagement.dto.UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public PaymentDTO generateInvoice(Long leadId) {
        // Find the most recent SUCCESSFUL payment for this lead
        Payment payment = paymentRepository.findAll().stream()
                .filter(p -> p.getLeadId().equals(leadId) && p.getStatus() == Payment.Status.PAID)
                .sorted(Comparator.comparing(Payment::getCreatedAt).reversed())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No successful payment found for lead: " + leadId));

        return convertToDTO(payment);
    }

    public List<PaymentDTO> getFilteredPaymentHistory(Long userId, Long tlId, Long associateId,
            java.time.LocalDateTime startDateTime, java.time.LocalDateTime endDateTime, String status) {
        User requester = getCurrentUser();

        if (userId != null) {
            User targetUser = userRepository.findById(userId).orElse(null);
            if (targetUser != null) {
                String roleName = targetUser.getRole().getName();
                if (roleName.equals("ASSOCIATE")) {
                    associateId = userId;
                } else if (!roleName.equals("ADMIN")) {
                    tlId = userId;
                }
            }
        }

        if (requester == null)
            return Collections.emptyList();

        List<Long> leadIds = null;
        String requesterRole = requester.getRole().getName();
        List<User> subordinates = new ArrayList<>();
        subordinates.add(requester);
        collectSubordinates(requester, subordinates);
        List<Long> allowedUserIds = subordinates.stream().map(User::getId).collect(Collectors.toList());

        if (associateId != null) {
            if (!"ADMIN".equals(requesterRole) && !allowedUserIds.contains(associateId))
                return Collections.emptyList();
            User associate = userRepository.findById(associateId).orElse(null);
            if (associate == null)
                return Collections.emptyList();
            leadIds = leadRepository.findByAssignedTo(associate).stream()
                    .map(Lead::getId)
                    .collect(Collectors.toList());
        } else if (tlId != null) {
            if (!"ADMIN".equals(requesterRole) && !allowedUserIds.contains(tlId))
                return Collections.emptyList();
            User targetTl = userRepository.findById(tlId).orElse(null);
            if (targetTl == null)
                return Collections.emptyList();

            List<User> targetSubs = new ArrayList<>();
            targetSubs.add(targetTl);
            collectSubordinates(targetTl, targetSubs);

            leadIds = leadRepository.findAll().stream()
                    .filter(l -> (l.getAssignedTo() != null && targetSubs.contains(l.getAssignedTo())) ||
                            (l.getCreatedBy() != null && targetSubs.contains(l.getCreatedBy())))
                    .map(Lead::getId)
                    .collect(Collectors.toList());
        } else {
            // Default: requesters own hierarchy
            if ("ADMIN".equals(requesterRole)) {
                // Admin sees all leadIds = null (global)
                leadIds = null;
            } else {
                leadIds = leadRepository.findAll().stream()
                        .filter(l -> (l.getAssignedTo() != null && subordinates.contains(l.getAssignedTo())) ||
                                (l.getCreatedBy() != null && subordinates.contains(l.getCreatedBy())))
                        .map(Lead::getId)
                        .collect(Collectors.toList());
            }
        }

        if (leadIds != null && leadIds.isEmpty())
            return Collections.emptyList();

        List<Payment> payments;
        if (leadIds != null) {
            Payment.Status pStatus = (status != null && !status.isEmpty())
                    ? Payment.Status.valueOf(status.toUpperCase())
                    : null;
            payments = paymentRepository.findFiltered(leadIds, startDateTime, endDateTime, pStatus);
        } else {
            payments = paymentRepository.findByCreatedAtBetween(
                    startDateTime != null ? startDateTime : LocalDateTime.now().minusDays(365),
                    endDateTime != null ? endDateTime : LocalDateTime.now());
        }

        return payments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private void collectSubordinates(User user, List<User> collector) {
        // Collect by manager relationship
        List<User> byManager = userRepository.findByManager(user);
        for (User sub : byManager) {
            if (!collector.contains(sub)) {
                collector.add(sub);
                collectSubordinates(sub, collector);
            }
        }

        // Collect by supervisor relationship
        List<User> bySupervisor = userRepository.findBySupervisor(user);
        for (User sub : bySupervisor) {
            if (!collector.contains(sub)) {
                collector.add(sub);
                collectSubordinates(sub, collector);
            }
        }
    }

    public List<PaymentDTO> getFilteredPaymentHistoryForTL(String email, java.time.LocalDateTime startDateTime,
            java.time.LocalDateTime endDateTime, String status) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Long> leadIds = leadRepository.findByAssignedTo(user).stream()
                .map(Lead::getId)
                .collect(Collectors.toList());

        if (leadIds.isEmpty())
            return Collections.emptyList();

        Payment.Status pStatus = (status != null && !status.isEmpty()) ? Payment.Status.valueOf(status.toUpperCase())
                : null;
        return paymentRepository.findFiltered(leadIds, startDateTime, endDateTime, pStatus).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<PaymentDTO> getPaymentHistoryForAdmin() {
        return getFilteredPaymentHistory(null, null, null, null, null, null);
    }

    public List<PaymentDTO> getPaymentHistoryForManager(String managerEmail) {
        User manager = userRepository.findByEmail(managerEmail).orElse(null);
        if (manager != null) {
            return getFilteredPaymentHistory(manager.getId(), null, null, null, null, null);
        }
        return java.util.Collections.emptyList();
    }

    public List<PaymentDTO> getPaymentHistoryForTL(String tlEmail) {
        return getFilteredPaymentHistoryForTL(tlEmail, null, null, null);
    }

    @Transactional
    public PaymentDTO updatePaymentStatus(Long paymentId, String status, String method, String note,
            java.math.BigDecimal actualPaidAmount, String nextDueDateStr) {
        if (paymentId == null)
            throw new IllegalArgumentException("Payment ID cannot be null");
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        User currentUser = getCurrentUser();

        if (status != null) {
            payment.setStatus(Payment.Status.valueOf(status.toUpperCase()));
        }
        if (method != null) {
            payment.setPaymentMethod(method);
        }

        payment.setUpdatedAt(java.time.LocalDateTime.now());
        payment.setUpdatedBy(currentUser);
        Payment saved = paymentRepository.save(payment);

        // If marked as PAID, check if we should convert the lead
        if (saved.getStatus() == Payment.Status.PAID) {

            // Check for partial payment
            if (actualPaidAmount != null && actualPaidAmount.compareTo(java.math.BigDecimal.ZERO) > 0
                    && actualPaidAmount.compareTo(payment.getAmount()) < 0) {
                // Partial payment
                java.math.BigDecimal remainingBalance = payment.getAmount().subtract(actualPaidAmount);
                saved.setAmount(actualPaidAmount);
                saved.setPaymentType("INSTALLMENT");
                paymentRepository.save(saved);

                // Create new pending payment for the remainder
                Payment nextInstallment = Payment.builder()
                        .leadId(payment.getLeadId())
                        .amount(remainingBalance)
                        .totalAmount(payment.getTotalAmount())
                        .status(Payment.Status.PENDING)
                        .paymentType("EMI_INSTALLMENT")
                        .build();

                if (nextDueDateStr != null && !nextDueDateStr.isEmpty()) {
                    try {
                        java.time.LocalDateTime dDate = java.time.LocalDateTime.parse(nextDueDateStr);
                        nextInstallment.setDueDate(dDate);

                        // Update Lead's follow-up date and status to point to this installment
                        Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(payment.getLeadId()))
                                .orElse(null);
                        if (lead != null) {
                            lead.setFollowUpDate(dDate);
                            lead.setFollowUpRequired(true);
                            lead.setFollowUpType("EMI_COLLECTION");
                            lead.setStatus(Lead.Status.EMI); // Ensure status remains EMI for partials
                            leadRepository.save(lead);

                            // Generate Task record
                            createLeadTask(lead, dDate, "EMI Collection - Partial Payment remainder", "EMI_COLLECTION");
                        }
                    } catch (Exception e) {
                        log.error("Failed to parse next due date {}", nextDueDateStr);
                    }
                }
                paymentRepository.save(nextInstallment);
            } else {
                // FULL PAYMENT - Convert Lead and complete current tasks
                Lead lead = leadRepository.findById(saved.getLeadId()).orElse(null);
                if (lead != null) {
                    lead.setStatus(Lead.Status.CONVERTED);
                    lead.setFollowUpRequired(false);
                    leadRepository.save(lead);

                    // Mark pending tasks for this lead as completed
                    try {
                        List<LeadTask> pendingTasks = leadTaskRepository.findByLeadId(lead.getId()).stream()
                                .filter(t -> t.getStatus() == LeadTask.TaskStatus.PENDING)
                                .collect(java.util.stream.Collectors.toList());
                        for (LeadTask task : pendingTasks) {
                            task.setStatus(LeadTask.TaskStatus.COMPLETED);
                        }
                        leadTaskRepository.saveAll(pendingTasks);
                        log.info(">>> Marked {} pending tasks as COMPLETED for converted lead {}", pendingTasks.size(),
                                lead.getId());
                    } catch (Exception e) {
                        log.warn(">>> Task cleanup failed for lead {}: {}", lead.getId(), e.getMessage());
                    }

                    if (saved.getPaymentGatewayId() != null) {
                        handlePaymentSuccessWithSafety(saved.getPaymentGatewayId());
                    } else {
                        // Manual SUCCESS lifecycle - usually no gateway ID
                        try {
                            sendAdmissionSuccessEmail(lead, saved);
                            // createUserFromLead(lead); // Disabled per user request
                        } catch (Exception e) {
                            log.warn(">>> Background tasks failed for manual payment: {}", e.getMessage());
                        }
                    }
                }
            }
        }

        return convertToDTO(saved);
    }

    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null)
            return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private PaymentDTO convertToDTO(Payment payment) {
        Lead lead = null;
        if (payment.getLeadId() != null) {
            lead = leadRepository.findById(payment.getLeadId()).orElse(null);
        }
        return PaymentDTO.fromEntity(payment, lead);
    }

    @Transactional
    public void splitPayment(Long existingPaymentId, com.lms.www.leadmanagement.dto.PaymentSplitRequest splitRequest) {
        Payment original = paymentRepository.findById(java.util.Objects.requireNonNull(existingPaymentId))
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (original.getStatus() == Payment.Status.PAID) {
            throw new RuntimeException("Cannot split a completed payment");
        }

        // Create new parts based on the request
        Lead lead = leadRepository.findById(java.util.Objects.requireNonNull(original.getLeadId())).orElse(null);

        for (int i = 0; i < splitRequest.getInstallments().size(); i++) {
            com.lms.www.leadmanagement.dto.PaymentSplitRequest.InstallmentPart part = splitRequest.getInstallments()
                    .get(i);
            java.time.LocalDateTime dDate = part.getDueDate() != null ? java.time.LocalDateTime.parse(part.getDueDate())
                    : null;

            if (i == 0) {
                // First part updates the original record
                original.setAmount(part.getAmount());
                if (dDate != null) {
                    original.setDueDate(dDate);
                    if (lead != null) {
                        createLeadTask(lead, dDate, "Split EMI Part 1", "EMI_COLLECTION");
                    }
                }
                paymentRepository.save(original);
            } else {
                // Subsequent parts create new records
                Payment newPart = Payment.builder()
                        .leadId(original.getLeadId())
                        .amount(part.getAmount())
                        .totalAmount(original.getTotalAmount())
                        .status(Payment.Status.PENDING)
                        .paymentType("EMI_INSTALLMENT")
                        .build();
                if (dDate != null) {
                    newPart.setDueDate(dDate);
                    if (lead != null) {
                        createLeadTask(lead, dDate, "Split EMI Part " + (i + 1), "EMI_COLLECTION");
                    }
                }
                paymentRepository.save(newPart);
            }
        }

        // Update lead follow-up status to point to the earliest due date if relevant
        if (lead != null && splitRequest.getInstallments().size() > 0) {
            String firstDueDate = splitRequest.getInstallments().get(0).getDueDate();
            if (firstDueDate != null) {
                lead.setFollowUpDate(java.time.LocalDateTime.parse(firstDueDate));
                lead.setFollowUpRequired(true);
                lead.setFollowUpType("EMI_COLLECTION");
                lead.setStatus(Lead.Status.EMI);
                leadRepository.save(lead);
            }
        }
    }

    @Transactional
    public com.lms.www.leadmanagement.dto.PaymentDTO updatePaymentStatus(Long id,
            java.util.Map<String, String> payload) {
        String newStatus = payload.get("status");
        String method = payload.get("paymentMethod");
        String note = payload.get("note");
        String actualAmountStr = payload.get("actualPaidAmount");
        String nextDueDateStr = payload.get("nextDueDate");
        String paymentType = payload.get("paymentType");

        java.math.BigDecimal actualPaidAmount = null;
        if (actualAmountStr != null && !actualAmountStr.isEmpty()) {
            try {
                actualPaidAmount = new java.math.BigDecimal(actualAmountStr);
            } catch (Exception e) {
                log.error("Invalid actualPaidAmount: {}", actualAmountStr);
            }
        }

        Payment payment = paymentRepository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() == Payment.Status.PAID && newStatus != null && !newStatus.equalsIgnoreCase("PAID")) {
            User currentUser = getCurrentUser();
            String userRole = currentUser.getRole().getName();
            if (!userRole.equals("ADMIN") && !userRole.equals("MANAGER")) {
                throw new RuntimeException("Only Admins and Managers can override a cleared payment");
            }
        }

        if (paymentType != null) {
            payment.setPaymentType(paymentType);
        }

        return updatePaymentStatus(id, newStatus, method, note, actualPaidAmount, nextDueDateStr);

    }

    private void createLeadTask(Lead lead, java.time.LocalDateTime dueDate, String title, String type) {
        if (dueDate == null)
            return;

        LeadTask task = LeadTask.builder()
                .lead(lead)
                .title(title)
                .description("Automated task for " + title)
                .dueDate(dueDate)
                .status(LeadTask.TaskStatus.PENDING)
                .taskType(type)
                .build();
        java.util.Objects.requireNonNull(leadTaskRepository.save(task));
        log.info(">>> Created LeadTask for lead {} with type {} for date {}", lead.getId(), type, dueDate);
    }
}
