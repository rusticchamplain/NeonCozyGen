import React, { useState, useEffect } from "react";

// Server-backed versions of load/save
async function apiLoadAliases() {
  const res = await fetch("/cozygen/api/aliases");
  if (!res.ok) return {};
  const data = await res.json();
  // expected shape: { paramName: { actualValue: "Label", ... }, ... }
  return data || {};
}

async function apiSaveAliases(obj) {
  await fetch("/cozygen/api/aliases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj || {}),
  });
}

export default function AliasManager() {
  const [aliases, setAliases] = useState({});
  const [param, setParam] = useState("");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [jsonEditor, setJsonEditor] = useState("");

  // initial load from server
  useEffect(() => {
    apiLoadAliases()
      .then((a) => {
        setAliases(a);
        setJsonEditor(JSON.stringify(a, null, 2));
      })
      .catch(() => {
        setAliases({});
        setJsonEditor("{}");
      });
  }, []);

  async function persistAndSync(nextAliases) {
    setAliases(nextAliases);
    setJsonEditor(JSON.stringify(nextAliases, null, 2));
    await apiSaveAliases(nextAliases);
  }

  async function addAlias(e) {
    e.preventDefault();
    if (!param || !value) return;

    const copy = { ...aliases };
    if (!copy[param]) copy[param] = {};
    copy[param][value] = label || value;

    await persistAndSync(copy);

    setParam("");
    setValue("");
    setLabel("");
  }

  async function removeAlias(p, v) {
    if (!confirm("Delete alias?")) return;
    const copy = { ...aliases };
    if (copy[p] && copy[p][v]) {
        delete copy[p][v];
        if (Object.keys(copy[p]).length === 0) {
          delete copy[p];
        }
    }
    await persistAndSync(copy);
  }

  async function saveJson() {
    try {
      const parsed = JSON.parse(jsonEditor || "{}");
      await persistAndSync(parsed);
      alert("Aliases saved");
    } catch (e) {
      alert("Invalid JSON");
    }
  }

  function copyToClipboard(t) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).catch(() => {});
    } else {
      prompt("Copy", t);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Alias Manager</h2>
      <p className="small-muted mb-4">
        Map human-friendly labels to actual filenames per parameter. These
        aliases are shared for all CozyGen users on this server.
      </p>

      <form
        onSubmit={addAlias}
        className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2"
      >
        <input
          placeholder="param name (e.g. model_file)"
          value={param}
          onChange={(e) => setParam(e.target.value)}
          className="px-3 py-2 rounded-md bg-base-300 border"
        />
        <input
          placeholder="actual value (filename)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="px-3 py-2 rounded-md bg-base-300 border"
        />
        <input
          placeholder="label (human readable)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="px-3 py-2 rounded-md bg-base-300 border"
        />
        <div className="sm:col-span-3">
          <button
            className="btn-modern bg-accent text-white px-4 py-2 rounded-full"
            type="submit"
          >
            Add Alias
          </button>
          <button
            type="button"
            onClick={() => {
              setParam("");
              setValue("");
              setLabel("");
            }}
            className="btn-modern ml-2 px-4 py-2 rounded-full border"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mb-4">
        <h3 className="font-semibold">Current aliases</h3>
        {Object.keys(aliases).length === 0 && (
          <div className="small-muted">No aliases defined.</div>
        )}

        {Object.entries(aliases).map(([p, map]) => (
          <div key={p} className="card my-2">
            <div className="font-medium">{p}</div>
            <div className="mt-2">
              {Object.entries(map).map(([val, lab]) => (
                <div
                  key={val}
                  className="flex justify-between items-center py-1"
                >
                  <div>
                    <div className="text-sm">{lab}</div>
                    <div className="small-muted text-xs">{val}</div>
                  </div>
                  <div>
                    <button
                      onClick={() => copyToClipboard(val)}
                      className="btn-modern px-3 py-1 rounded-full border small-muted mr-2"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => removeAlias(p, val)}
                      className="btn-modern px-3 py-1 rounded-full border small-muted"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Edit raw JSON</h3>
        <textarea
          className="w-full h-48 p-2 rounded-md bg-base-300 border"
          value={jsonEditor}
          onChange={(e) => setJsonEditor(e.target.value)}
        />
        <div className="mt-2">
          <button
            onClick={saveJson}
            className="btn-modern bg-accent text-white px-4 py-2 rounded-full"
          >
            Save JSON
          </button>
        </div>
      </div>
    </div>
  );
}

