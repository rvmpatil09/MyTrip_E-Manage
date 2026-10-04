package com.mytrip.backendmt.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
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

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @Column(name = "estimated_budget")
    private Double estimatedBudget;

    @Column(name = "stay_details")
    private String stayDetails;

    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    @Column(name = "media_drive_url", length = 1000)
    private String mediaDriveUrl;

    // Prevent lazy-loading proxy failures during JSON serialization
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    @JsonIgnoreProperties({"password", "trips", "authorities"})
    private User createdBy;

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TripMember> members = new ArrayList<>();

    @OneToMany(mappedBy = "trip", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Expense> expenses = new ArrayList<>();
}