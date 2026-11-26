package com.transmute.erp.documents;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InboxDocumentRepository extends JpaRepository<InboxDocument, String> {

    List<InboxDocument> findAllByOrderByReceivedAtDesc();
}
