package com.mytrip.backendmt.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;

import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.admin.AdminClientConfig;

//@Configuration
public class KafkaTopicConfig {

    public static final String EXPENSE_TOPIC = "trip-expenses-topic";

    @Bean
    public KafkaAdmin kafkaAdmin() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        // Lower timeout so it doesn't freeze startup if Kafka is slow
        configs.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, "3000");
        KafkaAdmin admin = new KafkaAdmin(configs);
        // Do not fail startup if broker is unavailable
        admin.setFatalIfBrokerNotAvailable(false);
        return admin;
    }

    @Bean
    public NewTopic expenseTopic() {
        return TopicBuilder.name(EXPENSE_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}