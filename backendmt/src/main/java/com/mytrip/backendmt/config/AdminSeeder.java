package com.mytrip.backendmt.config;

import com.mytrip.backendmt.entity.Role;
import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "sharmarohit45@gmail.com"; // Your exact email

        Optional<User> existingUser = userRepository.findByEmail(adminEmail);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            user.setRole(Role.ROLE_ADMIN); // Upgrades existing account to admin
            userRepository.save(user);
            System.out.println(">>> [SEEDED] Upgraded existing user to ROLE_ADMIN: " + adminEmail);
        } else {
            User admin = new User();
            admin.setFirstName("Rohit");
            admin.setLastName("Sharma");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode("Rohits#45"));
            admin.setRole(Role.ROLE_ADMIN);
            userRepository.save(admin);
            System.out.println(">>> [SEEDED] New Admin User Created: " + adminEmail);
        }
    }
}