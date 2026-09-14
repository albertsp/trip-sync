package com.albertsp.tripsync.backend.service;


import com.albertsp.tripsync.backend.domain.User;
import com.albertsp.tripsync.backend.exceptions.ResourceNotFoundException;
import com.albertsp.tripsync.backend.repositories.UserRepository;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository){
        this.userRepository = userRepository;
    }

    public User findOrCreateUser(OAuth2User principal){
        String googleId = principal.getAttribute("sub");
        String name = principal.getAttribute("name");
        String email = principal.getAttribute("email");

        Optional<User> existingUser = userRepository.findByGoogleId(googleId);

        if (existingUser.isEmpty()) {
            User newUser = new User();
            newUser.setGoogleId(googleId);
            newUser.setName(name);
            newUser.setEmail(email);

            return userRepository.save(newUser);
        }

        return existingUser.get();
    }
}
