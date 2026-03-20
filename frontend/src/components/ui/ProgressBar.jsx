// Time-remaining progress bar
const ProgressBar = ({ value = 0, max = 100, color = 'orange' }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorMap = {
    orange: 'bg-orange-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };
  return (
    <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorMap[color] || 'bg-orange-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

export default ProgressBar;
