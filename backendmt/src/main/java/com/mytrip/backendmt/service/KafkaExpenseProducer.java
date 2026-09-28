package com.mytrip.backendmt.service;

import com.mytrip.backendmt.config.KafkaTopicConfig;
import com.mytrip.backendmt.entity.Expense;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaExpenseProducer {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    public void publishExpenseEvent(Expense expense) {
        // Publishes the expense object to Kafka using tripId as partition key
        kafkaTemplate.send(KafkaTopicConfig.EXPENSE_TOPIC, String.valueOf(expense.getTripId()), expense);
        System.out.println("Kafka Producer: Published expense event -> " + expense.getTitle());
    }
}