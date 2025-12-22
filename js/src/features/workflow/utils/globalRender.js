// js/src/utils/globalRender.js
// Global render service for re-queueing prompts from any page

import { queuePrompt } from '../../../services/api';

const STORAGE_KEY = 'cozygen_last_render_payload';

/**
 * Store the last render payload so it can be re-queued from any page.
 * Called by WorkflowControlsPage after successful render preparation.
 */
export function saveLastRenderPayload(payload) {
  if (!payload) return;
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

/**
 * Get the last stored render payload.
 */
export function getLastRenderPayload() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Re-queue the last render payload directly.
 * Returns { success: true } or { success: false, error: string }
 */
export async function requeueLastRender() {
  const payload = getLastRenderPayload();
  if (!payload || !payload.workflow) {
    return { success: false, error: 'No previous render to repeat' };
  }

  try {
    // Emit render state as active
    window.dispatchEvent(
      new CustomEvent('cozygen:render-state', { detail: { active: true } })
    );

    await queuePrompt({ prompt: payload.workflow });

    // From non-Studio pages we may not have a websocket listener to know when the
    // prompt actually finishes. Treat this event as "queued" feedback and reset.
    window.dispatchEvent(
      new CustomEvent('cozygen:render-state', { detail: { active: false } })
    );

    return { success: true };
  } catch (err) {
    console.error('Failed to requeue prompt', err);

    window.dispatchEvent(
      new CustomEvent('cozygen:render-state', { detail: { active: false } })
    );

    if (err?.unauthorized) {
      window.location.hash = '#/login';
      return { success: false, error: 'Session expired' };
    }
    return { success: false, error: 'Failed to queue prompt' };
  }
}

/**
 * Check if we have a stored render payload available.
 */
export function hasLastRenderPayload() {
  const payload = getLastRenderPayload();
  return !!(payload && payload.workflow);
}
