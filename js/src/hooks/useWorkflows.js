// js/src/hooks/useWorkflows.js
import { useEffect, useState, useCallback } from 'react';
import { getWorkflows } from '../api';

/**
 * Manages:
 * - Fetching the list of workflows
 * - Remembering the selected workflow in localStorage
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

        const stored = localStorage.getItem('selectedWorkflow');
        if (stored && list.includes(stored)) {
          setSelectedWorkflow(stored);
        } else if (list.length > 0) {
          setSelectedWorkflow(list[0]);
          localStorage.setItem('selectedWorkflow', list[0]);
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
      localStorage.setItem('selectedWorkflow', workflowName);
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
