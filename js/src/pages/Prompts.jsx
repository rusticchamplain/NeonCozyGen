import React, { useState, useEffect } from 'react';

// Server endpoints instead of localStorage
async function apiLoadPrompts() {
  const res = await fetch('/cozygen/api/prompts');
  if (!res.ok) return [];
  // We store prompts on disk as an object { id: {title,text}, ... } or as an array.
  // Your old code expects an array like [{id,title,text}, ...]
  // We'll normalize either shape.
  const data = await res.json();
  if (Array.isArray(data)) return data;
  // object form -> array
  return Object.entries(data).map(([id, p]) => ({
    id,
    title: p.title ?? p.title ?? ('Prompt ' + id),
    text: p.text ?? p,
  }));
}

async function apiSavePrompts(list) {
  // Save as an array of {id,title,text} to keep your semantics (edit by id, etc.)
  await fetch('/cozygen/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(list),
  });
}

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Initial load from server
  useEffect(() => {
    apiLoadPrompts()
      .then((serverPrompts) => {
        setPrompts(serverPrompts);
      })
      .catch((e) => {
        console.error('Failed to load prompts from server', e);
        setPrompts([]);
      });
  }, []);

  function addOrUpdate(e) {
    e.preventDefault();
    const now = Date.now().toString();

    if (!text.trim()) return;

    let updated;
    if (editingId) {
      // update existing
      updated = prompts.map((p) =>
        p.id === editingId
          ? {
              ...p,
              title: title || p.title,
              text,
            }
          : p
      );
    } else {
      // create new
      const item = {
        id: now,
        title: title || 'Prompt ' + (prompts.length + 1),
        text,
      };
      updated = [item, ...prompts];
    }

    setPrompts(updated);
    apiSavePrompts(updated);

    // reset form state
    setEditingId(null);
    setTitle('');
    setText('');
  }

  function editPrompt(p) {
    setEditingId(p.id);
    setTitle(p.title);
    setText(p.text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function removePrompt(id) {
    if (!confirm('Delete this prompt?')) return;
    const updated = prompts.filter((p) => p.id !== id);
    setPrompts(updated);
    apiSavePrompts(updated);
  }

  function copyPrompt(p) {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(p.text)
        .catch(() => alert('Copy failed'));
    } else {
      prompt('Copy the prompt', p.text);
    }
  }

  function usePrompt(p) {
    // Keep this UX exactly as you had it
    localStorage.setItem('cozygen_last_prompt', p.text);
    copyPrompt(p);
    alert('Prompt saved to clipboard and marked as last used.');
  }

  return (
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
        <div className="ui-section-text">
          <span className="ui-kicker">Prompts</span>
          <h1 className="ui-title">Saved snippets</h1>
          <p className="ui-hint">Shared server-wide for quick reuse.</p>
        </div>

        <form onSubmit={addOrUpdate} className="grid gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Prompt text"
            rows={4}
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          />
          <div className="flex flex-wrap gap-2">
            <button className="ui-button is-primary" type="submit">
              {editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setTitle('');
                  setText('');
                }}
                className="ui-button is-ghost"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="ui-panel space-y-3">
        <div className="ui-section-head">
          <div className="ui-section-text">
            <span className="ui-kicker">Library</span>
            <div className="ui-title">
              {prompts.length ? `${prompts.length} saved` : 'Nothing saved'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {prompts.length === 0 && (
            <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
              Add your first prompt above.
            </div>
          )}

          {prompts.map((p) => (
            <div key={p.id} className="ui-card space-y-3">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-semibold text-[#F8F4FF]">
                  {p.title}
                </div>
                <p className="ui-hint break-words">
                  {p.text.slice(0, 240)}
                  {p.text.length > 240 ? '…' : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6A6FA8]">
                <span>ID: {p.id}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyPrompt(p)}
                    className="ui-button is-muted is-compact"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => usePrompt(p)}
                    className="ui-button is-primary is-compact"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => editPrompt(p)}
                    className="ui-button is-ghost is-compact"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removePrompt(p.id)}
                    className="ui-button is-ghost is-compact"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
