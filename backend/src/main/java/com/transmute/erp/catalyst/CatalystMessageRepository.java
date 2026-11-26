package com.transmute.erp.catalyst;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CatalystMessageRepository extends JpaRepository<CatalystMessage, String> {

    List<CatalystMessage> findAllByOrderByCreatedAtAsc();
}
