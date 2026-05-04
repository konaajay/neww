package com.lms.www.leadmanagement.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_sessions", indexes = {
    @Index(name = "idx_user_status", columnList = "user_id, status"),
    @Index(name = "idx_user_checkin", columnList = "user_id, check_in_time"),
    @Index(name = "idx_status_location", columnList = "status, last_location_time")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "subordinates", "managedAssociates", "directPermissions", "manager", "supervisor"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "office_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private OfficeLocation office;

    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    
    @Enumerated(EnumType.STRING)
    private AttendanceStatus status;
    
    @Column(name = "auto_checkout", nullable = false)
    private boolean isAutoCheckout = false;

    // Track last known geodata
    private Double lastLat;
    private Double lastLng;
    private Double lastAccuracy;
    private LocalDateTime lastLocationTime;
    private LocalDateTime lastSeenTime;

    // Fraud prevention and session safety
    private String deviceId;
    private String userAgent;
    private String ipHash;
    private String lastRequestId;
    
    private LocalDateTime outsideStartTime;
    private LocalDateTime breakStartTime;
    
    @Builder.Default
    private Integer totalWorkMinutes = 0;

    @Builder.Default
    private Integer totalBreakMinutes = 0;

    @Builder.Default
    private Long totalWorkSeconds = 0L;

    @Builder.Default
    private Long totalBreakSeconds = 0L;

    @Builder.Default
    private Long shortBreakSeconds = 0L;
    @Builder.Default
    private Long longBreakSeconds = 0L;

    @Builder.Default
    private Long unauthorizedOutsideSeconds = 0L;

    @Builder.Default
    private Integer outsideCount = 0;
    
    @Builder.Default
    private Integer unauthorizedOutsideMinutes = 0;
    
    @Builder.Default
    private Integer breakViolations = 0;

    @Column(name = "late", nullable = false)
    private boolean isLate = false;
    
    @Builder.Default
    private Integer lateMinutes = 0;

    @Column(name = "low_accuracy", nullable = false)
    private boolean isLowAccuracy = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
