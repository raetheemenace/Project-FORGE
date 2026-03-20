const STATUS_STYLES = {
  ACTIVE:          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  PENDING_RETURN:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  CLAIM_ID:        'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  RETURNED:        'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  IN_SESSION:      'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  AVAILABLE:       'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  MAINTENANCE:     'bg-red-500/20 text-red-400 border border-red-500/30',
  OPEN:            'bg-red-500/20 text-red-400 border border-red-500/30',
  IN_PROGRESS:     'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  RESOLVED:        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  CLOSED:          'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
};

const Badge = ({ status, label }) => {
  const style = STATUS_STYLES[status] || 'bg-zinc-700 text-zinc-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${style}`}>
      {label || status?.replace('_', ' ')}
    </span>
  );
};

export default Badge;
