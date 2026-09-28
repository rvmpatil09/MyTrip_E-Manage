package com.mytrip.backendmt.controller;

import com.mytrip.backendmt.dto.SettlementResponse;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.service.TripService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/trips")
public class TripController {

    @Autowired
    private TripService tripService;

    @PostMapping
    public ResponseEntity<Trip> createTrip(@RequestBody Trip trip) {
        Trip savedTrip = tripService.createTrip(trip);
        return new ResponseEntity<>(savedTrip, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Trip>> getAllTrips() {
        return ResponseEntity.ok(tripService.getAllTrips());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Trip> getTripById(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.getTripById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTrip(@PathVariable Long id) {
        tripService.deleteTrip(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/media-link")
    public ResponseEntity<Trip> updateMediaLink(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String mediaDriveUrl = body.get("mediaDriveUrl");
        return ResponseEntity.ok(tripService.updateMediaDriveUrl(id, mediaDriveUrl));
    }

    @PatchMapping("/{id}/conclude")
    public ResponseEntity<Trip> concludeTrip(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.concludeTrip(id));
    }

    @GetMapping("/{id}/settlements")
    public ResponseEntity<List<SettlementResponse>> getSettlements(@PathVariable Long id) {
        return ResponseEntity.ok(tripService.calculateSettlements(id));
    }
}