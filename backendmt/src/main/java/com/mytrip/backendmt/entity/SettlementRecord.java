package com.mytrip.backendmt.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "settlement_records")
@Data
@NoArgsConstructor
public class SettlementRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long tripId;

    @Column(nullable = false)
    private String fromUser;

    @Column(nullable = false)
    private String toUser;

    @Column(nullable = false)
    private Double amount;

    private LocalDateTime settledAt = LocalDateTime.now();
}