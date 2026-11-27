package com.transmute.erp.documents;

import com.transmute.erp.documents.DocumentService.FieldUpdate;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    @GetMapping
    public List<InboxDocument> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    public InboxDocument get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public InboxDocument upload(@RequestParam("file") MultipartFile file,
                                @RequestParam(value = "channel", required = false) String channel) {
        return service.store(file, channel);
    }

    @PatchMapping("/{id}")
    public InboxDocument updateFields(@PathVariable String id, @RequestBody FieldUpdate body) {
        return service.updateFields(id, body);
    }

    @PostMapping("/{id}/approve")
    public InboxDocument approve(@PathVariable String id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/reject")
    public InboxDocument reject(@PathVariable String id) {
        return service.reject(id);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> file(@PathVariable String id) throws IOException {
        InboxDocument doc = service.metadata(id);
        Path path = service.fileOf(id);
        // Only the canonical PDF and image types are served as stored. Anything else is sent as a
        // download, so the browser never renders a document's markup on this origin.
        boolean inline = UploadTypes.isInline(doc.getContentType());
        MediaType type = inline ? MediaType.parseMediaType(doc.getContentType()) : MediaType.APPLICATION_OCTET_STREAM;
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(doc.getFileName())
                .build();
        // The sandbox directive stops the page running scripts, but it also stops browsers rendering
        // inline PDFs, so PDFs get the policy without it. Images keep the full sandbox.
        String csp = MediaType.APPLICATION_PDF.equalsTypeAndSubtype(type)
                ? "default-src 'none'"
                : "default-src 'none'; sandbox";
        return ResponseEntity.ok()
                .contentType(type)
                .contentLength(Files.size(path))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", csp)
                .body(new FileSystemResource(path));
    }
}
