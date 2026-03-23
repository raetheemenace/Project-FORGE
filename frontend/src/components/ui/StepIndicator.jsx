/**
 * Dot-based step progress indicator for the Borrow an Item flow.
 *
 * Props:
 *   current {number} - The current step (1-indexed)
 *   total   {number} - Total number of steps
 */
export default function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'w-6 h-2 bg-[#0B4EA2]'
              : i + 1 < current
              ? 'w-2 h-2 bg-[#0B4EA2]/40'
              : 'w-2 h-2 bg-[#001254]/15'
          }`}
        />
      ))}
    </div>
  );
}
