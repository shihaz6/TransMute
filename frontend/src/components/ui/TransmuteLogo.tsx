import React from 'react';
import transmuteLogoDark from '@/assets/transmute-logo-dark.png';
import { cn } from '@/components/ui/Primitives';

export function TransmuteMark({
  size = 28,
  framed = true,
  className,
}: {
  size?: number;
  framed?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 rounded-[7px]',
        framed && 'ring-1 ring-stone-200/90 dark:ring-white/10 shadow-[0_1px_2px_rgba(24,24,27,0.06)]',
        className
      )}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="10" fill="#FFFFFF" />
      <rect x="17" y="17" width="47" height="47" rx="18" fill="#FF9E66" />
      <circle cx="47.5" cy="47.5" r="16.5" fill="#EA581A" />
    </svg>
  );
}

export function TransmuteWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      {/* Light mode: pixel-faithful geometric mark + crisp charcoal wordmark */}
      <div className="flex items-center gap-2.5 dark:hidden">
        <TransmuteMark size={30} />
        <span className="text-[19px] font-semibold tracking-[-0.03em] text-zinc-900 leading-none">
          Transmute
        </span>
      </div>
      {/* Dark mode: exact uploaded dark brand lockup */}
      <img
        src={transmuteLogoDark}
        alt="Transmute"
        className="hidden dark:block h-8 w-auto object-contain select-none -ml-1"
      />
    </div>
  );
}
