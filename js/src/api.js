import { authHeaders } from './utils/auth';

const handleResponse = async (url, res) => {
  if (res.status === 401) {
    const err = new Error('unauthorized');
    err.unauthorized = true;
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`${url} failed`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
};

const jget = async (url) => {
  const res = await fetch(url, { headers: { ...authHeaders() } });
  return handleResponse(url, res);
};
const jpost = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse(url, res);
};
const jdel = async (url) => {
  const res = await fetch(url, { method: 'DELETE', headers: { ...authHeaders() } });
  return handleResponse(url, res);
};

export async function getWorkflows() {
  return jget('/cozygen/workflows');
}
export async function getWorkflow(filename) {
  return jget(`/cozygen/workflows/${encodeURIComponent(filename)}`);
}
export async function getChoices(type) {
  return jget(`/cozygen/get_choices?type=${encodeURIComponent(type)}`);
}
export async function queuePrompt(body) {
  const res = await fetch('/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse('/prompt', res);
}
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/cozygen/upload_image', { method: 'POST', headers: { ...authHeaders() }, body: fd });
  return handleResponse('/cozygen/upload_image', res);
}

/* ---- Gallery API (moved) ---- */
export async function getGallery(subfolder = '', page = 1, perPage = 50, showHidden = false) {
  const qs = new URLSearchParams({
    subfolder, page: String(page), per_page: String(perPage),
    show_hidden: showHidden ? '1' : '0'
  });
  return jget(`/cozygen/api/gallery?${qs.toString()}`);
}

function emitPresetChange(workflow) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  try {
    window.dispatchEvent(
      new CustomEvent('cozygen:preset-changed', {
        detail: { workflow: workflow || 'default' },
      })
    );
  } catch (err) {
    console.warn('Failed to emit preset change event', err);
  }
}

/* ---- Presets API ---- */
export async function listPresets(workflow) {
  return jget(`/cozygen/api/presets?workflow=${encodeURIComponent(workflow || 'default')}`);
}
export async function savePreset(workflow, name, values, meta) {
  const body = { name, values };
  if (typeof meta !== 'undefined') {
    body.meta = meta;
  }
  const result = await jpost(`/cozygen/api/presets?workflow=${encodeURIComponent(workflow || 'default')}`, body);
  emitPresetChange(workflow);
  return result;
}
export async function deletePreset(workflow, name) {
  const qs = new URLSearchParams({ workflow: workflow || 'default', name });
  const result = await jdel(`/cozygen/api/presets?${qs.toString()}`);
  emitPresetChange(workflow);
  return result;
}

/* ---- Prompt aliases ---- */
export async function getPromptAliases() {
  return jget('/cozygen/api/aliases');
}

export async function savePromptAliases(aliases) {
  return jpost('/cozygen/api/aliases', aliases || {});
}

/* ---- Workflow metadata ---- */
export async function getWorkflowTypes() {
  return jget('/cozygen/api/workflow_types');
}

export async function saveWorkflowType(workflow, mode) {
  return jpost('/cozygen/api/workflow_types', { workflow, mode });
}

/* ---- LoRA Library ---- */
export async function listLoraLibrary() {
  return jget('/cozygen/api/lora_library');
}

export async function saveLoraCard(id, data) {
  return jpost('/cozygen/api/lora_library', { id, data });
}

export async function deleteLoraCard(id) {
  return jdel(`/cozygen/api/lora_library/${encodeURIComponent(id)}`);
}

/* ---- Auth ---- */
export async function login(username, password) {
  return jpost('/cozygen/api/login', { username, password });
}

export async function authStatus() {
  return jget('/cozygen/api/auth_status');
}
