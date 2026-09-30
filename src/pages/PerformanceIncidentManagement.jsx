import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { Download, FileText, Paperclip, Plus, Save, Search, Trash2, X } from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAuthUser, hasPermission } from "../utils/auth";
import { CASE_TYPES, CASE_STATUSES, emptyRow, stageValues, filterCases, csvValue } from "../utils/performanceCase";

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const today = () => new Date().toLocaleDateString("en-CA");
const blankCase = () => ({ booking: "", type: "Client Complaint", date: today(), severity: "Medium", description: "", reportedBy: getAuthUser()?.name || "" });
const api = async (path, options) => {
  const response = await apiFetch("/performance-cases" + path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(" ") : data.message || "Unable to complete the request.");
  return data;
};
const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function Field({ field, value, onChange, id }) {
  const { type, label } = field;
  if (type === "rows") {
    const rows = value || [];
    return (
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
        <legend className="px-1 font-semibold text-slate-800">{label}</legend>
        {!rows.length && <p className="text-sm text-slate-500">No entries yet. Add an entry below.</p>}
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entry {index + 1}</span>
              <button type="button" className="text-sm text-red-600" aria-label={`Remove ${label} entry ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {field.columns.map((column) => (
                <Field key={column.key} id={`${id}-${index}-${column.key}`} field={column} value={row[column.key]} onChange={(next) => onChange(rows.map((item, i) => i === index ? { ...item, [column.key]: next } : item))} />
              ))}
            </div>
          </div>
        ))}
        <button type="button" className={buttonClass} onClick={() => onChange([...rows, emptyRow(field.columns)])}><Plus size={16} /> Add entry</button>
      </fieldset>
    );
  }
  if (type === "list") {
    const rows = value || [];
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">{label}</legend>
        {(rows.length ? rows : [""]).map((row, index) => (
          <div className="flex items-start gap-2" key={index}>
            <textarea rows={2} aria-label={`${label} ${index + 1}`} className={inputClass} value={row} onChange={(event) => onChange((rows.length ? rows : [""]).map((item, i) => i === index ? event.target.value : item))} />
            <button type="button" className={buttonClass + " mt-1"} aria-label={`Remove ${label} ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
          </div>
        ))}
        <button type="button" className="text-sm font-medium text-blue-600" onClick={() => onChange([...(rows.length ? rows : [""]), ""])}>+ Add item</button>
      </fieldset>
    );
  }
  if (type === "checklist") {
    const values = value || [];
    const options = [...new Set([...(field.options || []), ...values])];
    return (
      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">{label}</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => (
            <label key={option} className="flex items-start gap-2 text-sm text-slate-700">
              <input className="mt-0.5 h-4 w-4" type="checkbox" checked={values.includes(option)} onChange={(event) => onChange(event.target.checked ? [...values, option] : values.filter((item) => item !== option))} />
              {option}
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm text-slate-600">Additional checklist item
          <input className={inputClass} placeholder="Type an item and press Enter" onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const text = event.currentTarget.value.trim();
              if (text && !values.includes(text)) onChange([...values, text]);
              event.currentTarget.value = "";
            }
          }} />
        </label>
      </fieldset>
    );
  }
  if (type === "status") return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-4">{field.options.map((option) => (
        <label key={option} className="flex items-center gap-2 text-sm">
          <input type="radio" name={id} checked={value === option} onChange={() => onChange(option)} className="h-4 w-4" />{option}
        </label>
      ))}</div>
    </fieldset>
  );
  if (type === "checkbox") return (
    <label className="flex items-center gap-2 self-center text-sm font-medium text-slate-700">
      <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4" />{label}
    </label>
  );
  return (
    <label htmlFor={id} className={`block text-sm font-medium text-slate-700 ${type === "textarea" ? "md:col-span-2" : ""}`}>
      {label}
      {type === "textarea" ? <textarea id={id} aria-label={label} rows={3} className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)} />
        : type === "select" ? <select id={id} aria-label={label} className={inputClass} value={value || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select…</option>{field.options.map((option) => <option key={option}>{option}</option>)}
        </select>
          : <input id={id} aria-label={label} className={inputClass} type={["date", "time"].includes(type) ? type : "text"} readOnly={type === "readonly"} value={value || ""} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function BookingSelect({ bookings, value, onChange, disabled = false }) {
  const bookingId = useId();
  const options = bookings.map((booking) => ({
    value: booking.key,
    label: [booking.reference, booking.client, booking.guestParty, booking.vehicle, booking.driver, booking.startDate].filter(Boolean).join(" · "),
  }));
  return (
    <div>
      <label htmlFor={bookingId} className="mb-1 block text-sm font-medium text-slate-700">Booking / Vehicle Allocation</label>
      <Select inputId={bookingId} options={options} value={options.find((option) => option.value === value) || null}
        onChange={(option) => onChange(option?.value || "")} isDisabled={disabled} isSearchable isClearable
        placeholder="Search booking, client, vehicle or driver…" noOptionsMessage={() => "No allocated bookings found"}
        styles={{ control: (base) => ({ ...base, minHeight: 42 }), menu: (base) => ({ ...base, zIndex: 30 }) }} />
      <p className="mt-1 text-xs text-slate-500">Choose the assigned vehicle for the booking. Vehicle and driver / guide are filled automatically.</p>
    </div>
  );
}

function ReadValue({ field, value }) {
  if (field.type === "rows") return <div className="space-y-2">{(value || []).map((row, i) => (
    <div key={i} className="rounded border p-3">{field.columns.map((column) => <p key={column.key}><strong>{column.label}: </strong>{column.type === "checkbox" ? row[column.key] ? "Yes" : "No" : row[column.key] || "—"}</p>)}</div>
  ))}</div>;
  if (Array.isArray(value)) return <ul className="list-disc pl-5">{value.map((item, i) => <li key={i}>{item}</li>)}</ul>;
  return <p className="whitespace-pre-wrap">{typeof value === "boolean" ? value ? "Yes" : "No" : value || "—"}</p>;
}

export default function PerformanceIncidentManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const caseId = location.pathname.replace(/\/$/, "").endsWith("/view") ? new URLSearchParams(location.search).get("case") : null;
  const createMode = location.pathname.replace(/\/$/, "").endsWith("/new");
  const registerPath = "/performance-incident-management";
  const [cases, setCases] = useState([]);
  const [schema, setSchema] = useState({});
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [letter, setLetter] = useState("A");
  const [values, setValues] = useState({});
  const [state, setState] = useState("In progress");
  const [bookingKey, setBookingKey] = useState("");
  const [dirty, setDirty] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filters, setFilters] = useState({ search: "", type: "", status: "", from: "", to: "" });
  const [newCase, setNewCase] = useState(createMode ? blankCase : null);
  const [newFiles, setNewFiles] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [files, setFiles] = useState([]);
  const [attachmentStage, setAttachmentStage] = useState("");
  const fileInput = useRef(null);
  const canEdit = hasPermission("vehicles.update");
  const clearPendingFiles = () => {
    setFiles([]);
    setAttachmentStage("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const initialize = (record, nextLetter, nextSchema = schema) => {
    setSelected(record);
    setDraftRevision(record?.revision || 0);
    setLetter(nextLetter);
    setValues(stageValues(nextSchema[nextLetter]?.fields || [], record?.stages?.[nextLetter]?.values));
    setState(record?.stages?.[nextLetter]?.state || "In progress");
    setBookingKey(record?.booking?.key || "");
    setDirty(false);
  };
  const replaceCase = (record) => {
    setCases((previous) => [record, ...previous.filter((item) => item.id !== record.id)].sort((a, b) => b.id - a.id));
    setSelected(record);
  };
  const load = async (transfer = null) => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([api(""), api("/bookings"), caseId ? api(`/${caseId}`) : Promise.resolve(null)]);
      if (results[0].status === "rejected") throw results[0].reason;
      const data = results[0].value;
      setSchema(data.schema);
      setCases(data.cases);
      clearPendingFiles();
      if (results[2].status === "rejected") throw results[2].reason;
      const record = results[2].value?.case || null;
      initialize(record, record?.currentStage || "A", data.schema);
      if (transfer?.pendingFiles?.length) setFiles(transfer.pendingFiles);
      if (transfer?.warning) setError(transfer.warning);
      if (transfer?.notice) setNotice(transfer.notice);
      if (results[1].status === "fulfilled") setBookings(results[1].value.bookings);
      else setError("Cases loaded, but bookings could not be loaded. " + results[1].reason.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    setSelected(null);
    setNewCase(createMode ? blankCase() : null);
    setNewFiles([]);
    setFeedback(null);
    load(location.state);
  }, [caseId, createMode]);
  useEffect(() => {
    const listener = (event) => { if (dirty || files.length || newCase || feedback) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty, files, newCase, feedback]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const canLeave = () => !dirty || window.confirm("Discard the unsaved changes to this stage?");
  const canSwitchCase = () => canLeave() && (!files.length || window.confirm("Discard the attachments waiting to be uploaded to this case?"));
  const chooseCase = (record) => {
    if (busy || !canSwitchCase()) return;
    clearPendingFiles();
    navigate(`${registerPath}/view?case=${record.id}`);
  };
  const chooseStage = (next) => { if (!busy && next !== letter && canLeave()) { initialize(selected, next); setError(""); } };
  const uploadFiles = async (id, selectedFiles, stage = "") => {
    const form = new FormData();
    selectedFiles.forEach((file) => form.append("files[]", file));
    if (stage) form.append("stage", stage);
    return api(`/${id}/attachments`, { method: "POST", body: form });
  };
  const validateFiles = (selectedFiles) => {
    if (selectedFiles.length > 10) throw new Error("Choose up to 10 attachments at a time.");
    if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) throw new Error("Each attachment must be 10 MB or smaller.");
  };
  const createCase = async (event) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (!newCase.booking) throw new Error("Select a booking / vehicle allocation.");
      validateFiles(newFiles);
      const data = await api("", { method: "POST", body: newCase });
      clearPendingFiles();
      replaceCase(data.case); initialize(data.case, "A");
      const nextState = { notice: `Case ${data.case.reference} created.` };
      if (newFiles.length) {
        try { const uploaded = await uploadFiles(data.case.id, newFiles); replaceCase(uploaded.case); }
        catch (err) {
          nextState.pendingFiles = newFiles;
          nextState.warning = "The case was created, but attachments could not be uploaded. Retry in Attachments. " + err.message;
        }
      }
      setNewFiles([]);
      setNewCase(null);
      navigate(`${registerPath}/view?case=${data.case.id}`, { replace: true, state: nextState });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const saveStage = async (event, exitAfterSave = false) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const body = { revision: draftRevision, state, values };
      if (letter === "A" && bookingKey && bookingKey !== selected.booking?.key) body.booking = bookingKey;
      const data = await api(`/${selected.id}/stages/${letter}`, { method: "PUT", body });
      replaceCase(data.case); initialize(data.case, letter);
      setNotice(`Stage ${letter} saved.`);
      if (exitAfterSave) navigate(registerPath);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const reloadCase = async () => {
    if (!canLeave()) return;
    setBusy(true); setError("");
    try { const data = await api(`/${selected.id}`); replaceCase(data.case); initialize(data.case, letter); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const attach = async () => {
    setBusy(true); setError("");
    try {
      validateFiles(files);
      const data = await uploadFiles(selected.id, files, attachmentStage);
      replaceCase(data.case); setFiles([]); if (fileInput.current) fileInput.current.value = "";
      setNotice("Attachments uploaded.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const downloadAttachment = async (attachment) => {
    setError("");
    try {
      const response = await apiFetch(`/performance-cases/${selected.id}/attachments/${attachment.id}`);
      if (!response.ok) throw new Error("Unable to download the attachment.");
      downloadBlob(await response.blob(), attachment.name);
    } catch (err) { setError(err.message); }
  };
  const removeAttachment = async (attachment) => {
    if (!window.confirm(`Remove attachment "${attachment.name}"?`)) return;
    setBusy(true); setError("");
    try { const data = await api(`/${selected.id}/attachments/${attachment.id}`, { method: "DELETE" }); replaceCase(data.case); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const saveFeedback = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await api(`/${selected.id}/feedback`, { method: "POST", body: { ...feedback, revision: draftRevision } });
      replaceCase(data.case); setDraftRevision(data.case.revision); setFeedback(null); setNotice("Feedback saved.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const filtered = filterCases(cases, filters);
  const exportCsv = () => {
    const rows = [["Case Reference", "Booking Reference", "Type", "Date", "Client", "Vehicle", "Driver / Guide", "Severity", "Status"], ...filtered.map((record) => [
      record.reference, record.booking?.reference, record.type, record.date, record.booking?.client, record.booking?.vehicle, record.booking?.driver, record.severity, record.status,
    ])];
    downloadBlob(new Blob(["\uFEFF" + rows.map((row) => row.map(csvValue).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), "performance-incident-register.csv");
  };
  const metrics = [
    ["Total Cases", cases.length],
    ["Open Cases", cases.filter((record) => record.status !== "Closed").length],
    ["High / Critical Open", cases.filter((record) => record.status !== "Closed" && ["High", "Critical"].includes(record.severity)).length],
    ["Positive Feedback", cases.reduce((total, record) => total + (record.type === "Positive Feedback" ? 1 : 0) + record.feedback.filter((item) => item.type === "Positive").length, 0)],
  ];
  const selectedBooking = bookings.find((booking) => booking.key === newCase?.booking);
  const fields = schema[letter]?.fields || [];
  return (
    <div className="space-y-6 bg-slate-50 p-4 md:p-6">
      <style>{`@media print { body * { visibility: hidden !important; } #performance-case-print, #performance-case-print * { visibility: visible !important; } #performance-case-print { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; padding: 20px; } #performance-case-print section { break-inside: auto; } }`}</style>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">{createMode ? "Report Incident" : "Performance & Incident Management"}</h1></div>
        {createMode || caseId ? <button className={buttonClass} disabled={busy} onClick={() => { if (canSwitchCase() && (!createMode || window.confirm("Leave this unsaved incident report?"))) navigate(registerPath); }}>Back to Register</button>
          : <button className={primaryClass} disabled={!canEdit || busy || loading} onClick={() => navigate(`${registerPath}/new`)}><Plus size={17} /> Report Incident</button>}
      </header>
      {error && !newCase && !feedback && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
      {loading ? <p role="status">Loading cases and bookings…</p> : <>
        {!createMode && !caseId && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label, count]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{count}</p></div>)}</div>
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Performance Register</h2><div className="flex gap-2"><button className={buttonClass} disabled={busy} onClick={() => { if (canSwitchCase()) load(); }}>Refresh</button><button className={buttonClass} onClick={exportCsv}><Download size={16} /> Export CSV</button></div></div>
          <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            <label className="text-sm text-slate-600"><span className="flex items-center gap-1"><Search size={14} /> Search</span><input className={inputClass} placeholder="Case, booking, vehicle, driver…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
            <label className="text-sm text-slate-600">Type<select className={inputClass} value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">All types</option>{CASE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="text-sm text-slate-600">Case Status<select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{CASE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="text-sm text-slate-600">From<input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
            <label className="text-sm text-slate-600">To<input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
          </div>
          <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50"><tr>{["Case / Booking", "Type / Date", "Client", "Vehicle / Driver", "Severity", "Status", ""].map((label) => <th key={label} className="p-3 font-medium text-slate-600">{label}</th>)}</tr></thead>
            <tbody>{filtered.map((record) => <tr key={record.id} className={`border-t ${selected?.id === record.id ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <td className="p-3"><button disabled={busy} onClick={() => chooseCase(record)} className="text-left font-semibold text-blue-700">{record.reference}</button><div className="text-xs text-slate-500">{record.booking?.reference || "No booking linked"}</div></td>
              <td className="p-3">{record.type}<div className="text-xs text-slate-500">{record.date}</div></td>
              <td className="p-3">{record.booking?.client || "—"}</td><td className="p-3">{record.booking?.vehicle}<div className="text-xs text-slate-500">{record.booking?.driver}</div></td>
              <td className="p-3">{record.severity}</td><td className="p-3">{record.status}</td>
              <td className="p-3"><button className={buttonClass} onClick={() => chooseCase(record)}>{canEdit && record.status !== "Closed" ? "Continue" : "View"}</button><p className="mt-1 text-xs text-slate-500">Stage {record.currentStage || "A"}</p></td>
            </tr>)}</tbody></table></div>
          {!filtered.length && <p className="p-6 text-center text-sm text-slate-500">{cases.length ? "No cases match these filters." : "No incidents recorded. Select Report Incident to create a case."}</p>}
        </section>
        </>}
        {selected && <>
          <section className="rounded-xl border bg-white p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-xl font-semibold text-slate-900">{selected.reference}</h2><p className="mt-1 text-sm text-slate-500">{selected.booking?.reference} · {selected.booking?.vehicle} · {selected.booking?.driver}</p><p className="mt-2 line-clamp-3 text-sm text-slate-700">{selected.description}</p></div>
              <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={reloadCase}>Reload Case</button><button className={buttonClass} onClick={() => window.print()}><FileText size={16} /> Print / PDF</button><button className={buttonClass} disabled={!canEdit || busy} onClick={() => { setFeedback({ type: "Positive", rating: 5, remarks: "" }); setError(""); }}>Add Feedback</button></div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
              <nav aria-label="Case stages" className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
                {Object.entries(schema).map(([key, stage]) => <button type="button" key={key} disabled={busy} aria-current={letter === key ? "step" : undefined} onClick={() => chooseStage(key)} className={`flex min-w-48 items-start gap-2 rounded-lg px-3 py-2 text-left text-sm lg:w-full ${letter === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}><span className="font-bold">{key}</span><span>{stage.title}<span className={`mt-0.5 block text-xs ${letter === key ? "text-blue-100" : "text-slate-400"}`}>{selected.stages[key]?.state || "Not started"}</span></span></button>)}
              </nav>
              <form onSubmit={saveStage} className="min-w-0">
                <div className="mb-4 border-b pb-3"><h3 className="text-lg font-semibold">Stage {letter} · {schema[letter]?.title}</h3>{selected.stages[letter]?.updatedAt && <p className="mt-1 text-xs text-slate-500">Saved by {selected.stages[letter].updatedBy} · {new Date(selected.stages[letter].updatedAt).toLocaleString()}</p>}</div>
                {selected.stages[letter]?.originalDetails && <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-700">Original prepared report details</summary><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selected.stages[letter].originalDetails}</p></details>}
                <fieldset disabled={!canEdit || busy} className="space-y-4">
                  {letter === "A" && <BookingSelect bookings={bookings} value={bookingKey} disabled={!canEdit || busy} onChange={(key) => {
                    setBookingKey(key); setDirty(true);
                    const booking = bookings.find((item) => item.key === key);
                    const display = booking ? { bookingReference: booking.reference, client: booking.client, guestParty: booking.guestParty, vehicle: booking.vehicle, driver: booking.driver, safariPeriod: [booking.startDate, booking.endDate].filter(Boolean).join(" to ") } : selected.stages.A.values;
                    setValues((previous) => ({ ...previous, ...display }));
                  }} />}
                  <div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <div key={field.key} className={["rows", "list", "checklist", "textarea", "status"].includes(field.type) ? "md:col-span-2" : ""}><Field id={`stage-${letter}-${field.key}`} field={field} value={values[field.key]} onChange={(value) => { setValues((previous) => ({ ...previous, [field.key]: value })); setDirty(true); }} /></div>)}</div>
                  <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
                    <label className="text-sm font-medium text-slate-700">Stage Progress<select aria-label="Stage Progress" className={inputClass} value={state} onChange={(event) => { setState(event.target.value); setDirty(true); }}><option>In progress</option><option>Completed</option><option>Not applicable</option></select></label>
                    <div className="flex flex-wrap items-center gap-3">{dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}<button type="submit" className={primaryClass}><Save size={16} />{busy ? "Saving…" : `Save Stage ${letter}`}</button><button type="button" className={buttonClass} disabled={files.length > 0} onClick={(event) => saveStage(event, true)}><Save size={16} /> Save &amp; Exit</button></div>
                  </div>
                </fieldset>
                {!canEdit && <p className="mt-3 text-sm text-slate-500">You have read-only access to this case.</p>}
              </form>
            </div>
          </section>
          <section className="rounded-xl border bg-white p-4 md:p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Paperclip size={19} /> Attachments</h2><p className="mt-1 text-sm text-slate-500">Photos, PDF, Word, Excel, CSV or text. Up to 10 files per upload, 10 MB each.</p>
            <div className="mt-4 space-y-2">{selected.attachments.map((attachment) => <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><button className="text-left text-sm font-medium text-blue-700" onClick={() => downloadAttachment(attachment)}>{attachment.name}</button><p className="text-xs text-slate-500">{attachment.stage ? `Stage ${attachment.stage}` : "Case attachment"} · {(attachment.size / 1024).toFixed(0)} KB · {new Date(attachment.created_at).toLocaleDateString()}</p></div>{canEdit && <button className={buttonClass} disabled={busy} aria-label={`Remove ${attachment.name}`} onClick={() => removeAttachment(attachment)}><Trash2 size={15} /></button>}</div>)}</div>
            {selected.photos?.map((photo) => <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-blue-700">{photo.name} (existing incident photo)</a>)}
            {!selected.attachments.length && !selected.photos?.length && <p className="mt-3 text-sm text-slate-500">No attachments yet.</p>}
            {canEdit && <fieldset disabled={busy} className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_200px_auto]">
              <label className="text-sm font-medium text-slate-700">Files<input ref={fileInput} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx" className={inputClass} onChange={(event) => setFiles(Array.from(event.target.files))} />{files.length > 0 && <span className="mt-1 block text-xs text-slate-500">{files.map((file) => file.name).join(", ")}</span>}</label>
              <label className="text-sm font-medium text-slate-700">Link to Stage<select aria-label="Link to Stage" className={inputClass} value={attachmentStage} onChange={(event) => setAttachmentStage(event.target.value)}><option value="">Whole case</option>{Object.entries(schema).map(([key, stage]) => <option key={key} value={key}>{key} · {stage.title}</option>)}</select></label>
              <button className={primaryClass} disabled={!files.length || busy} onClick={attach}>Upload Attachments</button>
            </fieldset>}
          </section>
          <section className="rounded-xl border bg-white p-4"><h2 className="text-lg font-semibold">Feedback History</h2>{!selected.feedback.length && <p className="mt-2 text-sm text-slate-500">No feedback recorded.</p>}{selected.feedback.map((item, index) => <div key={index} className="mt-3 border-t pt-3"><p className="text-sm font-medium">{item.type} · {item.rating}/5</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.remarks}</p><p className="mt-1 text-xs text-slate-500">{item.by} · {new Date(item.date).toLocaleString()}</p></div>)}</section>
        </>}
      </>}
      {!loading && (newCase || feedback) && <div className={newCase ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"} role={newCase ? undefined : "dialog"} aria-modal={newCase ? undefined : "true"} aria-labelledby={newCase ? undefined : "case-modal-title"}>
        <form className={newCase ? "w-full max-w-4xl space-y-4" : "max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"} onSubmit={newCase ? createCase : saveFeedback}>
          {!newCase && <div className="mb-4 flex items-center justify-between"><h2 id="case-modal-title" className="text-xl font-semibold">{`Feedback · ${selected.reference}`}</h2><button type="button" className={buttonClass} disabled={busy} aria-label="Close dialog" onClick={() => { setFeedback(null); setError(""); }}><X size={18} /></button></div>}
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <fieldset disabled={busy} className="space-y-4">
            {newCase ? <>
              <label className="block text-sm font-medium text-slate-700">Case Reference<input readOnly className={inputClass} value="Generated automatically when the case is saved" /></label>
              <BookingSelect bookings={bookings} value={newCase.booking} disabled={busy} onChange={(booking) => setNewCase({ ...newCase, booking })} />
              <div className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-2">{[["Booking Reference", selectedBooking?.reference], ["Client", selectedBooking?.client], ["Vehicle", selectedBooking?.vehicle], ["Driver / Guide", selectedBooking?.driver]].map(([label, value]) => <label key={label} className="text-sm text-slate-600">{label}<input readOnly className={inputClass} value={value || ""} /></label>)}</div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium">Incident Type<select aria-label="Incident Type" className={inputClass} value={newCase.type} onChange={(event) => setNewCase({ ...newCase, type: event.target.value })}>{CASE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label className="text-sm font-medium">Severity<select aria-label="Severity" className={inputClass} value={newCase.severity} onChange={(event) => setNewCase({ ...newCase, severity: event.target.value })}>{["Low", "Medium", "High", "Critical"].map((type) => <option key={type}>{type}</option>)}</select></label>
                <label className="text-sm font-medium">Incident Date<input required type="date" className={inputClass} value={newCase.date} onChange={(event) => setNewCase({ ...newCase, date: event.target.value })} /></label>
                <label className="text-sm font-medium">Reported By<input className={inputClass} value={newCase.reportedBy} onChange={(event) => setNewCase({ ...newCase, reportedBy: event.target.value })} /></label>
              </div>
              <label className="block text-sm font-medium">Incident / Feedback Summary<textarea required rows={4} className={inputClass} value={newCase.description} onChange={(event) => setNewCase({ ...newCase, description: event.target.value })} /></label>
              <label className="block text-sm font-medium">Attachments (optional)<input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx" className={inputClass} onChange={(event) => setNewFiles(Array.from(event.target.files))} /><span className="mt-1 block text-xs text-slate-500">Up to 10 files, 10 MB each.</span></label>
            </> : <>
              <label className="block text-sm font-medium">Feedback Type<select aria-label="Feedback Type" className={inputClass} value={feedback.type} onChange={(event) => setFeedback({ ...feedback, type: event.target.value })}>{["Positive", "Concern", "General"].map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="block text-sm font-medium">Rating<select aria-label="Rating" className={inputClass} value={feedback.rating} onChange={(event) => setFeedback({ ...feedback, rating: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label>
              <label className="block text-sm font-medium">Remarks<textarea required rows={4} className={inputClass} value={feedback.remarks} onChange={(event) => setFeedback({ ...feedback, remarks: event.target.value })} /></label>
            </>}
            <div className="flex justify-end gap-3 border-t pt-4"><button type="button" className={buttonClass} onClick={() => { if (newCase) { if (window.confirm("Leave this unsaved incident report?")) navigate(registerPath); } else { setFeedback(null); setError(""); } }}>Cancel</button><button className={primaryClass} type="submit">{busy ? "Saving…" : newCase ? "Create Case" : "Save Feedback"}</button></div>
          </fieldset>
        </form>
      </div>}
      {selected && <article id="performance-case-print" className="hidden">
        <h1 className="text-2xl font-bold">Performance &amp; Incident Management</h1><h2 className="my-3 text-xl">{selected.reference} · {selected.status}</h2>
        {Object.entries(schema).map(([key, stage]) => <section key={key} className="mb-6"><h3 className="mb-3 border-b text-lg font-bold">Stage {key} · {stage.title} — {selected.stages[key]?.state || "Not started"}</h3>{selected.stages[key]?.originalDetails && <p className="mb-3 whitespace-pre-wrap">{selected.stages[key].originalDetails}</p>}{stage.fields.map((field) => <div className="mb-3" key={field.key}><h4 className="font-semibold">{field.label}</h4><ReadValue field={field} value={selected.stages[key]?.values?.[field.key]} /></div>)}</section>)}
        <h3 className="font-bold">Attachments</h3>{selected.attachments.map((attachment) => <p key={attachment.id}>{attachment.name} {attachment.stage ? `(Stage ${attachment.stage})` : ""}</p>)}
        <h3 className="mt-4 font-bold">Feedback</h3>{selected.feedback.map((item, index) => <p key={index}>{item.type} · {item.rating}/5 · {item.remarks}</p>)}
      </article>}
    </div>
  );
}
