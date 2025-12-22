// js/src/hooks/useWorkflows.js
import { useCallback, useEffect, useState } from 'react';

import { getWorkflows } from '../../../services/api';

/**
 * Manages:
 * - Fetching the list of workflows
 * - Remembering the selected workflow for the current session
 *
 * Usage:
 *   const { workflows, selectedWorkflow, selectWorkflow, loading, error } = useWorkflows();
 */
export function useWorkflows() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load workflows list once
  useEffect(() => {
    let cancelled = false;

    async function loadWorkflows() {
      setLoading(true);
      setError(null);
      try {
        const data = await getWorkflows();
        if (cancelled) return;

        const list = data?.workflows || [];
        setWorkflows(list);

        let stored = null;
        try {
          stored = typeof window !== 'undefined' ? sessionStorage.getItem('selectedWorkflow') : null;
          // Session-only persistence: cleanup any legacy localStorage value.
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('selectedWorkflow');
            } catch {
              // ignore
            }
          }
        } catch {
          stored = null;
        }
        if (stored && list.includes(stored)) {
          setSelectedWorkflow(stored);
        } else if (list.length > 0) {
          setSelectedWorkflow(list[0]);
          try {
            if (typeof window !== 'undefined') sessionStorage.setItem('selectedWorkflow', list[0]);
          } catch {
            // ignore
          }
        } else {
          setSelectedWorkflow(null);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('Failed to load workflows', e);
        setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkflows();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectWorkflow = useCallback((workflowName) => {
    setSelectedWorkflow(workflowName);
    try {
      if (typeof window !== 'undefined') sessionStorage.setItem('selectedWorkflow', workflowName);
      // Session-only persistence: cleanup any legacy localStorage value.
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('selectedWorkflow');
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    workflows,
    selectedWorkflow,
    selectWorkflow,
    loading,
    error,
  };
}
