package com.transmute.erp.purchasing;

import com.transmute.erp.common.NotFoundException;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/goods-received-notes")
public class GoodsReceivedNoteController {

    private final GoodsReceivedNoteRepository grns;

    public GoodsReceivedNoteController(GoodsReceivedNoteRepository grns) {
        this.grns = grns;
    }

    @GetMapping
    public List<GoodsReceivedNote> list() {
        return grns.findAll();
    }

    @GetMapping("/{id}")
    public GoodsReceivedNote get(@PathVariable String id) {
        return grns.findById(id).orElseThrow(() -> new NotFoundException("Goods received note", id));
    }
}
