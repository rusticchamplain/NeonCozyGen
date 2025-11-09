const BASE_URL = '/cozygen';

// ---- gallery ----
export async function getGallery(subfolder = '', page = 1, perPage = 20) {
    const params = new URLSearchParams({ subfolder, page: String(page), per_page: String(perPage) });
    const res = await fetch(`${BASE_URL}/gallery?${params.toString()}`);
    if (!res.ok) throw new Error(`getGallery failed: ${res.status}`);
    return res.json();
}

export async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${BASE_URL}/upload_image`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`uploadImage failed: ${res.status}`);
    return res.json();
}

// ---- workflows ----
export async function getWorkflows() {
    const res = await fetch(`${BASE_URL}/workflows`);
    if (!res.ok) throw new Error(`getWorkflows failed: ${res.status}`);
    return res.json();
}

export async function getWorkflow(filename) {
    const res = await fetch(`${BASE_URL}/workflows/${encodeURIComponent(filename)}`);
    if (!res.ok) throw new Error(`getWorkflow failed: ${res.status}`);
    return res.json();
}

export async function queuePrompt(body) {
    // ComfyUI main server endpoint
    const res = await fetch('/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`queuePrompt failed: ${res.status}`);
    return res.json();
}

// ---- choices ----
export async function getChoices(type) {
    const res = await fetch(`${BASE_URL}/get_choices?type=${encodeURIComponent(type)}`);
    if (!res.ok) throw new Error(`getChoices failed: ${res.status}`);
    return res.json();
}

// ---- presets ----
export async function listPresets(workflow) {
    const res = await fetch(`${BASE_URL}/api/presets?workflow=${encodeURIComponent(workflow)}`);
    if (!res.ok) throw new Error('listPresets failed');
    return res.json(); // {version, items:{name: values}}
}

export async function savePreset(workflow, name, values) {
    const res = await fetch(`${BASE_URL}/api/presets?workflow=${encodeURIComponent(workflow)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, values }),
    });
    if (!res.ok) throw new Error('savePreset failed');
    return res.json();
}

export async function deletePreset(workflow, name) {
    const res = await fetch(`${BASE_URL}/api/presets?workflow=${encodeURIComponent(workflow)}&name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('deletePreset failed');
    return res.json();
}
