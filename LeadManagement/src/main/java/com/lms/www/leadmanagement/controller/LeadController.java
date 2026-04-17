package com.lms.www.leadmanagement.controller;

import com.lms.www.leadmanagement.dto.LeadDTO;
import com.lms.www.leadmanagement.service.LeadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import org.springframework.web.multipart.MultipartFile;
import com.lms.www.leadmanagement.dto.BulkUploadResponseDTO;
import com.lms.www.leadmanagement.service.LeadBulkUploadService;


@RestController
@RequestMapping("/api/leads")
@CrossOrigin(origins = "*")
public class LeadController {

    @Autowired
    private LeadService leadService;

    @Autowired
    private LeadBulkUploadService bulkUploadService;

    @Autowired
    private com.lms.www.leadmanagement.service.LeadPaymentService leadPaymentService;


    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('VIEW_LEADS')")
    public ResponseEntity<Map<String, Object>> getLeadStats() {
        return ResponseEntity.ok(leadService.getLeadStats());
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('VIEW_LEADS')")
    public ResponseEntity<List<LeadDTO>> getMyLeads() {
        return ResponseEntity.ok(leadService.getMyLeads());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('VIEW_LEADS')")
    public ResponseEntity<LeadDTO> getLeadById(@PathVariable Long id) {
        return ResponseEntity.ok(leadService.getLeadById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CREATE_LEADS')")
    public ResponseEntity<LeadDTO> createLead(@RequestBody LeadDTO leadDTO) {
        return ResponseEntity.ok(leadService.createLead(leadDTO));
    }

    @PostMapping("/bulk-upload")
    @PreAuthorize("hasAuthority('BULK_UPLOAD')")
    public ResponseEntity<BulkUploadResponseDTO> bulkUploadLeads(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bulkUploadService.uploadLeads(file, null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('VIEW_LEADS')")
    public ResponseEntity<LeadDTO> updateLead(@PathVariable Long id, @RequestBody LeadDTO leadDTO) {
        return ResponseEntity.ok(leadService.updateLead(id, leadDTO));
    }

    @PutMapping("/{id}/status")

    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS')")
    public ResponseEntity<LeadDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String note) {
        return ResponseEntity.ok(leadService.updateStatus(id, status, note));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS')")
    public ResponseEntity<LeadDTO> rejectLead(
            @PathVariable Long id,
            @RequestBody Map<String, Object> rejectionData) {
        return ResponseEntity.ok(leadService.rejectLead(id, rejectionData));
    }

    @PostMapping("/{id}/record-outcome")
    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS')")
    public ResponseEntity<LeadDTO> recordCallOutcome(
            @PathVariable Long id,
            @RequestBody Map<String, Object> outcomeData) {
        String status = (String) outcomeData.get("status");
        String note = (String) outcomeData.get("note");
        String followUpDate = (String) outcomeData.get("followUpDate");
        return ResponseEntity.ok(leadService.recordCallOutcome(id, status, note, followUpDate));
    }

    @PreAuthorize("hasAuthority('UPDATE_LEAD_STATUS') or hasAuthority('ADMIN') or hasAuthority('MANAGER')")
    @PostMapping("/{id}/send-payment-link")
    public ResponseEntity<Map<String, Object>> sendPaymentLink(
            @PathVariable Long id,
            @RequestBody com.lms.www.leadmanagement.dto.LeadPaymentRequestDTO request) {
        
        java.math.BigDecimal initialAmount = request.getInitialAmount();
        if (initialAmount == null) {
            initialAmount = new java.math.BigDecimal("499");
        }
        
        String note = request.getNote();
        
        // Ensure status is INTERESTED before generating link
        leadService.updateStatus(id, "INTERESTED", note);
        
        com.lms.www.leadmanagement.dto.PaymentSplitRequest split = null;
        if ("PART".equals(request.getPaymentType())) {
            split = request.toSplitRequest();
        }

        Map<String, String> cfResponse = leadPaymentService.createPaymentLink(id, initialAmount, request.getTotalAmount(), split);
        LeadDTO updatedLead = leadService.getLeadById(id);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("payment_url", cfResponse.get("payment_url"));
        response.put("payment_session_id", cfResponse.get("payment_session_id"));
        response.put("lead", updatedLead);
        
        return ResponseEntity.ok(response);
    }

}
