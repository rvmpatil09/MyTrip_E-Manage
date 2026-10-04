package com.mytrip.backendmt.controller;

import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.service.ExpenseService;
import com.mytrip.backendmt.service.TripService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/trips")
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    // Fixes the red line on line 39
    @Autowired
    private TripService tripService;

    @PostMapping(value = "/{id}/expenses", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Expense> addExpense(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("amount") Double amount,
            @RequestParam("paidBy") String paidBy,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "splitAmong", required = false) List<String> splitAmong,
            @RequestParam(value = "receipt", required = false) MultipartFile receipt) {

        Expense expense = new Expense();
        expense.setTitle(title);
        expense.setAmount(amount);
        expense.setPaidBy(paidBy);
        expense.setCategory(category);
        expense.setSplitAmong(splitAmong);

        return ResponseEntity.ok(expenseService.addExpenseToTrip(id, expense, receipt));
    }
}