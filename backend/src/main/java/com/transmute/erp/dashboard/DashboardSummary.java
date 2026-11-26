package com.transmute.erp.dashboard;

import java.math.BigDecimal;

/** Headline numbers for the owner's dashboard, all calculated from stored records. */
public record DashboardSummary(
        BigDecimal cashPosition,
        BigDecimal salesOrdersTotal,
        BigDecimal receivables,
        long accountsOverdue30Days,
        BigDecimal openPurchaseOrdersTotal,
        long documentsNeedingReview,
        long openAlerts,
        long lowStockItems) {
}
