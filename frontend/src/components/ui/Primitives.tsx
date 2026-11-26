import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { ToastItem } from '@/types/erp';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white shadow-[0_1px_2px_rgba(24,24,27,0.08)]',
    gold: 'bg-[#EA581A] text-white font-medium hover:bg-[#D44A10] shadow-[0_1px_2px_rgba(234,88,26,0.22)]',
    secondary:
      'bg-white text-zinc-700 border border-stone-200/90 hover:bg-stone-50 hover:border-stone-300 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-800 dark:hover:bg-zinc-800/80',
    ghost:
      'text-zinc-600 hover:bg-stone-100/90 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-white',
    danger:
      'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-600 shadow-xs',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600/90 dark:hover:bg-emerald-600 shadow-xs',
  };
  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
    sm: 'px-3.5 py-1.5 text-xs font-medium rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
    lg: 'px-5 py-2.5 text-sm font-medium rounded-xl gap-2',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-[#18181B] border border-stone-200/85 dark:border-zinc-800/90 rounded-2xl shadow-[0_1px_2px_rgba(24,24,27,0.03)]',
        onClick && 'cursor-pointer hover:border-stone-300 dark:hover:border-zinc-700 hover:shadow-[0_4px_12px_rgba(24,24,27,0.05)] transition-all duration-150',
        className
      )}
    >
      {children}
    </div>
  );
}

export type ChipTone = 'green' | 'amber' | 'red' | 'slate' | 'gold' | 'blue';

export function StatusChip({
  label,
  tone = 'slate',
  dot = true,
  icon,
  className,
}: {
  label: string;
  tone?: ChipTone;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const styles: Record<ChipTone, string> = {
    green:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    amber:
      'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    red: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60',
    slate:
      'bg-stone-100 text-zinc-700 border-stone-200/80 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700/80',
    gold: 'bg-[#FFF4EE] text-[#C2410C] border-[#FFD5BE] dark:bg-[#EA581A]/15 dark:text-[#FF9E66] dark:border-[#EA581A]/30',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
  };
  const dotColors: Record<ChipTone, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    slate: 'bg-zinc-400',
    gold: 'bg-[#EA581A]',
    blue: 'bg-sky-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
        styles[tone],
        className
      )}
    >
      {icon ? icon : dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[tone])} />}
      {label}
    </span>
  );
}

export function ConfidenceBadge({
  score,
  verifiedBy,
  compact = false,
}: {
  score: number;
  verifiedBy?: string;
  compact?: boolean;
}) {
  if (verifiedBy) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        {compact ? 'Verified' : `Verified · ${verifiedBy}`}
      </span>
    );
  }
  const tone =
    score >= 90
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70'
      : score >= 70
      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/70'
      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70';

  return (
    <span
      title={`AI extraction confidence: ${score}%`}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border tabular-nums whitespace-nowrap',
        tone
      )}
    >
      <Sparkles className="w-2.5 h-2.5" />
      {score}%{!compact && (score >= 90 ? ' High' : score >= 70 ? ' Review' : ' Low')}
    </span>
  );
}

export function Input({
  className,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative flex items-center w-full">
      {icon && <div className="absolute left-3 text-zinc-400 pointer-events-none">{icon}</div>}
      <input
        className={cn(
          'w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#EA581A]/20 focus:border-[#EA581A] transition-colors py-2',
          icon ? 'pl-9 pr-3' : 'px-3',
          className
        )}
        {...props}
      />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      icon={<Search className="w-4 h-4" />}
      className={className}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]">
      <div
        className={cn(
          'w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-200/75 dark:bg-slate-800/90',
        className
      )}
    />
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-[#EA581A] shrink-0 mt-0.5" />,
        };
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 shadow-lg"
          >
            {icons[t.variant]}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{t.title}</p>
              {t.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-white leading-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
