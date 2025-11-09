// js/src/components/BottomBar.jsx
import React from 'react';

function getPercent(progressValue, progressMax) {
  if (!progressMax || progressMax <= 0) return null;
  const v = Number(progressValue) || 0;
  const max = Number(progressMax) || 0;
  const pct = Math.round((v / max) * 100);
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, Math.min(100, pct));
}

export default function BottomBar({
  busy = false,
  progressValue = 0,
  progressMax = 0,
  statusText = 'Idle',
  statusPhase = 'idle',
  primaryLabel = 'Render',
  onPrimary,
}) {
  const pct = getPercent(progressValue, progressMax);

  let phaseDotClass = 'bg-[#3D4270]';
  if (statusPhase === 'queued') phaseDotClass = 'bg-[#FF60D0]';
  else if (statusPhase === 'running') phaseDotClass = 'bg-[#3EF0FF]';
  else if (statusPhase === 'finished') phaseDotClass = 'bg-[#5CFF9A]';
  else if (statusPhase === 'error') phaseDotClass = 'bg-[#FF4F88]';

  const phaseLabelMap = {
    idle: 'Idle',
    queued: 'Queued',
    running: 'Running',
    finished: 'Finished',
    error: 'Error',
  };
  const phaseLabel = phaseLabelMap[statusPhase] || 'Status';

  const dotExtraClass =
    statusPhase === 'running' ? 'animate-pulse' : '';

  return (
    <div className="mt-4 sm:mt-6 pb-4">
      {/* main button */}
      <button
        type="button"
        onClick={onPrimary}
        disabled={busy}
        className={`w-full rounded-full px-6 py-3 text-sm sm:text-base font-semibold tracking-[0.25em] uppercase
          bg-[linear-gradient(90deg,#FF60D0,#3EF0FF)]
          text-[#050716]
          shadow-[0_0_35px_rgba(255,96,208,0.45)]
          transition-transform
          disabled:opacity-60 disabled:cursor-not-allowed
          active:translate-y-[1px]`}
      >
        {busy ? 'Rendering…' : primaryLabel}
      </button>

      {/* status row */}
      <div className="mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-[#9DA3FFCC]">
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.35)] ${phaseDotClass} ${dotExtraClass}`}
          />
          <span className="tracking-[0.25em] uppercase">{phaseLabel}</span>
        </span>
        <span className="flex items-center gap-2">
          {pct != null && busy && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-10 rounded-full bg-[#1B1F3A] overflow-hidden">
                <span
                  className="block h-full bg-[#3EF0FF]"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span>{pct}%</span>
            </span>
          )}
          <span className="truncate max-w-[9rem] text-right">
            {statusText || (busy ? 'Working…' : 'Idle')}
          </span>
        </span>
      </div>
    </div>
  );
}
