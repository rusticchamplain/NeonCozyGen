import { useMemo } from 'react';
import BottomSheet from '../../../ui/primitives/BottomSheet';

function formatTs(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export default function RunLogsSheet({
  open,
  onClose,
  logs = [],
  onClear,
}) {
  const textDump = useMemo(() => {
    return (logs || [])
      .map((l) => `[${formatTs(l.ts)}] ${String(l.level || 'info').toUpperCase()} ${l.message}`)
      .join('\n');
  }, [logs]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Run logs"
      footer={(
        <div className="flex gap-2">
          <button
            type="button"
            className="ui-button is-muted w-full"
            onClick={() => {
              try {
                navigator.clipboard?.writeText?.(textDump || '');
              } catch {
                // ignore
              }
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className="ui-button is-ghost w-full"
            onClick={onClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="ui-button is-primary w-full"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      )}
    >
      <pre className="runlog-pre">
        {logs?.length
          ? logs.map((l, idx) => (
              <div key={`${l.ts}-${idx}`} className={`runlog-line is-${l.level || 'info'}`}>
                <span className="runlog-ts">{formatTs(l.ts)}</span>
                <span className="runlog-msg">{l.message}</span>
              </div>
            ))
          : 'No logs yet.'}
      </pre>
    </BottomSheet>
  );
}
