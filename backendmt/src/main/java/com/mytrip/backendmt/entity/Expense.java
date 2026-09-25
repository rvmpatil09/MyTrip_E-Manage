package com.mytrip.backendmt.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Data
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String title;           // e.g., "Dinner at Fisherman's Wharf"
    private Double amount;
    private String paidBy;          // Name or User ID of the payer
    private String paymentMode;     // "UPI" or "CASH"
    private String proofUrl;        // Link or file name of the screenshot/receipt
    private String category;        // FOOD, STAY, TRAVEL, MISC

    private LocalDateTime createdAt = LocalDateTime.now();
}