package com.lms.www.leadmanagement.service;

import com.lms.www.leadmanagement.entity.User;
import com.lms.www.leadmanagement.exception.UnauthorizedAccessException;
import com.lms.www.leadmanagement.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Set;
import java.util.HashSet;

@Service
@Slf4j
public class SecurityService {

    private final UserRepository userRepository;

    public SecurityService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    public Set<Long> getScopedUserIds(User requester, Long teamLeaderId) {
        return getScopedUserIdsInternal(requester, teamLeaderId);
    }

    public Set<Long> getAllowedUserIds(User requester) {
        return getScopedUserIdsInternal(requester, null);
    }

    private Set<Long> getScopedUserIdsInternal(User requester, Long teamLeaderId) {
        Set<Long> ids = new HashSet<>();
        if (requester == null) return ids;
        
        Long requesterId = requester.getId();
        ids.add(requesterId);

        // ADMIN → all users
        if (isAdmin(requester)) {
            return new HashSet<>(userRepository.findAllIds());
        }

        // MANAGER
        if (isManager(requester)) {
            List<Long> tls = userRepository.findTeamLeadsByManager(requesterId);
            if (teamLeaderId != null && teamLeaderId > 0) {
                if (!tls.contains(teamLeaderId)) {
                    throw new UnauthorizedAccessException("TL not under this manager");
                }
                ids.clear();
                ids.add(teamLeaderId);
                ids.addAll(userRepository.findAssociatesByTl(teamLeaderId));
                return ids;
            }
            ids.addAll(tls);
            if (!tls.isEmpty()) {
                ids.addAll(userRepository.findAssociatesByTlIds(tls));
            }
            return ids;
        }

        // TEAM LEADER
        if (isTeamLeader(requester)) {
            ids.addAll(userRepository.findAssociatesByTl(requesterId));
            return ids;
        }

        // ASSOCIATE
        return ids;
    }

    public void validateAccess(User requester, Long targetUserId) {
        if (requester == null || targetUserId == null || targetUserId <= 0) {
            return; // Ignore invalid or "all" (0) IDs
        }
        if (requester.getId().equals(targetUserId)) return;
        if (isAdmin(requester)) return;

        Set<Long> allowed = getScopedUserIds(requester, null);
        if (!allowed.contains(targetUserId)) {
            log.warn("Access Denied: User {} attempted to access target {}", requester.getId(), targetUserId);
            throw new UnauthorizedAccessException("User outside hierarchy");
        }
    }

    public void validateHierarchyAccess(User requester, User target) {
        if (target == null) return;
        validateAccess(requester, target.getId());
    }

    private String getRole(User user) {
        if (user == null) return "";
        if (user.getRole() == null) {
            user = userRepository.findById(user.getId()).orElse(user);
        }
        if (user.getRole() == null) return "";
        return user.getRole().getName().trim().toUpperCase().replace("ROLE_", "");
    }

    public boolean isAdmin(User user) {
        String role = getRole(user);
        return role.equals("ADMIN") || role.equals("SUPER_ADMIN") || "admin@lms.com".equalsIgnoreCase(user.getEmail());
    }

    public boolean isManager(User user) {
        String role = getRole(user);
        return role.equals("MANAGER") || role.equals("MGR");
    }

    public boolean isTeamLeader(User user) {
        String role = getRole(user);
        return role.equals("TEAM_LEADER") || role.equals("TL") || role.equals("TEAMLEAD");
    }
}
