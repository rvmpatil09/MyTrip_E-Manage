package com.mytrip.backendmt.service;

import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.repository.TripRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class ExpenseService {

    @Autowired
    private TripRepository tripRepository;

    private final String UPLOAD_DIR = "uploads/";

    @Transactional
    public Expense addExpenseToTrip(Long tripId, Expense expense, MultipartFile receipt) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        // Save receipt image to disk if attached
        if (receipt != null && !receipt.isEmpty()) {
            try {
                File dir = new File(UPLOAD_DIR);
                if (!dir.exists()) dir.mkdirs();

                String fileName = UUID.randomUUID() + "_" + receipt.getOriginalFilename();
                Path filePath = Paths.get(UPLOAD_DIR + fileName);
                Files.copy(receipt.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

                expense.setReceiptUrl("/uploads/" + fileName);
            } catch (IOException e) {
                throw new RuntimeException("Could not store receipt file", e);
            }
        }

        expense.setTrip(trip);
        trip.getExpenses().add(expense);
        tripRepository.save(trip);

        return expense;
    }
}