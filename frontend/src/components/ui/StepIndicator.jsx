// Dot-based step progress indicator
const StepIndicator = ({ current, total }) => (
  <div className="flex items-center gap-1.5">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i + 1 === current
            ? 'w-5 h-2 bg-orange-500'
            : i + 1 < current
            ? 'w-2 h-2 bg-orange-500/60'
            : 'w-2 h-2 bg-zinc-600'
        }`}
      />
    ))}
  </div>
);

export default StepIndicator;
