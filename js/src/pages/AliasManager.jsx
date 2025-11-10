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
    <div className="page-shell page-stack">
      <section className="ui-panel space-y-4">
        <div className="ui-section-text">
          <span className="ui-kicker">Aliases</span>
          <h1 className="ui-title">Label common values</h1>
          <p className="ui-hint">Everyone on this server sees the same list.</p>
        </div>

        <form
          onSubmit={addAlias}
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <input
            placeholder="Param name"
            value={param}
            onChange={(e) => setParam(e.target.value)}
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          />
          <input
            placeholder="Actual value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          />
          <input
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-xl border border-[#2A2E4A] bg-[#050716] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          />
          <div className="sm:col-span-3 flex flex-wrap gap-2 pt-1">
            <button className="ui-button is-primary" type="submit">
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setParam("");
                setValue("");
                setLabel("");
              }}
              className="ui-button is-ghost"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="ui-panel space-y-3">
        <div className="ui-section-text">
          <span className="ui-kicker">Current entries</span>
          <p className="ui-hint">
            {Object.keys(aliases).length
              ? `${Object.keys(aliases).length} parameters`
              : 'No aliases yet'}
          </p>
        </div>

        {Object.keys(aliases).length === 0 && (
          <div className="ui-card text-center text-sm text-[#9DA3FFCC]">
            Start by adding a param above.
          </div>
        )}

        {Object.entries(aliases).map(([p, map]) => (
          <div key={p} className="ui-card space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[#F8F4FF]">{p}</div>
              <span className="ui-pill is-muted">
                {Object.keys(map).length} values
              </span>
            </div>
            <div className="space-y-1">
              {Object.entries(map).map(([val, lab]) => (
                <div
                  key={val}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#1F2342] bg-[#050716] px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#F8F4FF] truncate">
                      {lab}
                    </div>
                    <div className="text-xs text-[#6A6FA8] truncate">{val}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => copyToClipboard(val)}
                      className="ui-button is-muted is-compact"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => removeAlias(p, val)}
                      className="ui-button is-ghost is-compact"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="ui-panel space-y-3">
        <div className="ui-section-text">
          <span className="ui-kicker">Raw JSON</span>
          <p className="ui-hint">Paste or adjust the entire map at once.</p>
        </div>
        <textarea
          className="w-full h-48 rounded-xl border border-[#2A2E4A] bg-[#050716] p-3 text-sm font-mono text-[#E5E7FF] focus:outline-none focus:ring-1 focus:ring-[#3EF0FF80]"
          value={jsonEditor}
          onChange={(e) => setJsonEditor(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={saveJson} className="ui-button is-primary">
            Save JSON
          </button>
        </div>
      </section>
    </div>
  );
}
