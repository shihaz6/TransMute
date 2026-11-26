package com.transmute.erp.reports;

import java.util.List;

/** A computed report: a summary, the method used, a table and an optional chart series. */
public record ReportView(
        String title,
        String summary,
        String methodology,
        String chartType,
        String valueLabel,
        List<ChartPoint> chartData,
        List<String> columns,
        List<List<Object>> rows) {

    public record ChartPoint(String name, Number value) {
    }
}
