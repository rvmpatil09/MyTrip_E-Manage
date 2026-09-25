package com.mytrip.backendmt.service;

import com.mytrip.backendmt.dto.SettlementDto;
import com.mytrip.backendmt.entity.Expense;
import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.repository.ExpenseRepository;
import com.mytrip.backendmt.repository.TripRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SettlementService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private TripRepository tripRepository;

    public List<SettlementDto> calculateSettlements(Long tripId) {
        // Fetch members stored inside the trip
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with ID: " + tripId));

        List<String> members = trip.getMembers();
        List<Expense> expenses = expenseRepository.findByTripId(tripId);
        List<SettlementDto> settlements = new ArrayList<>();

        if (expenses.isEmpty() || members.isEmpty()) {
            return settlements;
        }

        // 1. Calculate net balance
        Map<String, Double> balances = new HashMap<>();
        members.forEach(m -> balances.put(m, 0.0));

        for (Expense expense : expenses) {
            double splitAmount = expense.getAmount() / members.size();
            for (String member : members) {
                if (member.equalsIgnoreCase(expense.getPaidBy())) {
                    balances.put(member, balances.get(member) + (expense.getAmount() - splitAmount));
                } else {
                    balances.put(member, balances.get(member) - splitAmount);
                }
            }
        }

        // 2. Separate into debtors and creditors
        PriorityQueue<Map.Entry<String, Double>> debtors =
                new PriorityQueue<>(Comparator.comparingDouble(Map.Entry::getValue));
        PriorityQueue<Map.Entry<String, Double>> creditors =
                new PriorityQueue<>((a, b) -> Double.compare(b.getValue(), a.getValue()));

        for (Map.Entry<String, Double> entry : balances.entrySet()) {
            if (entry.getValue() < -0.01) debtors.add(entry);
            else if (entry.getValue() > 0.01) creditors.add(entry);
        }

        // 3. Match settlements greedily
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