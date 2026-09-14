package com.albertsp.tripsync.backend.controllers;



import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService){
    this.userService = userService;
    }

    @GetMapping("/api/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal OAuth2User principal){
        if (principal == null){
            return ResponseEntity.status(401).build();
        }

        User user = userService.findOrCreateUser(principal);
        return ResponseEntity.ok(Map.of(
                "name", user.getName(),
                "email", user.getEmail()
        ));
    }

}
