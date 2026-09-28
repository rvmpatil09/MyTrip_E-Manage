package com.mytrip.backendmt.service;

import com.mytrip.backendmt.dto.SettlementResponse;
import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.entity.TripMember;
import com.mytrip.backendmt.repository.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.*;

@Service
public class TripService {

    @Autowired
    private TripRepository tripRepository;

    @Transactional
    public Trip createTrip(Trip trip) {
        if (trip.getStatus() == null) trip.setStatus("ACTIVE");
        if (trip.getMembers() == null) trip.setMembers(new ArrayList<>());
        if (trip.getExpenses() == null) trip.setExpenses(new ArrayList<>());
        return tripRepository.saveAndFlush(trip);
    }

    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    public Trip getTripById(Long id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + id));
    }

    @Transactional
    public void deleteTrip(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + id));
        tripRepository.delete(trip);
    }

    @Transactional
    public Trip updateMediaDriveUrl(Long id, String mediaDriveUrl) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + id));
        trip.setMediaDriveUrl(mediaDriveUrl != null ? mediaDriveUrl.trim() : null);
        return tripRepository.save(trip);
    }

    @Transactional
    public Trip concludeTrip(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + id));
        trip.setStatus("CONCLUDED");
        trip.setEndDate(LocalDate.now().toString());
        return tripRepository.save(trip);
    }

    @Transactional
    public Expense addExpense(Long tripId, Expense expense, MultipartFile receipt) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        if ("CONCLUDED".equalsIgnoreCase(trip.getStatus())) {
            throw new IllegalStateException("Cannot log expenses to a concluded trip.");
        }

        if (receipt != null && !receipt.isEmpty()) {
            try {
                String uploadDir = "uploads/";
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                String filename = UUID.randomUUID() + "_" + receipt.getOriginalFilename();
                Path filePath = uploadPath.resolve(filename);
                Files.copy(receipt.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                expense.setReceiptUrl("/uploads/" + filename);
            } catch (IOException e) {
                throw new RuntimeException("Could not store receipt file", e);
            }
        }

        expense.setTrip(trip);
        trip.getExpenses().add(expense);
        tripRepository.save(trip);
        return expense;
    }

    public List<SettlementResponse> calculateSettlements(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        List<TripMember> members = trip.getMembers();
        List<Expense> expenses = trip.getExpenses();

        if (members == null || members.isEmpty() || expenses == null || expenses.isEmpty()) {
            return Collections.emptyList();
        }

        Map<String, Double> balances = new HashMap<>();
        for (TripMember m : members) {
            String name = (m.getFirstName() + " " + (m.getLastName() != null ? m.getLastName() : "")).trim();
            balances.put(name, 0.0);
        }

        for (Expense e : expenses) {
            String payer = e.getPaidBy();
            double amount = e.getAmount() != null ? e.getAmount() : 0.0;

            if (payer != null && balances.containsKey(payer)) {
                balances.put(payer, balances.get(payer) + amount);
            }

            List<String> participants = (e.getSplitAmong() != null && !e.getSplitAmong().isEmpty())
                    ? e.getSplitAmong()
                    : new ArrayList<>(balances.keySet());

            double share = amount / participants.size();
            for (String participant : participants) {
                if (balances.containsKey(participant)) {
                    balances.put(participant, balances.get(participant) - share);
                }
            }
        }

        Queue<Map.Entry<String, Double>> debtors = new LinkedList<>();
        Queue<Map.Entry<String, Double>> creditors = new LinkedList<>();

        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            double net = entry.getValue();
            if (net < -0.01) {
                debtors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), -net));
            } else if (net > 0.01) {
                creditors.add(new AbstractMap.SimpleEntry<>(entry.getKey(), net));
            }
        }

        List<SettlementResponse> settlements = new ArrayList<>();
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            Map.Entry<String, Double> debtor = debtors.poll();
            Map.Entry<String, Double> creditor = creditors.poll();

            double settledAmount = Math.min(debtor.getValue(), creditor.getValue());
            settlements.add(new SettlementResponse(
                    debtor.getKey(),
                    creditor.getKey(),
                    Math.round(settledAmount * 100.0) / 100.0
            ));

            if (debtor.getValue() > settledAmount) {
                debtors.add(new AbstractMap.SimpleEntry<>(debtor.getKey(), debtor.getValue() - settledAmount));
            }
            if (creditor.getValue() > settledAmount) {
                creditors.add(new AbstractMap.SimpleEntry<>(creditor.getKey(), creditor.getValue() - settledAmount));
            }
        }

        return settlements;
    }
}