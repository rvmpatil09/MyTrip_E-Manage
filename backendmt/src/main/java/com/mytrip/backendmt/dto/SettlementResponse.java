package com.mytrip.backendmt.dto;

public class SettlementResponse {
    private String debtor;
    private String creditor;
    private Double amount;

    public SettlementResponse(String debtor, String creditor, Double amount) {
        this.debtor = debtor;
        this.creditor = creditor;
        this.amount = amount;
    }

    public String getDebtor() { return debtor; }
    public String getCreditor() { return creditor; }
    public Double getAmount() { return amount; }
}
