import React from 'react';

const STATUS_STYLES = {
  done: 'border-[#3EF0FF80] text-[#D5FBFF]',
  active: 'border-[#FF60D080] text-[#FFD7F3]',
  locked: 'border-[#2F3155] text-[#6C719C]',
};

export default function ProcessIndex({ steps = [] }) {
  if (!steps.length) return null;

  return (
    <div className="rounded-3xl border border-[#262B4D] bg-[#030515] p-3 sm:p-4 shadow-[0_15px_40px_rgba(5,7,22,0.7)]">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[#8B93FFCC]">
        <span>Generation Index</span>
        <span>{steps.length} steps</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const statusClass = STATUS_STYLES[step.status] || STATUS_STYLES.locked;
          const isDisabled = step.disabled;
          return (
            <div
              key={step.id || idx}
              className="rounded-2xl border border-[#1C1E36] bg-[#070A1C] px-3 py-3 shadow-[0_8px_22px_rgba(5,7,22,0.55)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7D82C5]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-[0.16em] ${statusClass}`}
                    >
                      {step.statusLabel || step.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-[#F0F4FF]">
                    {step.title}
                  </div>
                  {step.description && (
                    <p className="mt-0.5 text-[11px] text-[#9DA3FFCC]">
                      {step.description}
                    </p>
                  )}
                </div>
                {step.onJump && (
                  <button
                    type="button"
                    onClick={step.onJump}
                    disabled={isDisabled}
                    className={
                      'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ' +
                      (isDisabled
                        ? 'border-[#2F3155] text-[#4A4F75]'
                        : 'border-[#3EF0FF99] text-[#E5F8FF]')
                    }
                  >
                    Jump
                  </button>
                )}
              </div>
              {step.content && <div className="mt-3">{step.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
