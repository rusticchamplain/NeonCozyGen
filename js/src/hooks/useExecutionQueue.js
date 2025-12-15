// js/src/hooks/useExecutionQueue.js
import { useCallback, useEffect, useRef, useState } from 'react';

import { queuePrompt } from '../api';
import { getToken } from '../utils/auth';
import { saveLastRenderPayload } from '../utils/globalRender';
import { applyAliasesToForm, applyPromptAliases } from '../utils/promptAliases';
import { saveFormState } from '../utils/storage';
import { injectFormValues } from '../utils/workflowGraph';

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
  promptAliases = null,
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

  const emitFinished = () => {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    try {
      window.dispatchEvent(new CustomEvent('cozygen:queue-finished'));
    } catch {
      // ignore
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
    emitFinished();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markError = useCallback((msg = 'Error') => {
    clearFinishTimer();
    setIsLoading(false);
    setHasActiveJob(false);
    setStatusText(msg);
    setStatusPhase('error');
    scheduleIdleReset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const token = getToken();
      const wsUrl = `${protocol}://${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;

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

  const handleGenerate = useCallback(async (options = {}) => {
    if (!workflowData) return;

    const {
      overrides = null,
      persistFormState = true,
    } = options || {};

    clearFinishTimer();
    clearIdleTimer();
    setIsLoading(true);
    setHasActiveJob(true);
    setStatusText('Queuing prompt…');
    setStatusPhase('queued');
    setProgressValue(0);
    setProgressMax(0);

    // Prepare workflow outside try block so it's accessible in catch for debugging
    const baseForm = formData || {};
    const effectiveFormData = overrides
      ? { ...baseForm, ...(overrides || {}) }
      : baseForm;
    const aliasExpandedForm = applyAliasesToForm(
      effectiveFormData,
      promptAliases || {}
    );

    const { workflow: finalWorkflow, formData: updatedForm } =
      injectFormValues(
        workflowData,
        dynamicInputs || [],
        aliasExpandedForm || {}
      );

    // Keep persisted UI state using the user's raw input (aliases intact) while
    // still preserving defaults resolved by injectFormValues.
    const persistedFormData = { ...updatedForm, ...effectiveFormData };

    // Persist updated form data (so randomization is reflected in UI / storage)
    if (persistFormState && selectedWorkflow) {
      saveFormState(selectedWorkflow, persistedFormData);
    }
    if (persistFormState) {
      setFormData(persistedFormData);
    }

    // Ensure image filenames / inputs are set
    const imgs = imageInputs || [];
    for (const imgNode of imgs) {
      if (!imgNode || !imgNode.id || !imgNode.inputs) continue;
      const paramName = imgNode.inputs.param_name;
      if (!paramName) continue;

      const filename = persistedFormData[paramName];
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

    try {
      // Queue prompt
      let expandedWorkflow = finalWorkflow;
      if (promptAliases) {
        const expandValue = (val) => {
          if (typeof val === 'string') return applyPromptAliases(val, promptAliases);
          if (Array.isArray(val)) return val.map((item) => expandValue(item));
          if (val && typeof val === 'object') {
            const next = Array.isArray(val) ? [] : {};
            Object.entries(val).forEach(([k, v]) => {
              next[k] = expandValue(v);
            });
            return next;
          }
          return val;
        };
        try {
          expandedWorkflow = expandValue(finalWorkflow);
        } catch {
          expandedWorkflow = finalWorkflow;
        }
      }

      // Save the expanded workflow so it can be re-queued from Gallery or other pages
      saveLastRenderPayload({
        workflowName: selectedWorkflow,
        workflow: expandedWorkflow,
        timestamp: Date.now(),
      });

      await queuePrompt({ prompt: expandedWorkflow });
      // From here on, WebSocket + heuristic drive progress/status
    } catch (err) {
      console.error('Failed to queue prompt', err);
      if (err?.unauthorized) {
        markError('Session expired. Please sign in again.');
        window.location.hash = '#/login';
      } else {
        markError('Error queuing prompt');
      }
    }
  }, [
    workflowData,
    dynamicInputs,
    imageInputs,
    formData,
    promptAliases,
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
