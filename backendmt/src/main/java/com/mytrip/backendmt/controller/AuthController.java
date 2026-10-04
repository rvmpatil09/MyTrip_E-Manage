package com.mytrip.backendmt.controller;

import com.mytrip.backendmt.config.JwtUtils;
import com.mytrip.backendmt.entity.Role;
import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }
        if (userRepository.existsByEmail(email.trim().toLowerCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Email is already registered"));
        }

        User user = new User();
        user.setFirstName(request.get("firstName"));
        user.setLastName(request.get("lastName"));
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.get("password")));
        user.setRole(Role.ROLE_USER);

        userRepository.save(user);

        String token = jwtUtils.generateToken(user.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
                "id", user.getId(),
                "firstName", user.getFirstName(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        ));
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        // Fayyadamaa email kanaan barbaadi
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Fayyadamaan hin argamne: " + email));

        // Password mirkaneessi (yoo passwordEncoder fayyadamaa jirta ta'e)
        // if (!passwordEncoder.matches(password, user.getPassword())) { ... }

        String token = jwtUtils.generateToken(user.getEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("email", user.getEmail());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("role", user.getRole().name());

        return ResponseEntity.ok(response);
    }

}