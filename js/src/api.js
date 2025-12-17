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

const jget = async (url, options = {}) => {
  const { signal } = options;
  const res = await fetch(url, {
    headers: { ...authHeaders() },
    signal,
  });
  return handleResponse(url, res);
};
const jpost = async (url, body, options = {}) => {
  const { signal } = options;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    credentials: 'include',
    signal,
  });
  return handleResponse(url, res);
};
const jdel = async (url, options = {}) => {
  const { signal } = options;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...authHeaders() },
    credentials: 'include',
    signal,
  });
  return handleResponse(url, res);
};

export async function getWorkflows(options = {}) {
  return jget('/cozygen/workflows', options);
}
export async function getWorkflow(filename, options = {}) {
  return jget(`/cozygen/workflows/${encodeURIComponent(filename)}`, options);
}
export async function getChoices(type, options = {}) {
  return jget(`/cozygen/get_choices?type=${encodeURIComponent(type)}`, options);
}
export async function queuePrompt(body) {
  const res = await fetch('/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handleResponse('/prompt', res);
}
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/cozygen/upload_image', {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd,
    credentials: 'include',
  });
  return handleResponse('/cozygen/upload_image', res);
}

/* ---- Gallery API (moved) ---- */
export async function getGallery(
  subfolder = '',
  page = 1,
  perPage = 50,
  showHidden = false,
  recursive = false,
  kind = 'all',
  cacheBust = '',
  options = {}
) {
  const qs = new URLSearchParams({
    subfolder, page: String(page), per_page: String(perPage),
    show_hidden: showHidden ? '1' : '0',
    recursive: recursive ? '1' : '0',
    kind,
  });
  if (cacheBust) {
    qs.set('cache_bust', String(cacheBust));
  }
  return jget(`/cozygen/api/gallery?${qs.toString()}`, options);
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
export async function listPresets(workflow, options = {}) {
  return jget(`/cozygen/api/presets?workflow=${encodeURIComponent(workflow || 'default')}`, options);
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
  return fetch('/cozygen/api/auth_status', { headers: { ...authHeaders() }, credentials: 'include' }).then((res) =>
    handleResponse('/cozygen/api/auth_status', res)
  );
}
