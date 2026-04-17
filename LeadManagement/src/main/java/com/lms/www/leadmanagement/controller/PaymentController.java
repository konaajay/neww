package com.lms.www.leadmanagement.controller;

import com.lms.www.leadmanagement.dto.PaymentDTO;
import com.lms.www.leadmanagement.dto.PaymentSplitRequest;
import com.lms.www.leadmanagement.service.LeadPaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class PaymentController {

    @Autowired
    private LeadPaymentService leadPaymentService;

    @GetMapping("/api/payments/status")
    public ResponseEntity<PaymentDTO> getPaymentStatus(@RequestParam String order_id) {
        return ResponseEntity.ok(leadPaymentService.getPaymentStatus(order_id));
    }

    @GetMapping("/api/public/payments/invoice")
    public ResponseEntity<PaymentDTO> getPublicInvoice(@RequestParam String order_id) {
        // First verify payment status/gateway sync
        PaymentDTO status = leadPaymentService.getPaymentStatus(order_id);
        if (!"PAID".equals(status.getStatus()) && !"SUCCESS".equals(status.getStatus()) && !"APPROVED".equals(status.getStatus())) {
            throw new RuntimeException("Invoice not available for unpaid orders");
        }
        return ResponseEntity.ok(status);
    }

    @GetMapping("/api/payments/lead/{leadId}/invoice")
    public ResponseEntity<PaymentDTO> getInvoiceByLeadId(@PathVariable Long leadId) {
        return ResponseEntity.ok(leadPaymentService.generateInvoice(leadId));
    }

    @PutMapping("/api/payments/{id}/status")
    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS') or hasAuthority('ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<Void> updatePaymentStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) String actualPaidAmount,
            @RequestParam(required = false) String nextDueDate) {
        
        Map<String, String> payload = new HashMap<>();
        payload.put("status", status);
        payload.put("paymentMethod", paymentMethod);
        payload.put("note", note);
        payload.put("actualPaidAmount", actualPaidAmount);
        payload.put("nextDueDate", nextDueDate);
        
        leadPaymentService.updatePaymentStatus(id, payload);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/payments/{id}/split")
    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS') or hasAuthority('ADMIN') or hasAuthority('MANAGER')")
    public ResponseEntity<Void> splitPayment(
            @PathVariable Long id,
            @RequestBody PaymentSplitRequest splitRequest) {
        leadPaymentService.splitPayment(id, splitRequest);
        return ResponseEntity.ok().build();
    }
}
