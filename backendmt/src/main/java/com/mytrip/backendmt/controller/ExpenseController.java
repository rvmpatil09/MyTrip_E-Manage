package com.mytrip.backendmt.controller;

import com.mytrip.backendmt.dto.SettlementDto;
import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.repository.ExpenseRepository;
import com.mytrip.backendmt.service.SettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private SettlementService settlementService;

    @PostMapping
    public ResponseEntity<Expense> addExpense(@RequestBody Expense expense) {
        return ResponseEntity.ok(expenseRepository.save(expense));
    }

    @GetMapping("/trip/{tripId}")
    public ResponseEntity<List<Expense>> getExpensesByTrip(@PathVariable Long tripId) {
        return ResponseEntity.ok(expenseRepository.findByTripId(tripId));
    }

    @GetMapping("/trip/{tripId}/settle")
    public ResponseEntity<List<SettlementDto>> settleTrip(@PathVariable Long tripId) {
        return ResponseEntity.ok(settlementService.calculateSettlements(tripId));
    }
}