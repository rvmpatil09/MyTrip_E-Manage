package com.mytrip.backendmt.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trips")
@Data
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String destination;
    private String stayDetails;
    private LocalDate startDate;
    private LocalDate endDate;
    private Double estimatedBudget;

    // This creates a separate table `trip_members` linked to `trip_id`
    @ElementCollection
    @CollectionTable(name = "trip_members", joinColumns = @JoinColumn(name = "trip_id"))
    @Column(name = "member_name")
    private List<String> members = new ArrayList<>();
}