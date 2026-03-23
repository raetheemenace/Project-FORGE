import { motion } from 'framer-motion';

/**
 * Time-remaining progress bar for high-demand equipment display.
 *
 * Props:
 *   percent   {number}  - 0–100, how much of the slot has elapsed
 *   animated  {boolean} - Animate fill on mount (default true)
 *   height    {string}  - Tailwind height class (default 'h-1.5')
 *   className {string}  - Extra wrapper classes
 */
export default function ProgressBar({ percent = 0, animated = true, height = 'h-1.5', className = '' }) {
  const clamped = Math.min(100, Math.max(0, percent));

  // Color shifts from blue → amber → red as time runs out
  const fillColor =
    clamped < 50
      ? 'from-[#0B4EA2] to-[#001254]'
      : clamped < 80
      ? 'from-amber-400 to-amber-600'
      : 'from-red-400 to-red-600';

  return (
    <div
      className={`w-full ${height} bg-[#001254]/5 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {animated ? (
        <motion.div
          className={`h-full bg-gradient-to-r ${fillColor} rounded-full`}
          initial={{ width: '0%' }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ) : (
        <div
          className={`h-full bg-gradient-to-r ${fillColor} rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
