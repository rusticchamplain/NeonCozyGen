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
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Saved Prompts</h2>
        <p className="small-muted">
          Store frequently used prompts for quick reuse. These are shared for
          all CozyGen users on this server.
        </p>
      </div>

      <form onSubmit={addOrUpdate} className="mb-4 grid grid-cols-1 gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full px-3 py-2 rounded-md bg-base-300 border border-base-300 focus:outline-none"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Prompt text"
          rows={4}
          className="w-full px-3 py-2 rounded-md bg-base-300 border border-base-300 focus:outline-none"
        />
        <div className="flex space-x-2">
          <button
            className="btn-modern bg-accent text-white px-4 py-2 rounded-full"
            type="submit"
          >
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
              className="btn-modern px-4 py-2 rounded-full border"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {prompts.length === 0 && (
          <div className="small-muted">No saved prompts yet.</div>
        )}

        {prompts.map((p) => (
          <div key={p.id} className="card flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="small-muted text-sm break-words">
                  {p.text.slice(0, 200)}
                  {p.text.length > 200 ? '...' : ''}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => copyPrompt(p)}
                  className="btn-modern px-3 py-1 rounded-full border small-muted"
                >
                  Copy
                </button>
                <button
                  onClick={() => usePrompt(p)}
                  className="btn-modern px-3 py-1 rounded-full bg-accent text-white"
                >
                  Use
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center">
              <div className="text-xs small-muted">ID: {p.id}</div>
              <div className="space-x-2">
                <button
                  onClick={() => editPrompt(p)}
                  className="btn-modern px-3 py-1 rounded-full border small-muted"
                >
                  Edit
                </button>
                <button
                  onClick={() => removePrompt(p.id)}
                  className="btn-modern px-3 py-1 rounded-full border small-muted"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

