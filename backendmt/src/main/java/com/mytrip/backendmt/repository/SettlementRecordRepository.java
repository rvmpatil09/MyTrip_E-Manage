package com.mytrip.backendmt.repository;

import com.mytrip.backendmt.entity.SettlementRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementRecordRepository extends JpaRepository<SettlementRecord, Long> {
    List<SettlementRecord> findByTripId(Long tripId);
}