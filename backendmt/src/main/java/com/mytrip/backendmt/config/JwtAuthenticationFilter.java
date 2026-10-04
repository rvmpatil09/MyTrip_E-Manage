package com.mytrip.backendmt.config;

import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            if (jwtUtils.validateToken(token)) {
                String email = jwtUtils.extractEmail(token);
                System.out.println(">>> [JWT FILTER] Extracted email from token: " + email);

                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    userRepository.findByEmail(email).ifPresentOrElse(user -> {
                        System.out.println(">>> [JWT FILTER] Found user in DB: " + user.getEmail() + " with role: " + user.getRole());

                        List<SimpleGrantedAuthority> authorities = List.of(
                                new SimpleGrantedAuthority(user.getRole().name())
                        );

                        UsernamePasswordAuthenticationToken authToken =
                                new UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }, () -> {
                        System.out.println(">>> [JWT FILTER] User NOT FOUND in database for email: " + email);
                    });
                }
            } else {
                System.out.println(">>> [JWT FILTER] Token validation failed!");
            }

//            if (jwtUtils.validateToken(token)) {
//                String email = jwtUtils.extractEmail(token);
//
//                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
//                    userRepository.findByEmail(email).ifPresent(user -> {
//                        // Sets authentication
//                    });
//                }

//                if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
//                    userRepository.findByEmail(email).ifPresent(user -> {
//                        List<SimpleGrantedAuthority> authorities = List.of(
//                                new SimpleGrantedAuthority(user.getRole().name())
//                        );
//
//                        // Use user.getEmail() (or user) as principal, and pass the authorities list
////                        UsernamePasswordAuthenticationToken authToken =
////                                new UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
////
////                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
////                        SecurityContextHolder.getContext().setAuthentication(authToken);
//                    });
//                }
        }



        filterChain.doFilter(request, response);
    }
}