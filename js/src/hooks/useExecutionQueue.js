// js/src/hooks/useExecutionQueue.js
import { useCallback, useEffect, useRef, useState } from 'react';
import { queuePrompt } from '../api';
import { injectFormValues } from '../utils/workflowGraph';
import { saveFormState } from '../utils/storage';

/**
 * Handles:
 * - WebSocket connection to /ws for progress / status
 * - Graph injection before queueing
 * - Progress + status state
 *
 * Params:
 *  - selectedWorkflow: string | null
 *  - workflowData: raw workflow graph from backend
 *  - dynamicInputs: CozyGen* input nodes
 *  - imageInputs: CozyGenImageInput nodes
 *  - formData: current UI state
 *  - setFormData: React setter from useState / useWorkflowForm
 */
export function useExecutionQueue({
  selectedWorkflow,
  workflowData,
  dynamicInputs,
  imageInputs,
  formData,
  setFormData,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveJob, setHasActiveJob] = useState(false);

  const [progressValue, setProgressValue] = useState(0);
  const [progressMax, setProgressMax] = useState(0);
  const [statusText, setStatusText] = useState('Idle');
  const [statusPhase, setStatusPhase] = useState('idle'); // 'idle' | 'queued' | 'running' | 'finished' | 'error'

  const websocketRef = useRef(null);
  const workflowDataRef = useRef(workflowData);

  // Refs for heuristic + idle reset
  const hasActiveJobRef = useRef(false);
  const progressValueRef = useRef(0);
  const progressMaxRef = useRef(0);
  const statusPhaseRef = useRef('idle');
  const finishTimerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // keep refs in sync
  useEffect(() => {
    workflowDataRef.current = workflowData;
  }, [workflowData]);

  useEffect(() => {
    hasActiveJobRef.current = hasActiveJob;
  }, [hasActiveJob]);

  useEffect(() => {
    progressValueRef.current = progressValue;
  }, [progressValue]);

  useEffect(() => {
    progressMaxRef.current = progressMax;
  }, [progressMax]);

  useEffect(() => {
    statusPhaseRef.current = statusPhase;
  }, [statusPhase]);

  const clearFinishTimer = () => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const scheduleIdleReset = () => {
    clearIdleTimer();
    // drift back to Idle a bit after finish / error, if nothing new has started
    idleTimerRef.current = setTimeout(() => {
      if (!hasActiveJobRef.current) {
        setStatusPhase('idle');
        setStatusText('Idle');
        setProgressValue(0);
        setProgressMax(0);
      }
    }, 8000);
  };

  const markFinished = useCallback(() => {
    clearFinishTimer();
    setIsLoading(false);
    setHasActiveJob(false);
    setProgressValue(0);
    setProgressMax(0);
    setStatusText('Finished');
    setStatusPhase('finished');
    scheduleIdleReset();
  }, []);

  const markError = useCallback((msg = 'Error') => {
    clearFinishTimer();
    setIsLoading(false);
    setHasActiveJob(false);
    setStatusText(msg);
    setStatusPhase('error');
    scheduleIdleReset();
  }, []);

  // Heuristic: if progress reaches 100% and nothing says "error", mark finished
  useEffect(() => {
    clearFinishTimer();

    if (
      !hasActiveJob ||
      !progressMax ||
      progressMax <= 0 ||
      progressValue < progressMax
    ) {
      return;
    }

    // Delay a bit in case final WS messages are still coming in
    finishTimerRef.current = setTimeout(() => {
      const stillActive = hasActiveJobRef.current;
      const v = progressValueRef.current;
      const max = progressMaxRef.current;
      const phase = statusPhaseRef.current;

      if (
        stillActive &&
        max > 0 &&
        v >= max &&
        phase !== 'finished' &&
        phase !== 'error'
      ) {
        // We never saw an explicit "done" event but the bar reached max.
        markFinished();
      }
    }, 800);
  }, [hasActiveJob, progressValue, progressMax, markFinished]);

  // WebSocket setup for progress + status
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      const wsUrl = `${protocol}://${host}/ws`;

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        const type = msg.type;

        // Custom CozyGen hook if ever emitted by backend
        if (type === 'cozygen_batch_ready') {
          markFinished();
          return;
        }

        // Common ComfyUI-style events

        if (type === 'execution_success' || type === 'execution_finished') {
          if (hasActiveJobRef.current) {
            markFinished();
          }
          return;
        }

        if (type === 'execution_error' || type === 'execution_interrupted') {
          markError('Execution error');
          return;
        }

        if (type === 'status') {
          // Some builds send queue info under various shapes
          const d = msg.data || {};
          const s = d.status || d;
          const execInfo =
            s.exec_info ||
            d.exec_info ||
            s;

          if (execInfo && hasActiveJobRef.current) {
            const remaining =
              execInfo.queue_remaining ??
              execInfo.queue_pending ??
              execInfo.queue_remaining_items ??
              0;
            const running =
              execInfo.queue_running ??
              execInfo.running ??
              0;

            if (running === 0 && remaining === 0) {
              markFinished();
            }
          }
          return;
        }

        if (type === 'executing') {
          clearIdleTimer();
          setStatusPhase('running');
          const nodeId = msg.data?.node;
          const wf = workflowDataRef.current;
          if (nodeId && wf && wf[nodeId]) {
            const node = wf[nodeId];
            const nodeName = node.title || node.class_type || 'Node';
            setStatusText(`Executing: ${nodeName}`);
          } else {
            setStatusText('Executing…');
          }
          return;
        }

        if (type === 'progress') {
          // Standard ComfyUI progress event
          setProgressValue(msg.data?.value ?? 0);
          setProgressMax(msg.data?.max ?? 0);
          return;
        }

        // ignore everything else
      };

      ws.onclose = () => {
        // simple reconnect; no backoff for now
        setTimeout(connectWebSocket, 1000);
      };
    };

    connectWebSocket();

    return () => {
      clearFinishTimer();
      clearIdleTimer();
      if (websocketRef.current) {
        websocketRef.current.onclose = null;
        websocketRef.current.close();
      }
    };
  }, [markError, markFinished]);

  const handleGenerate = useCallback(async () => {
    if (!workflowData) return;

    clearFinishTimer();
    clearIdleTimer();
    setIsLoading(true);
    setHasActiveJob(true);
    setStatusText('Queuing prompt…');
    setStatusPhase('queued');
    setProgressValue(0);
    setProgressMax(0);

    try {
      // Inject form values into a fresh workflow copy
      const { workflow: finalWorkflow, formData: updatedForm } =
        injectFormValues(
          workflowData,
          dynamicInputs || [],
          formData || {}
        );

      // Persist updated form data (so randomization is reflected in UI / storage)
      if (selectedWorkflow) {
        saveFormState(selectedWorkflow, updatedForm);
      }
      setFormData(updatedForm);

      // Ensure image filenames / inputs are set
      const imgs = imageInputs || [];
      for (const imgNode of imgs) {
        if (!imgNode || !imgNode.id || !imgNode.inputs) continue;
        const paramName = imgNode.inputs.param_name;
        if (!paramName) continue;

        const filename = updatedForm[paramName];
        if (!filename) {
          alert(
            `Please upload or select an image for "${paramName}" before generating.`
          );
          markError('Missing image input');
          return;
        }

        if (finalWorkflow[imgNode.id] && finalWorkflow[imgNode.id].inputs) {
          finalWorkflow[imgNode.id].inputs.image_filename = filename;
        }
      }

      // Queue prompt
      await queuePrompt({ prompt: finalWorkflow });
      // From here on, WebSocket + heuristic drive progress/status
    } catch (err) {
      console.error('Failed to queue prompt', err);
      markError('Error queuing prompt');
    }
  }, [
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    selectedWorkflow,
    setFormData,
    markError,
  ]);

  return {
    isLoading,
    progressValue,
    progressMax,
    statusText,
    statusPhase,
    handleGenerate,
  };
}
