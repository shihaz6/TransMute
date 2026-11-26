import React, { useState } from 'react';
import {
  Check,
  Landmark,
  Mail,
  MessageSquare,
  Plus,
  Shield,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  Input,
  Modal,
  PageHeader,
  StatusChip,
} from '@/components/ui/Primitives';

const ROLES = ['Owner', 'Sales Manager', 'Accounts', 'Warehouse Lead', 'Van Driver'] as const;
const PERMISSIONS = [
  'View Profit & Margins',
  'Approve Invoices > Rs. 100k',
  'Override Credit Limits',
  'Edit Product Prices',
  'Adjust Warehouse Stock',
  'Send WhatsApp Reminders',
] as const;

const INITIAL_MATRIX: Record<string, Record<string, boolean>> = {
  Owner: {
    'View Profit & Margins': true,
    'Approve Invoices > Rs. 100k': true,
    'Override Credit Limits': true,
    'Edit Product Prices': true,
    'Adjust Warehouse Stock': true,
    'Send WhatsApp Reminders': true,
  },
  'Sales Manager': {
    'View Profit & Margins': false,
    'Approve Invoices > Rs. 100k': false,
    'Override Credit Limits': false,
    'Edit Product Prices': true,
    'Adjust Warehouse Stock': false,
    'Send WhatsApp Reminders': true,
  },
  Accounts: {
    'View Profit & Margins': true,
    'Approve Invoices > Rs. 100k': false,
    'Override Credit Limits': false,
    'Edit Product Prices': false,
    'Adjust Warehouse Stock': false,
    'Send WhatsApp Reminders': true,
  },
  'Warehouse Lead': {
    'View Profit & Margins': false,
    'Approve Invoices > Rs. 100k': false,
    'Override Credit Limits': false,
    'Edit Product Prices': false,
    'Adjust Warehouse Stock': true,
    'Send WhatsApp Reminders': false,
  },
  'Van Driver': {
    'View Profit & Margins': false,
    'Approve Invoices > Rs. 100k': false,
    'Override Credit Limits': false,
    'Edit Product Prices': false,
    'Adjust Warehouse Stock': false,
    'Send WhatsApp Reminders': false,
  },
};

