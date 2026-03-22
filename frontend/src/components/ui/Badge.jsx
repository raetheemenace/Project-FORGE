import { Package, Loader2, CreditCard, CheckCircle2, Wrench } from 'lucide-react';

/**
 * Status badge component for transaction and room statuses.
 *
 * Supported status values:
 *   Transaction: ACTIVE | PENDING_RETURN | CLAIM_ID | RETURNED
 *   Room:        AVAILABLE | IN_SESSION | MAINTENANCE
 *   Condition:   Excellent | Good | Fair | Poor
 *
 * Props:
 *   status   {string}  - Status key (see above)
 *   size     {string}  - 'sm' | 'md' (default 'md')
 *   showIcon {boolean} - Whether to show the leading icon (default true)
 */

const STATUS_CONFIG = {
  // Transaction statuses
  ACTIVE: {
    label: 'ACTIVE',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    Icon: Package,
  },
  PENDING_RETURN: {
    label: 'PENDING RETURN',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    Icon: Loader2,
    spin: true,
  },
  CLAIM_ID: {
    label: 'CLAIM ID',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    Icon: CreditCard,
  },
  RETURNED: {
    label: 'RETURNED',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    Icon: CheckCircle2,
  },
  // Room statuses
  AVAILABLE: {
    label: 'AVAILABLE',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    Icon: CheckCircle2,
  },
  IN_SESSION: {
    label: 'IN SESSION',
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    Icon: Package,
  },
  MAINTENANCE: {
    label: 'MAINTENANCE',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    Icon: Wrench,
  },
  // Equipment condition
  Excellent: {
    label: 'Excellent',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    Icon: null,
  },
  Good: {
    label: 'Good',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    Icon: null,
  },
  Fair: {
    label: 'Fair',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    Icon: null,
  },
  Poor: {
    label: 'Poor',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    Icon: null,
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[0.6rem] gap-1',
  md: 'px-2.5 py-1 text-xs gap-1',
};

const ICON_SIZE = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
};

export default function Badge({ status, size = 'md', showIcon = true }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const { label, bg, text, border, Icon, spin } = config;
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  const iconClass = ICON_SIZE[size] ?? ICON_SIZE.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${bg} ${text} ${border} ${sizeClass}`}
    >
      {showIcon && Icon && (
        <Icon className={`${iconClass} ${spin ? 'animate-spin' : ''} flex-shrink-0`} />
      )}
      {label}
    </span>
  );
}
