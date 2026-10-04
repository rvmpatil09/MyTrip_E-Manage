package com.mytrip.backendmt.service;

import com.mytrip.backendmt.entity.*;
import com.mytrip.backendmt.repository.SettlementRecordRepository;
import com.mytrip.backendmt.repository.TripRepository;
import com.mytrip.backendmt.repository.UserRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Data
@Service
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final SettlementRecordRepository settlementRecordRepository;

    public TripService(TripRepository tripRepository,
                       UserRepository userRepository,
                       SettlementRecordRepository settlementRecordRepository) {
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.settlementRecordRepository = settlementRecordRepository;
    }

    @Transactional
    public SettlementRecord recordSettlement(Long tripId, String fromUser, String toUser, Double amount) {
        SettlementRecord record = new SettlementRecord();
        record.setTripId(tripId);
        record.setFromUser(fromUser);
        record.setToUser(toUser);
        record.setAmount(amount);
        return settlementRecordRepository.save(record);
    }


    @Transactional
    public Trip createTrip(Trip trip) {
        User currentUser = getCurrentAuthenticatedUser();

        // Set the creator of the trip
        trip.setCreatedBy(currentUser);

        // Ensure the members collection is initialized
        if (trip.getMembers() == null) {
            trip.setMembers(new java.util.ArrayList<>());
        }

        // Add creator as a confirmed member if not already present
        boolean alreadyMember = trip.getMembers().stream()
                .anyMatch(m -> currentUser.getFirstName().equalsIgnoreCase(m.getFirstName())
                        && currentUser.getLastName().equalsIgnoreCase(m.getLastName()));

        if (!alreadyMember) {
            TripMember creatorMember = new TripMember();
            creatorMember.setFirstName(currentUser.getFirstName());
            creatorMember.setLastName(currentUser.getLastName());
            creatorMember.setContribution(0.0);
            creatorMember.setTrip(trip); // link member to this trip
            trip.getMembers().add(creatorMember);
        } else {
            // Ensure all existing members have their back-reference to trip set
            for (TripMember m : trip.getMembers()) {
                m.setTrip(trip);
            }
        }

        return tripRepository.save(trip);
    }

    private User getCurrentAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Authenticated user not found"));
    }

    @Transactional(readOnly = true)
    public List<Trip> getUserTrips() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Authenticated user not found: " + email));

        // 1. Admin gets all trips globally
        if (currentUser.getRole() == Role.ROLE_ADMIN) {
            return tripRepository.findAll();
        }

        // 2. Standard user: Get trips created by this user or joined as member
        String firstName = currentUser.getFirstName() != null ? currentUser.getFirstName() : "";
        String lastName = currentUser.getLastName() != null ? currentUser.getLastName() : "";

        List<Trip> trips = tripRepository.findAllByUserOrMember(currentUser.getEmail(), firstName, lastName);

        // Fallback: If no trips returned via member check, ensure created trips are returned
        if (trips.isEmpty()) {
            trips = tripRepository.findByCreatedByEmail(currentUser.getEmail());
        }

        return trips;
    }

    @Transactional(readOnly = true)
    public Trip getTripDetails(Long tripId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // 1. First find the trip
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with ID: " + tripId));

        // 2. Admins and the trip creator always have full access
        if (currentUser.getRole() == Role.ROLE_ADMIN ||
                (trip.getCreatedBy() != null && trip.getCreatedBy().getEmail().equalsIgnoreCase(currentUser.getEmail()))) {
            return trip;
        }

        // 3. Otherwise check if user is in members list
        String firstName = currentUser.getFirstName() != null ? currentUser.getFirstName().trim() : "";
        String lastName = currentUser.getLastName() != null ? currentUser.getLastName().trim() : "";

        boolean isMember = trip.getMembers() != null && trip.getMembers().stream().anyMatch(m ->
                (firstName.length() > 0 && m.getFirstName() != null && m.getFirstName().equalsIgnoreCase(firstName)) ||
                        (lastName.length() > 0 && m.getLastName() != null && m.getLastName().equalsIgnoreCase(lastName))
        );

        if (!isMember) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied: You are not authorized to view this trip");
        }

        return trip;
    }

    public List<Trip> getAllTripsGlobal() {
        return tripRepository.findAll();
    }

    public List<Map<String, Object>> calculateSettlements(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        List<Expense> expenses = trip.getExpenses();
        if (expenses == null || expenses.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Double> balances = new HashMap<>();

        // 1. Initialize members
        if (trip.getMembers() != null) {
            for (TripMember member : trip.getMembers()) {
                String fullName = (member.getFirstName() + " " + (member.getLastName() != null ? member.getLastName() : "")).trim();
                balances.put(fullName, 0.0);
            }
        }

        // 2. Compute raw balances from expenses
        for (Expense expense : expenses) {
            String payer = expense.getPaidBy() != null ? expense.getPaidBy().trim() : "";
            Double amount = expense.getAmount() != null ? expense.getAmount() : 0.0;

            List<String> splits = expense.getSplitAmong();
            if (splits == null || splits.isEmpty()) {
                splits = new ArrayList<>(balances.keySet());
            }

            if (splits.isEmpty()) continue;

            double splitAmount = amount / splits.size();
            balances.put(payer, balances.getOrDefault(payer, 0.0) + amount);

            for (String member : splits) {
                String trimmedMember = member.trim();
                balances.put(trimmedMember, balances.getOrDefault(trimmedMember, 0.0) - splitAmount);
            }
        }

        // --- PASTE THE SETTLED LIST CODE EXACTLY HERE ---
        List<SettlementRecord> settledList = settlementRecordRepository.findByTripId(tripId);
        if (settledList != null) {
            for (SettlementRecord s : settledList) {
                // Debtor paid back, balance moves up towards 0
                balances.put(s.getFromUser(), balances.getOrDefault(s.getFromUser(), 0.0) + s.getAmount());
                // Creditor received money, balance decreases towards 0
                balances.put(s.getToUser(), balances.getOrDefault(s.getToUser(), 0.0) - s.getAmount());
            }
        }
        // ------------------------------------------------

        // 3. Match remaining debtors and creditors
        PriorityQueue<Map.Entry<String, Double>> debtors = new PriorityQueue<>(Comparator.comparingDouble(Map.Entry::getValue));
        PriorityQueue<Map.Entry<String, Double>> creditors = new PriorityQueue<>((a, b) -> Double.compare(b.getValue(), a.getValue()));

        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            if (entry.getValue() < -0.01) {
                debtors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), entry.getValue()));
            } else if (entry.getValue() > 0.01) {
                creditors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), entry.getValue()));
            }
        }

        List<Map<String, Object>> settlements = new ArrayList<>();
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            Map.Entry<String, Double> debtor = debtors.poll();
            Map.Entry<String, Double> creditor = creditors.poll();

            double debit = Math.abs(debtor.getValue());
            double credit = creditor.getValue();
            double settledAmount = Math.min(debit, credit);

            Map<String, Object> transaction = new HashMap<>();
            transaction.put("from", debtor.getKey());
            transaction.put("to", creditor.getKey());
            transaction.put("amount", Math.round(settledAmount * 100.0) / 100.0);
            settlements.add(transaction);

            if (debit > credit) {
                debtors.add(new AbstractMap.SimpleEntry<>(debtor.getKey(), -(debit - settledAmount)));
            } else if (credit > debit) {
                creditors.add(new AbstractMap.SimpleEntry<>(creditor.getKey(), credit - settledAmount));
            }
        }

        return settlements;
    }

    @Transactional
    public void deleteTrip(Long tripId) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        boolean isAdmin = currentUser.getRole() == Role.ROLE_ADMIN;
        boolean isCreator = trip.getCreatedBy() != null &&
                trip.getCreatedBy().getEmail().equalsIgnoreCase(currentUser.getEmail());

        // Restrict deletion to Admin or Trip Creator
        if (!isAdmin && !isCreator) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Unauthorized: Only the trip creator or an administrator can delete this trip."
            );
        }

        tripRepository.delete(trip);
    }

    @Transactional
    public Trip concludeTrip(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        trip.setStatus("CONCLUDED");
        return tripRepository.save(trip);
    }
}
