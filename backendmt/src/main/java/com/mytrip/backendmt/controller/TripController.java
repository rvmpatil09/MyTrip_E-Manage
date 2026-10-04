package com.mytrip.backendmt.controller;

import com.mytrip.backendmt.entity.SettlementRecord;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.entity.TripMember;
import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.TripRepository;
import com.mytrip.backendmt.repository.UserRepository;
import com.mytrip.backendmt.service.TripService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    @Autowired
    private TripRepository tripRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TripService tripService;

    @PutMapping("/{id}/conclude")
    public ResponseEntity<?> concludeTrip(@PathVariable Long id) {
        Trip updatedTrip = tripService.concludeTrip(id);
        return ResponseEntity.ok(Map.of(
                "message", "Trip concluded and settled successfully",
                "status", updatedTrip.getStatus()
        ));
    }

    @PostMapping("/{id}/settle")
    public ResponseEntity<?> markAsSettled(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {

        String fromUser = (String) payload.get("from");
        String toUser = (String) payload.get("to");
        Double amount = Double.valueOf(payload.get("amount").toString());

        SettlementRecord record = tripService.recordSettlement(id, fromUser, toUser, amount);
        return ResponseEntity.ok(record);
    }

    // 1. Single GET endpoint for the dashboard: GET /api/trips
    @GetMapping
    public ResponseEntity<List<Trip>> getUserTrips() {
        List<Trip> trips = tripService.getUserTrips();
        return ResponseEntity.ok(trips);
    }

    // 2. Optional: Admin/global endpoint if needed: GET /api/trips/all
    @GetMapping("/all")
    public ResponseEntity<List<Trip>> getAllTripsGlobal() {
        return ResponseEntity.ok(tripService.getAllTripsGlobal());
    }

    // 3. Single trip details: GET /api/trips/{id}
    @GetMapping("/{id}")
    public ResponseEntity<Trip> getTripDetails(@PathVariable Long id) {
        Trip trip = tripService.getTripDetails(id);
        return ResponseEntity.ok(trip);
    }

    // 4. Create trip: POST /api/trips
    @PostMapping
    public ResponseEntity<?> createTrip(@RequestBody Trip trip, Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
            }

            String email = authentication.getName();
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found: " + email));

            trip.setCreatedBy(currentUser);

            if (trip.getMembers() != null) {
                for (TripMember member : trip.getMembers()) {
                    member.setTrip(trip);
                }
            }

            Trip savedTrip = tripRepository.save(trip);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedTrip);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating trip: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/settlements")
    public ResponseEntity<List<Map<String, Object>>> getOptimalSettlements(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.calculateSettlements(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTrip(@PathVariable Long id) {
        tripService.deleteTrip(id);
        return ResponseEntity.ok(Map.of("message", "Trip deleted successfully"));
    }
}