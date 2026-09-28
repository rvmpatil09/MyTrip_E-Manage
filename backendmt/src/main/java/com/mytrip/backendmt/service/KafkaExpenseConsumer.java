package com.mytrip.backendmt.service;

import com.mytrip.backendmt.config.KafkaTopicConfig;
import com.mytrip.backendmt.entity.Expense;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaExpenseConsumer {

    @Autowired(required = false)
    private NotificationService notificationService;

    @KafkaListener(topics = KafkaTopicConfig.EXPENSE_TOPIC, groupId = "trip-expense-group")
    public void consumeExpenseEvent(Expense expense) {
        System.out.println("Kafka Consumer: Received expense event -> " + expense.getTitle() + " (₹" + expense.getAmount() + ")");

        // Asynchronously trigger notification alerts if service is present
        if (notificationService != null) {
            notificationService.notifyMembersOnExpense(expense);
        }
    }
}