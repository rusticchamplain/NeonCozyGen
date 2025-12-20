// js/src/components/BottomBar.jsx

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
  primaryDisabled = false,
  onLogs,
  logsLabel = 'Logs',
}) {
  const pct = getPercent(progressValue, progressMax);

  const phaseDotColor = (() => {
    if (statusPhase === 'queued') return 'rgba(255, 143, 112, 0.95)';
    if (statusPhase === 'running') return 'rgba(68, 225, 197, 0.95)';
    if (statusPhase === 'finished') return 'rgba(92, 255, 154, 0.95)';
    if (statusPhase === 'error') return 'rgba(255, 143, 112, 0.95)';
    return 'rgba(159, 178, 215, 0.55)';
  })();

  const phaseLabelMap = {
    idle: 'Idle',
    queued: 'Queued',
    running: 'Running',
    finished: 'Finished',
    error: 'Error',
  };
  const phaseLabel = phaseLabelMap[statusPhase] || 'Status';

  const isDisabled = busy || primaryDisabled;

  return (
    <div className="dock-bar-inner">
      {/* main button */}
      <button
        type="button"
        onClick={onPrimary}
        disabled={isDisabled}
        className="dock-primary-btn"
      >
        {busy ? 'Rendering…' : primaryLabel}
      </button>

      {/* status row */}
      <div className="dock-status-row">
        <span className="dock-status-left">
          <span className="dock-status-dot" style={{ background: phaseDotColor }} />
          <span className="dock-status-label">{phaseLabel}</span>
        </span>
        <span className="dock-status-right">
          {pct != null && busy ? (
            <span className="dock-progress">
              <span className="dock-progress-bar" aria-hidden="true">
                <span className="dock-progress-fill" style={{ width: `${pct}%` }} />
              </span>
              <span>{pct}%</span>
            </span>
          ) : null}
          <span className="dock-status-text">
            {statusText || (busy ? 'Working…' : 'Idle')}
          </span>
          {onLogs ? (
            <button type="button" className="dock-logs-btn" onClick={onLogs}>
              {logsLabel}
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
