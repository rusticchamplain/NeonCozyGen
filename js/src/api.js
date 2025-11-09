const jget = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed`);
  return res.json();
};
const jpost = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${url} failed`);
  return res.json();
};
const jdel = async (url) => {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${url} failed`);
  return res.json();
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
  const res = await fetch('/prompt', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error('queue failed');
  return res.json();
}
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch('/cozygen/upload_image', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  return res.json();
}

/* ---- Gallery API (moved) ---- */
export async function getGallery(subfolder = '', page = 1, perPage = 50, showHidden = false) {
  const qs = new URLSearchParams({
    subfolder, page: String(page), per_page: String(perPage),
    show_hidden: showHidden ? '1' : '0'
  });
  return jget(`/cozygen/api/gallery?${qs.toString()}`);
}

/* ---- Presets API ---- */
export async function listPresets(workflow) {
  return jget(`/cozygen/api/presets?workflow=${encodeURIComponent(workflow || 'default')}`);
}
export async function savePreset(workflow, name, values) {
  return jpost(`/cozygen/api/presets?workflow=${encodeURIComponent(workflow || 'default')}`, { name, values });
}
export async function deletePreset(workflow, name) {
  const qs = new URLSearchParams({ workflow: workflow || 'default', name });
  return jdel(`/cozygen/api/presets?${qs.toString()}`);
}
