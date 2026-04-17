package com.lms.www.leadmanagement.controller;

import com.lms.www.leadmanagement.dto.DashboardStatsDTO;
import com.lms.www.leadmanagement.entity.User;
import com.lms.www.leadmanagement.service.DashboardStatsService;
import com.lms.www.leadmanagement.service.ManagerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/stats")
public class DashboardStatsController {

    @Autowired
    private DashboardStatsService statsService;

    @Autowired
    private ManagerService managerService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardStatsDTO> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long userId) {
        
        User user = userId != null ? managerService.getUserById(userId) : managerService.getCurrentUser();
        return ResponseEntity.ok(statsService.getStats(user, from, to));
    }
}
