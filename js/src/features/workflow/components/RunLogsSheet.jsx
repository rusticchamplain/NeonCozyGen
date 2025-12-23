import { useMemo } from 'react';
import BottomSheet from '../../../ui/primitives/BottomSheet';
import Button from '../../../ui/primitives/Button';

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
          <Button
            variant="muted"
            className="w-full"
            onClick={() => {
              try {
                navigator.clipboard?.writeText?.(textDump || '');
              } catch {
                // ignore
              }
            }}
          >
            Copy
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClear}
          >
            Clear
          </Button>
          <Button
            variant="primary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
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
