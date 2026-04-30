package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.entity.User;
import com.lms.www.leadmanagement.exception.UnauthorizedAccessException;
import com.lms.www.leadmanagement.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SecurityService {

    private final UserRepository userRepository;

    public SecurityService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedAccessException("Current user session is invalid"));
    }

    public void validateHierarchyAccess(User requester, User target) {
        if (isAdmin(requester)) return;
        if (requester.getId().equals(target.getId())) return;

        List<Long> subordinates = userRepository.findSubordinateIds(requester.getId());
        if (subordinates == null || !subordinates.contains(target.getId())) {
            throw new UnauthorizedAccessException("You do not have permission to access data for user: " + target.getName());
        }
    }

    public java.util.Set<Long> getAllowedUserIds(User requester) {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        ids.add(requester.getId());

        if (isAdmin(requester)) {
            ids.addAll(userRepository.findAllIds());
        } else {
            List<Long> subIds = userRepository.findSubordinateIds(requester.getId());
            if (subIds != null) ids.addAll(subIds);
        }
        return ids;
    }

    public void validateAccess(User requester, Long targetUserId) {
        if (isAdmin(requester)) return;
        if (requester.getId().equals(targetUserId)) return;

        java.util.Set<Long> allowed = getAllowedUserIds(requester);
        if (!allowed.contains(targetUserId)) {
            throw new UnauthorizedAccessException("Access Denied: User ID " + targetUserId + " is outside your hierarchy.");
        }
    }

    public boolean isAdmin(User user) {
        return user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().getName());
    }

    public boolean isManager(User user) {
        return user.getRole() != null && ("MANAGER".equalsIgnoreCase(user.getRole().getName()) || "ROLE_MANAGER".equalsIgnoreCase(user.getRole().getName()));
    }
}
