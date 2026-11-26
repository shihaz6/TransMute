import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  EmptyState,
  PageHeader,
  StatusChip,
} from '@/components/ui/Primitives';
import { AlertStatus, AnomalyAlert } from '@/types/erp';
import { formatRs } from '@/utils/format';

export function AlertsScreen() {
  const { alerts, selectedAlertId, setSelectedAlertId, navigateToEntity, setAlertStatus } = useErp();

  const [statusTab, setStatusTab] = useState<'open' | 'resolved' | 'all'>('open');

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (statusTab === 'open') return a.status === 'open';
      if (statusTab === 'resolved') return a.status === 'resolved' || a.status === 'dismissed';
      return true;
    });
  }, [alerts, statusTab]);

  const activeAlert = useMemo(() => {
    const found = alerts.find((a) => a.id === selectedAlertId);
    return found || filtered[0] || null;
  }, [alerts, selectedAlertId, filtered]);

  const updateAlertStatus = (alert: AnomalyAlert, status: AlertStatus) => {
    void setAlertStatus(alert.id, status);
  };

  const severityChip = (sev: AnomalyAlert['severity']) => {
    if (sev === 'critical') return <StatusChip label="Critical" tone="red" />;
    if (sev === 'warning') return <StatusChip label="Warning" tone="amber" />;
    return <StatusChip label="Info" tone="blue" />;
  };

  const openAmountAtRisk = alerts
    .filter((a) => a.status === 'open')
    .reduce((sum, a) => sum + (a.amountImpact || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Anomalies"
        subtitle="Transmute continuously watches invoices, supplier bank details, stock counts, and margins to stop costly mistakes early."
        badge={
          openAmountAtRisk > 0 ? (
            <StatusChip
              label={`${formatRs(openAmountAtRisk)} protected at risk`}
              tone="red"
            />
          ) : undefined
        }
      />

      <div className="flex items-center gap-1.5">
        {(
          [
            { id: 'open', label: `Open (${alerts.filter((a) => a.status === 'open').length})` },
            {
              id: 'resolved',
              label: `Resolved / Dismissed (${alerts.filter((a) => a.status !== 'open').length})`,
            },
            { id: 'all', label: `All (${alerts.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer',
              statusTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                  : 'bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            title={alerts.length === 0 ? 'No alerts yet' : 'All clear — no open anomalies'}
            description={
              alerts.length === 0
                ? 'Anomalies appear here once Transmute has checked invoices, bank details, stock and margins.'
                : 'Every flagged issue has been reviewed.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Feed */}
          <div className="xl:col-span-5 space-y-3">
            {filtered.map((alert) => {
              const selected = activeAlert?.id === alert.id;
              return (
                <Card
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={cn(
                    'p-4 transition-all',
                    selected &&
                      'ring-2 ring-[#EA581A] border-[#EA581A] bg-[#FFF4EE]/45 dark:bg-[#EA581A]/10'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {severityChip(alert.severity)}
                      <span className="text-[11px] font-medium text-slate-500">
                        {alert.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{alert.detectedAt}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {alert.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                    {alert.summary}
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    {alert.amountImpact ? (
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                        Impact: {formatRs(alert.amountImpact)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {alert.status !== 'open' && (
                      <StatusChip
                        label={alert.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                        tone="slate"
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Right Inspector */}
          {activeAlert && (
            <Card className="xl:col-span-7 p-6 space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      activeAlert.severity === 'critical'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                    )}
                  >
                    {activeAlert.severity === 'critical' ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {severityChip(activeAlert.severity)}
                      <StatusChip label={activeAlert.category} tone="slate" dot={false} />
                    </div>
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white mt-1.5">
                      {activeAlert.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Detected {activeAlert.detectedAt}
                      {activeAlert.amountImpact &&
                        ` · Potential Financial Impact: ${formatRs(activeAlert.amountImpact)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plain-English Why Flagged */}
              <div className="p-4 rounded-xl bg-[#FFF4EE] dark:bg-[#EA581A]/10 border border-[#FFD5BE] dark:border-[#EA581A]/30 space-y-1.5">
                <div className="text-xs font-semibold text-[#C2410C] dark:text-[#FF9E66] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Why Transmute AI Flagged This
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {activeAlert.whyFlagged}
                </p>
              </div>

              {/* Evidence Grid */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                  Supporting Evidence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeAlert.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800"
                    >
                      <div className="text-[11px] text-slate-500">{ev.label}</div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                        {ev.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                {activeAlert.linkedRoute ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() =>
                      navigateToEntity(activeAlert.linkedRoute!, activeAlert.linkedEntityId)
                    }
                  >
                    Inspect Source Record
                  </Button>
                ) : (
                  <span />
                )}

                {activeAlert.status === 'open' ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<XCircle className="w-3.5 h-3.5" />}
                      onClick={() => updateAlertStatus(activeAlert, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => updateAlertStatus(activeAlert, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                  </div>
                ) : (
                  <StatusChip
                    label={`Already ${activeAlert.status}`}
                    tone="green"
                  />
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
