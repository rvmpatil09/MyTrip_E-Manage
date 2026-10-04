package com.mytrip.backendmt.repository;

import com.mytrip.backendmt.entity.Trip;
import com.mytrip.backendmt.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    // 1. Fetch all trips created by or joined by the user email/name
    @Query("SELECT DISTINCT t FROM Trip t LEFT JOIN t.members m " +
            "WHERE t.createdBy.email = :email " +
            "OR (LOWER(m.firstName) = LOWER(:firstName) AND LOWER(m.lastName) = LOWER(:lastName))")
    List<Trip> findAllByUserOrMember(
            @Param("email") String email,
            @Param("firstName") String firstName,
            @Param("lastName") String lastName
    );

    // 2. Fetch single trip by ID if authorized
    @Query("SELECT DISTINCT t FROM Trip t LEFT JOIN t.members m " +
            "WHERE t.id = :tripId AND (" +
            "t.createdBy.email = :email " +
            "OR LOWER(m.firstName) = LOWER(:firstName) " +
            "OR LOWER(m.lastName) = LOWER(:lastName))")
    Optional<Trip> findByIdAndUserOrMember(
            @Param("tripId") Long tripId,
            @Param("email") String email,
            @Param("firstName") String firstName,
            @Param("lastName") String lastName
    );

    // 3. Simple fallback finder by creator email
    List<Trip> findByCreatedByEmail(String email);
}