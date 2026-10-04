package com.mytrip.backendmt.service;

import com.mytrip.backendmt.dto.SettlementDto;
import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.entity.TripMember;
import com.mytrip.backendmt.entity.User;
import com.mytrip.backendmt.repository.ExpenseRepository;
import com.mytrip.backendmt.repository.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SettlementService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private TripRepository tripRepository;

    public List<SettlementDto> calculateSettlements(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with ID: " + tripId));

        List<String> memberNames = trip.getMembers().stream()
                .map(TripMember::getFirstName)
                .collect(Collectors.toList());

        List<Expense> expenses = expenseRepository.findByTripId(tripId);
        List<SettlementDto> settlements = new ArrayList<>();

        if (expenses.isEmpty() || memberNames.isEmpty()) {
            return settlements;
        }

        Map<String, Double> balances = new HashMap<>();
        memberNames.forEach(name -> balances.put(name, 0.0));

        for (Expense expense : expenses) {
            double splitAmount = expense.getAmount() / memberNames.size();
            for (String name : memberNames) {
                if (name.equalsIgnoreCase(expense.getPaidBy())) {
                    balances.put(name, balances.get(name) + (expense.getAmount() - splitAmount));
                } else {
                    balances.put(name, balances.get(name) - splitAmount);
                }
            }
        }

        PriorityQueue<Map.Entry<String, Double>> debtors =
                new PriorityQueue<>(Comparator.comparingDouble(Map.Entry::getValue));
        PriorityQueue<Map.Entry<String, Double>> creditors =
                new PriorityQueue<>((a, b) -> Double.compare(b.getValue(), a.getValue()));

        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            if (entry.getValue() < -0.01) debtors.add(entry);
            else if (entry.getValue() > 0.01) creditors.add(entry);
        }

        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            Map.Entry<String, Double> debtor = debtors.poll();
            Map.Entry<String, Double> creditor = creditors.poll();

            double settled = Math.min(-debtor.getValue(), creditor.getValue());
            settlements.add(new SettlementDto(debtor.getKey(), creditor.getKey(), Math.round(settled * 100.0) / 100.0));

            double remainingDebt = debtor.getValue() + settled;
            double remainingCredit = creditor.getValue() - settled;

            if (remainingDebt < -0.01) {
                debtor.setValue(remainingDebt);
                debtors.add(debtor);
            }
            if (remainingCredit > 0.01) {
                creditor.setValue(remainingCredit);
                creditors.add(creditor);
            }
        }

        return settlements;
    }
}