package com.transmute.erp.alerts;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnomalyAlertRepository extends JpaRepository<AnomalyAlert, String> {

    List<AnomalyAlert> findAllByOrderByDetectedAtDesc();

    List<AnomalyAlert> findByStatusOrderByDetectedAtDesc(String status);
}
