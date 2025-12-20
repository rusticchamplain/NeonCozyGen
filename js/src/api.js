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
    credentials: 'include',
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

/* ---- Prompt aliases ---- */
export async function getPromptAliases() {
  return jget('/cozygen/api/aliases');
}

export async function savePromptAliases(aliases) {
  return jpost('/cozygen/api/aliases', aliases || {});
}

/* ---- Danbooru tag reference ---- */
export async function getDanbooruTagCategories(options = {}) {
  return jget('/cozygen/api/tags/categories', options);
}

export async function searchDanbooruTags(
  { q = '', category = '', sort = 'count', limit = 80, offset = 0 } = {},
  options = {}
) {
  const qs = new URLSearchParams({
    q: String(q || ''),
    category: String(category || ''),
    sort: String(sort || 'count'),
    limit: String(limit || 80),
    offset: String(offset || 0),
  });
  return jget(`/cozygen/api/tags/search?${qs.toString()}`, options);
}

export async function validateDanbooruTags(tags = [], options = {}) {
  return jpost('/cozygen/api/tags/validate', { tags: Array.isArray(tags) ? tags : [] }, options);
}

/* ---- Workflow metadata ---- */
export async function getWorkflowTypes() {
  return jget('/cozygen/api/workflow_types');
}

export async function saveWorkflowType(workflow, mode) {
  return jpost('/cozygen/api/workflow_types', { workflow, mode });
}

/* ---- Workflow presets ---- */
export async function getWorkflowPresets(workflow, options = {}) {
  const qs = new URLSearchParams();
  if (workflow) qs.set('workflow', workflow);
  return jget(`/cozygen/api/workflow_presets?${qs.toString()}`, options);
}

export async function saveWorkflowPreset(workflow, preset, options = {}) {
  return jpost('/cozygen/api/workflow_presets', { workflow, preset }, options);
}

export async function deleteWorkflowPreset(workflow, presetId, options = {}) {
  return jpost('/cozygen/api/workflow_presets', { workflow, delete: presetId }, options);
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
