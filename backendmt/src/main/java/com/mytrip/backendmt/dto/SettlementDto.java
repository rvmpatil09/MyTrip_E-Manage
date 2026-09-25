package com.mytrip.backendmt.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SettlementDto {
    private String fromUser; // Debtor
    private String toUser;   // Creditor
    private Double amount;
}