export function SettingsScreen() {
  const {
    approvalRules,
    setApprovalRules,
    aiSettings,
    setAiSettings,
    addToast,
  } = useErp();

  const [tab, setTab] = useState<'roles' | 'approvals' | 'ai' | 'channels'>('roles');
  const [matrix, setMatrix] = useState(INITIAL_MATRIX);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleApprover, setNewRuleApprover] = useState('Owner (Rohan)');

  const togglePerm = (role: string, perm: string) => {
    if (role === 'Owner') return;
    setMatrix((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
    addToast({
      title: 'Permission updated',
      description: `${role} → ${perm}`,
      variant: 'info',
    });
  };

  const toggleRule = (id: string) => {
    setApprovalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const addRule = () => {
    if (!newRuleName.trim() || !newRuleCondition.trim()) return;
    setApprovalRules((prev) => [
      ...prev,
      {
        id: `RULE-${Date.now()}`,
        name: newRuleName.trim(),
        condition: newRuleCondition.trim(),
        approver: newRuleApprover,
        active: true,
      },
    ]);
    setRuleModalOpen(false);
    setNewRuleName('');
    setNewRuleCondition('');
    addToast({
      title: 'Approval rule added',
      description: 'Transmute will enforce this rule immediately.',
      variant: 'success',
    });
  };

  const toggleAiMode = (id: string, mode: 'auto-post' | 'always-review') => {
    setAiSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, mode } : s))
    );
    addToast({
      title: 'AI Automation Control Updated',
      description:
        mode === 'auto-post'
          ? 'AI may execute automatically when confidence thresholds are met.'
          : 'AI will always pause and request human approval first.',
      variant: 'info',
    });
  };

  const team = [
    { name: 'Rohan Perera', role: 'Owner', phone: '+94 77 410 0221', status: 'Active' },
    { name: 'Nimali Jayawardena', role: 'Accounts', phone: '+94 71 889 0123', status: 'Active' },
    { name: 'Kasun Fernando', role: 'Sales Manager', phone: '+94 77 412 0987', status: 'Active' },
    { name: 'Chaminda Silva', role: 'Warehouse Lead', phone: '+94 76 552 1009', status: 'Active' },
    { name: 'Pradeep Kumara', role: 'Van Driver', phone: '+94 71 771 2034', status: 'Active' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & Governance"
        subtitle="Control staff permissions, owner approval thresholds, AI autonomy guardrails, and WhatsApp/email connections."
      />

      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        {(
          [
            { id: 'roles', label: 'Users & Permission Matrix', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'approvals', label: 'Approval Rules', icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'ai', label: 'AI Automation Controls', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'channels', label: 'WhatsApp & Email Channels', icon: <MessageSquare className="w-3.5 h-3.5" /> },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
              tab === t.id
                ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roles' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Team Members ({team.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {team.map((u) => (
                <div
                  key={u.name}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">{u.name}</div>
                  <div className="text-[11px] text-[#EA581A] dark:text-[#FF9E66] font-medium mt-0.5">
                    {u.role}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{u.phone}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Role Permission Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any checkbox to adjust what each staff role can see or approve. Owner always retains full control.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Permission</th>
                    {ROLES.map((r) => (
                      <th key={r} className="px-4 py-3 font-medium text-center">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {PERMISSIONS.map((perm) => (
                    <tr key={perm}>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                        {perm}
                      </td>
                      {ROLES.map((role) => {
                        const allowed = matrix[role][perm];
                        return (
                          <td key={role} className="px-4 py-3.5 text-center">
                            <button
                              disabled={role === 'Owner'}
                              onClick={() => togglePerm(role, perm)}
                              className={cn(
                                'w-6 h-6 rounded-md inline-flex items-center justify-center border transition-colors cursor-pointer disabled:cursor-default',
                                allowed
                                  ? 'bg-[#EA581A] border-[#EA581A] text-white'
                                  : 'bg-white dark:bg-zinc-900 border-stone-300 dark:border-zinc-700 text-transparent hover:border-[#EA581A]'
                              )}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Hard business rules enforced before money leaves your account or stock ships on credit.
            </p>
            <Button
              variant="gold"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setRuleModalOpen(true)}
            >
              Add Approval Rule
            </Button>
          </div>
          <div className="space-y-3">
            {approvalRules.map((rule) => (
              <Card key={rule.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {rule.name}
                    </span>
                    <StatusChip
                      label={rule.active ? 'Enforced' : 'Paused'}
                      tone={rule.active ? 'green' : 'slate'}
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Trigger:</strong> {rule.condition}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Required Approver: <strong className="text-slate-700 dark:text-slate-200">{rule.approver}</strong>
                  </p>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0',
                    rule.active ? 'bg-[#EA581A]' : 'bg-stone-300 dark:bg-zinc-700'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full bg-white shadow transition-transform',
                      rule.active ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div className="space-y-4">
          <Card className="p-4 border-[#FFD5BE] dark:border-[#EA581A]/35 bg-[#FFF4EE]/75 dark:bg-[#EA581A]/10 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#EA581A] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
              <strong>No black-box AI:</strong> You decide exactly which routine tasks Transmute may auto-post and which must always wait for your approval. Every single action is recorded in the AI Action Log.
            </p>
          </Card>

          <div className="space-y-3">
            {aiSettings.map((setting) => (
              <Card
                key={setting.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {setting.task}
                    </span>
                    {setting.threshold && (
                      <StatusChip label={setting.threshold} tone="slate" dot={false} />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {setting.description}
                  </p>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0 self-start">
                  <button
                    onClick={() => toggleAiMode(setting.id, 'auto-post')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all',
                      setting.mode === 'auto-post'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    May Auto-Post
                  </button>
                  <button
                    onClick={() => toggleAiMode(setting.id, 'always-review')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all',
                      setting.mode === 'always-review'
                        ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    Always Review
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: <MessageSquare className="w-5 h-5 text-emerald-600" />,
              name: 'WhatsApp Business API',
              endpoint: '+94 77 410 0221 (Lanka Crest Wholesale)',
              desc: 'Receives customer text & voice-note orders, supplier bill photos, and sends approved payment reminders.',
              status: 'Connected · Synced 1m ago',
            },
            {
              icon: <Mail className="w-5 h-5 text-sky-600" />,
              name: 'Supplier Bills Email Inbox',
              endpoint: 'bills@lankacrest.lk',
              desc: 'Automatically parses PDF invoices and email quote requests into Document Inbox & Orders.',
              status: 'Connected · 18 emails today',
            },
            {
              icon: <Landmark className="w-5 h-5 text-[#EA581A]" />,
              name: 'Commercial Bank Business Feed',
              endpoint: 'A/C ····8821-01 (CEFTS & JustPay)',
              desc: 'Pulls daily statements for 1-click AI reconciliation against customer invoices and supplier payments.',
              status: 'Connected · Updated 09:00 AM',
            },
          ].map((ch) => (
            <Card key={ch.name} className="p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {ch.icon}
                  </div>
                  <StatusChip label="Connected" tone="green" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{ch.name}</h3>
                <div className="text-xs font-mono text-slate-500 mt-1">{ch.endpoint}</div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                  {ch.desc}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{ch.status}</span>
                <button
                  onClick={() =>
                    addToast({
                      title: `${ch.name} synced`,
                      description: 'Connection healthy and receiving live events.',
                      variant: 'success',
                    })
                  }
                  className="text-[#EA581A] dark:text-[#FF9E66] font-medium hover:underline cursor-pointer"
                >
                  Test Sync
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="Create Approval Rule"
        subtitle="Require human sign-off whenever a transaction hits your custom threshold."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" size="sm" onClick={addRule}>
              Save Rule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Rule Name
            </label>
            <Input
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="e.g. Discount Over 5%"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Condition
            </label>
            <Input
              value={newRuleCondition}
              onChange={(e) => setNewRuleCondition(e.target.value)}
              placeholder="e.g. Any sales quote with >5% discount or order > Rs. 500,000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Approver
            </label>
            <select
              value={newRuleApprover}
              onChange={(e) => setNewRuleApprover(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <option>Owner (Rohan)</option>
              <option>Owner + Accounts Manager</option>
              <option>Sales Manager</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
