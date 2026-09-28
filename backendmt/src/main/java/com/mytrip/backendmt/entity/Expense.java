package com.mytrip.backendmt.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private Double amount;
    private String paidBy;
    private String category;
    private String receiptUrl;
    private String paymentMode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    @JsonIgnore
    private Trip trip;

    public Long getTripId() {
        return this.trip != null ? this.trip.getId() : null;
    }

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "expense_split_members", joinColumns = @JoinColumn(name = "expense_id"))
    @Column(name = "member_name")
    private List<String> splitAmong = new ArrayList<>();
}