import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, Send, Copy, Check, Clock3, History, Settings2,
  Code2, FileJson, ChevronDown, Play, Search, X, Sun, Moon,
  Download, Upload, ExternalLink
} from "lucide-react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const starter = {
  method: "GET",
  url: "https://jsonplaceholder.typicode.com/posts/1",
  params: [{ key: "", value: "", enabled: true }],
  headers: [{ key: "Accept", value: "application/json", enabled: true }],
  body: '{\n  "title": "Hello API"\n}',
  bodyType: "json"
};

const makeRow = () => ({ key: "", value: "", enabled: true });

function App() {
  const [request, setRequest] = useState(starter);
  const [activeTab, setActiveTab] = useState("Params");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("api-history") || "[]"); }
    catch { return []; }
  });
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("api-saved") || "[]"); }
    catch { return []; }
  });
  const [dark, setDark] = useState(() => localStorage.getItem("api-theme") !== "light");
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [collectionName, setCollectionName] = useState("");

  useEffect(() => {
    localStorage.setItem("api-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("api-saved", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    localStorage.setItem("api-theme", dark ? "dark" : "light");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const queryString = useMemo(() => {
    return request.params
      .filter(x => x.enabled && x.key.trim())
      .map(x => `${encodeURIComponent(x.key)}=${encodeURIComponent(x.value)}`)
      .join("&");
  }, [request.params]);

  const finalUrl = useMemo(() => {
    if (!queryString) return request.url;
    return `${request.url}${request.url.includes("?") ? "&" : "?"}${queryString}`;
  }, [request.url, queryString]);

  function updateRequest(patch) {
    setRequest(r => ({ ...r, ...patch }));
  }

  function updateRow(section, index, patch) {
    setRequest(r => ({
      ...r,
      [section]: r[section].map((row, i) => i === index ? { ...row, ...patch } : row)
    }));
  }

  function addRow(section) {
    setRequest(r => ({ ...r, [section]: [...r[section], makeRow()] }));
  }

  function removeRow(section, index) {
    setRequest(r => ({
      ...r,
      [section]: r[section].length === 1 ? [makeRow()] : r[section].filter((_, i) => i !== index)
    }));
  }

  async function sendRequest() {
    setLoading(true);
    setResponse(null);
    const started = performance.now();

    let headers = {};
    request.headers.filter(x => x.enabled && x.key.trim()).forEach(x => {
      headers[x.key] = x.value;
    });

    const options = { method: request.method, headers };
    if (!["GET", "HEAD"].includes(request.method) && request.body.trim()) {
      options.body = request.bodyType === "json"
        ? (() => {
            try { return JSON.stringify(JSON.parse(request.body)); }
            catch { return request.body; }
          })()
        : request.body;
      if (!Object.keys(headers).some(k => k.toLowerCase() === "content-type")) {
        options.headers["Content-Type"] = request.bodyType === "json"
          ? "application/json" : "text/plain";
      }
    }

    try {
      const res = await fetch(finalUrl, options);
      const elapsed = Math.round(performance.now() - started);
      const text = await res.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch {}
      const item = {
        id: Date.now(),
        method: request.method,
        url: finalUrl,
        status: res.status,
        statusText: res.statusText,
        time: elapsed,
        size: new Blob([text]).size,
        response: parsed,
        headers: Object.fromEntries(res.headers.entries())
      };
      setResponse(item);
      setHistory(h => [item, ...h.filter(x => !(x.method === item.method && x.url === item.url))].slice(0, 30));
    } catch (error) {
      const elapsed = Math.round(performance.now() - started);
      const item = {
        id: Date.now(),
        method: request.method,
        url: finalUrl,
        status: 0,
        statusText: "Request failed",
        time: elapsed,
        size: 0,
        response: { error: error.message, hint: "The browser may be blocking this request because of CORS." },
        headers: {}
      };
      setResponse(item);
      setHistory(h => [item, ...h].slice(0, 30));
    } finally {
      setLoading(false);
    }
  }

  function loadHistory(item) {
    setRequest(r => ({ ...r, method: item.method, url: item.url.split("?")[0] }));
    setResponse(item);
    setShowHistory(false);
  }

  function saveCollection() {
    const name = collectionName.trim() || "Untitled Request";
    setSaved(s => [{ id: Date.now(), name, request }, ...s]);
    setCollectionName("");
    setShowSave(false);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ saved, history }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "api-testing-tool-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.saved)) setSaved(data.saved);
        if (Array.isArray(data.history)) setHistory(data.history);
      } catch {}
    };
    reader.readAsText(file);
  }

  const prettyResponse = useMemo(() => {
    if (!response) return "";
    return typeof response.response === "string"
      ? response.response
      : JSON.stringify(response.response, null, 2);
  }, [response]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Code2 size={19} /></div>
          <div>
            <strong>API Tester</strong>
            <span>Developer Workspace</span>
          </div>
        </div>

        <div className="top-actions">
          <button className="icon-btn" onClick={() => setShowHistory(true)} title="History"><History size={17}/></button>
          <button className="icon-btn" onClick={() => setDark(v => !v)} title="Theme">
            {dark ? <Sun size={17}/> : <Moon size={17}/>}
          </button>
          <label className="icon-btn" title="Import">
            <Upload size={17}/>
            <input hidden type="file" accept=".json" onChange={importData}/>
          </label>
          <button className="icon-btn" onClick={exportData} title="Export"><Download size={17}/></button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div><span className="eyebrow">WORKSPACE</span><h2>Collections</h2></div>
            <button className="small-icon" onClick={() => setShowSave(true)}><Plus size={16}/></button>
          </div>

          <div className="sidebar-search">
            <Search size={15}/><input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>

          <div className="collection-list">
            {saved.filter(x => x.name.toLowerCase().includes(search.toLowerCase())).map(item => (
              <button className="collection-item" key={item.id} onClick={() => setRequest(item.request)}>
                <FileJson size={16}/>
                <span>{item.name}</span>
              </button>
            ))}
            {saved.length === 0 && <div className="empty-side">No saved requests yet.<br/>Save one to build a collection.</div>}
          </div>

          <div className="sidebar-bottom">
            <button className="side-link"><Settings2 size={16}/> Settings</button>
          </div>
        </aside>

        <section className="main-panel">
          <div className="request-card">
            <div className="request-line">
              <div className="method-select">
                <select value={request.method} onChange={e => updateRequest({ method: e.target.value })}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown size={14}/>
              </div>
              <input
                className="url-input"
                value={request.url}
                onChange={e => updateRequest({ url: e.target.value })}
                onKeyDown={e => e.key === "Enter" && sendRequest()}
                placeholder="https://api.example.com/users"
              />
              <button className="save-btn" onClick={() => setShowSave(true)}><Plus size={15}/> Save</button>
              <button className="send-btn" onClick={sendRequest} disabled={loading}>
                {loading ? <span className="spinner"/> : <Send size={15}/>}
                {loading ? "Sending" : "Send"}
              </button>
            </div>

            <div className="tabs">
              {["Params", "Headers", "Body"].map(tab => (
                <button className={activeTab === tab ? "tab active" : "tab"} onClick={() => setActiveTab(tab)} key={tab}>
                  {tab}
                  {tab === "Headers" && request.headers.filter(x => x.enabled && x.key).length > 0 && <b>{request.headers.filter(x => x.enabled && x.key).length}</b>}
                </button>
              ))}
            </div>

            {activeTab === "Params" && (
              <KeyValueEditor rows={request.params} section="params" updateRow={updateRow} addRow={addRow} removeRow={removeRow}/>
            )}

            {activeTab === "Headers" && (
              <KeyValueEditor rows={request.headers} section="headers" updateRow={updateRow} addRow={addRow} removeRow={removeRow}/>
            )}

            {activeTab === "Body" && (
              <div className="body-editor">
                <div className="body-toolbar">
                  <span>Request body</span>
                  <select value={request.bodyType} onChange={e => updateRequest({ bodyType: e.target.value })}>
                    <option value="json">JSON</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <textarea value={request.body} onChange={e => updateRequest({ body: e.target.value })} spellCheck="false"/>
              </div>
            )}
          </div>

          <div className="response-card">
            <div className="response-head">
              <div>
                <span className="eyebrow">RESPONSE</span>
                <h2>Response</h2>
              </div>
              {response && (
                <div className="response-meta">
                  <span className={response.status >= 200 && response.status < 400 ? "status ok" : "status bad"}>
                    {response.status || "ERR"} {response.statusText}
                  </span>
                  <span><Clock3 size={14}/>{response.time} ms</span>
                  <span>{formatBytes(response.size)}</span>
                </div>
              )}
            </div>

            {!response && !loading && (
              <div className="response-empty">
                <div className="empty-icon"><Play size={20}/></div>
                <h3>Ready when you are</h3>
                <p>Configure your request and press <strong>Send</strong> to inspect the API response.</p>
              </div>
            )}

            {loading && <div className="response-empty"><div className="loader-ring"/><h3>Sending request…</h3><p>Waiting for the server response.</p></div>}

            {response && !loading && (
              <>
                <div className="response-toolbar">
                  <div className="response-tabs"><span className="active">Body</span><span>Headers <b>{Object.keys(response.headers || {}).length}</b></span></div>
                  <button className="copy-btn" onClick={() => {
                    navigator.clipboard.writeText(prettyResponse);
                    setCopied(true); setTimeout(() => setCopied(false), 1400);
                  }}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy"}</button>
                </div>
                <pre className="response-code"><code>{prettyResponse}</code></pre>
              </>
            )}
          </div>
        </section>
      </main>

      {showHistory && (
        <Modal title="Request History" onClose={() => setShowHistory(false)}>
          {history.length === 0 ? <div className="modal-empty">No requests have been sent yet.</div> :
            history.map(item => (
              <button className="history-row" key={item.id} onClick={() => loadHistory(item)}>
                <span className={`method-pill ${item.method.toLowerCase()}`}>{item.method}</span>
                <span className="history-url">{item.url}</span>
                <span className={item.status >= 200 && item.status < 400 ? "mini-status ok" : "mini-status bad"}>{item.status || "ERR"}</span>
                <span className="history-time">{item.time}ms</span>
              </button>
            ))
          }
          {history.length > 0 && <button className="danger-btn" onClick={() => setHistory([])}><Trash2 size={14}/> Clear history</button>}
        </Modal>
      )}

      {showSave && (
        <Modal title="Save Request" onClose={() => setShowSave(false)}>
          <label className="field-label">Request name</label>
          <input className="modal-input" autoFocus placeholder="e.g. Get user profile" value={collectionName} onChange={e => setCollectionName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveCollection()}/>
          <button className="modal-primary" onClick={saveCollection}>Save Request</button>
        </Modal>
      )}
    </div>
  );
}

function KeyValueEditor({ rows, section, updateRow, addRow, removeRow }) {
  return (
    <div className="kv-editor">
      <div className="kv-header"><span>Key</span><span>Value</span><span></span></div>
      {rows.map((row, i) => (
        <div className="kv-row" key={i}>
          <input placeholder="key" value={row.key} onChange={e => updateRow(section, i, { key: e.target.value })}/>
          <input placeholder="value" value={row.value} onChange={e => updateRow(section, i, { value: e.target.value })}/>
          <button className="remove-row" onClick={() => removeRow(section, i)}><X size={15}/></button>
          <label className="row-check"><input type="checkbox" checked={row.enabled} onChange={e => updateRow(section, i, { enabled: e.target.checked })}/><span/></label>
        </div>
      ))}
      <button className="add-row" onClick={() => addRow(section)}><Plus size={14}/> Add {section === "params" ? "parameter" : "header"}</button>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><h3>{title}</h3><button onClick={onClose}><X size={17}/></button></div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default App;