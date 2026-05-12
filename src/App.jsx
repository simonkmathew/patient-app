import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

// ── Constants ──────────────────────────────────────────────────────────────
const PANCHAYATHS = ["KUNNATHOOR", "KADAMPANADU", "Koipuram"];
const SERVICES = [
  "Visited",
  "Food kit",
  "BP check",
  "Dressing done",
  "Catheter change",
  "Diaper given",
  "Under pad given",
  "Neosprin Powder given",
  "Other",
];
const PANCH_COLOR = {
  KUNNATHOOR:  { bg: "#E6F1FB", text: "#185FA5" },
  KADAMPANADU: { bg: "#EAF3DE", text: "#3B6D11" },
  Koipuram:    { bg: "#FAEEDA", text: "#854F0B" },
};

// ── Shared UI components ───────────────────────────────────────────────────
function Badge({ label }) {
  const c = PANCH_COLOR[label] || { bg: "#E6F1FB", text: "#185FA5" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
      {label || "—"}
    </span>
  );
}

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E6F1FB", color: "#185FA5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#aaa" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #e8e8e8", borderTop: "2px solid #185FA5", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
      Loading…
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: type === "error" ? "#FCEBEB" : "#EAF3DE", color: type === "error" ? "#A32D2D" : "#3B6D11", padding: "12px 20px", borderRadius: 10, fontWeight: 500, fontSize: 13, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: 340 }}>
      {message}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#fff", color: "#222" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" };

function Field({ label, children, half }) {
  return (
    <div style={{ marginBottom: 14, gridColumn: half ? "span 1" : "span 2" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? "#aaa" : "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer" }}>
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ background: "#f4f4f4", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: "pointer", color: "#444" }}>
      {children}
    </button>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ onNavigate }) {
  const [stats, setStats]           = useState({ patients: 0, visits: 0, panchayaths: 0, thisMonth: 0 });
  const [recentVisits, setRecent]   = useState([]);
  const [panchBreakdown, setBreakdown] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const [{ count: pCount }, { count: vCount }, { data: patients }, { data: recent }, { data: monthV }] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("visits").select("*",   { count: "exact", head: true }),
        supabase.from("patients").select("panchayath"),
        supabase.from("visits").select("*, patients(name, panchayath)").order("visited_date", { ascending: false }).limit(6),
        supabase.from("visits").select("id").gte("visited_date", firstOfMonth),
      ]);

      const panchCount = {};
      (patients || []).forEach((p) => { if (p.panchayath) panchCount[p.panchayath] = (panchCount[p.panchayath] || 0) + 1; });

      setStats({ patients: pCount || 0, visits: vCount || 0, panchayaths: Object.keys(panchCount).length, thisMonth: (monthV || []).length });
      setRecent(recent || []);
      setBreakdown(Object.entries(panchCount));
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner />;

  const statCards = [
    { label: "Total patients", value: stats.patients, sub: "registered" },
    { label: "Total visits",   value: stats.visits,   sub: "recorded" },
    { label: "Panchayaths",    value: stats.panchayaths, sub: "covered" },
    { label: "This month",     value: stats.thisMonth, sub: "visits" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#185FA5" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#bbb" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Recent visits</span>
            <button onClick={() => onNavigate("visits")} style={{ fontSize: 11, color: "#185FA5", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
          </div>
          {recentVisits.length === 0
            ? <div style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: 24 }}>No visits yet</div>
            : recentVisits.map((v) => (
              <div key={v.id} style={{ padding: "9px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
                <div style={{ fontSize: 11, color: "#bbb" }}>{v.visited_date}</div>
                <strong>{v.patients?.name || "—"}</strong>{" "}
                <span style={{ color: "#777" }}>— {v.service_given}</span>
                {v.bp_reading && <span style={{ fontSize: 11, color: "#185FA5", marginLeft: 8 }}>BP {v.bp_reading}</span>}
              </div>
            ))
          }
        </div>

        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Patients by panchayath</div>
          {panchBreakdown.length === 0
            ? <div style={{ color: "#bbb", fontSize: 13, textAlign: "center", padding: 24 }}>No data</div>
            : panchBreakdown.map(([name, count]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f5f5f5" }}>
                <Badge label={name} />
                <span style={{ fontSize: 13, color: "#777" }}>{count} patients</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Patients List ──────────────────────────────────────────────────────────
function Patients({ onViewPatient }) {
  const [patients, setPatients]     = useState([]);
  const [visitCounts, setCounts]    = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterPanch, setFilter]    = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pts }, { data: visits }] = await Promise.all([
        supabase.from("patients").select("*").order("name"),
        supabase.from("visits").select("patient_id"),
      ]);
      setPatients(pts || []);
      const counts = {};
      (visits || []).forEach((v) => { counts[v.patient_id] = (counts[v.patient_id] || 0) + 1; });
      setCounts(counts);
      setLoading(false);
    })();
  }, []);

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase();
    const matchQ = !q || [p.name, p.ward, p.panchayath, p.phone].some((f) => (f || "").toLowerCase().includes(q));
    return matchQ && (!filterPanch || p.panchayath === filterPanch);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="Search by name, ward, phone, panchayath…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={{ ...inputStyle, width: 190 }} value={filterPanch} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All panchayaths</option>
          {PANCHAYATHS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Patient", "Panchayath", "Ward", "Age", "Phone", "Visits", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #eee", fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 44, color: "#bbb" }}>No patients found</td></tr>
                : filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={p.name} /><strong>{p.name}</strong></div>
                    </td>
                    <td style={{ padding: "10px 14px" }}><Badge label={p.panchayath} /></td>
                    <td style={{ padding: "10px 14px", color: "#777" }}>{p.ward || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#777" }}>{p.age || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#777" }}>{p.phone || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: "#E6F1FB", color: "#185FA5", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{visitCounts[p.id] || 0}</span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => onViewPatient(p)} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>View</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Visit Log ──────────────────────────────────────────────────────────────
function VisitLog() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("visits")
        .select("*, patients(name, panchayath)")
        .order("visited_date", { ascending: false })
        .order("created_at",   { ascending: false });
      setVisits(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = visits.filter((v) => {
    const q = search.toLowerCase();
    return !q || [v.patients?.name, v.service_given, v.remarks, v.visited_date].some((f) => (f || "").toLowerCase().includes(q));
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input style={inputStyle} placeholder="Search visits by name, service, date…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Patient", "Panchayath", "Date", "Service given", "BP", "Sugar", "Remarks"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 14px", borderBottom: "1px solid #eee", fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: "center", padding: 44, color: "#bbb" }}>No visits found</td></tr>
                : filtered.map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f5f5f5" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "10px 14px" }}><strong>{v.patients?.name || "—"}</strong></td>
                    <td style={{ padding: "10px 14px" }}><Badge label={v.patients?.panchayath} /></td>
                    <td style={{ padding: "10px 14px", color: "#777" }}>{v.visited_date}</td>
                    <td style={{ padding: "10px 14px" }}>{v.service_given || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#185FA5", fontWeight: 500 }}>{v.bp_reading || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#777" }}>{v.blood_sugar ? v.blood_sugar + " mg/dl" : "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#aaa", fontSize: 12 }}>{v.remarks || "—"}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Register Patient ───────────────────────────────────────────────────────
function RegisterPatient({ onSuccess }) {
  const empty = { name: "", panchayath: "", ward: "", age: "", phone: "", remarks: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name.trim() || !form.panchayath) { onSuccess("error", "Name and panchayath are required."); return; }
    setSaving(true);
    const { error } = await supabase.from("patients").insert([{
      name:       form.name.trim(),
      panchayath: form.panchayath,
      ward:       form.ward.trim()  || null,
      age:        form.age          ? parseInt(form.age) : null,
      phone:      form.phone.trim() || null,
      remarks:    form.remarks.trim() || null,
    }]);
    setSaving(false);
    if (error) { onSuccess("error", "Error: " + error.message); return; }
    setForm(empty);
    onSuccess("success", `Patient "${form.name}" registered!`);
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>New patient registration</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <Field label="Full name *">
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Patient full name" />
          </Field>
          <Field label="Panchayath *" half>
            <select style={inputStyle} value={form.panchayath} onChange={(e) => set("panchayath", e.target.value)}>
              <option value="">Select panchayath</option>
              {PANCHAYATHS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Ward no." half>
            <input style={inputStyle} value={form.ward} onChange={(e) => set("ward", e.target.value)} placeholder="Ward number" />
          </Field>
          <Field label="Age" half>
            <input style={inputStyle} type="number" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="Age" />
          </Field>
          <Field label="Phone number" half>
            <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone" />
          </Field>
          <Field label="Initial notes / remarks">
            <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any initial observations…" />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <PrimaryBtn onClick={handleSubmit} disabled={saving}>{saving ? "Registering…" : "Register patient"}</PrimaryBtn>
          <SecondaryBtn onClick={() => setForm(empty)}>Clear</SecondaryBtn>
        </div>
      </div>
    </div>
  );
}

// ── Log Visit Modal ────────────────────────────────────────────────────────
function LogVisitModal({ open, onClose, onSaved }) {
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected]       = useState(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], service: "", bp: "", sugar: "", remarks: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) { setQuery(""); setSuggestions([]); setSelected(null); setForm({ date: new Date().toISOString().split("T")[0], service: "", bp: "", sugar: "", remarks: "" }); }
  }, [open]);

  async function onQueryChange(q) {
    setQuery(q); setSelected(null);
    if (!q.trim()) { setSuggestions([]); return; }
    const { data } = await supabase.from("patients").select("id, name, panchayath").ilike("name", `%${q}%`).limit(8);
    setSuggestions(data || []);
  }

  async function handleSave() {
    if (!selected)      { onSaved("error", "Please select a patient from suggestions."); return; }
    if (!form.service)  { onSaved("error", "Please select a service."); return; }
    setSaving(true);
    const { error } = await supabase.from("visits").insert([{
      patient_id:   selected.id,
      visited_date: form.date,
      service_given: form.service,
      bp_reading:   form.bp    || null,
      blood_sugar:  form.sugar || null,
      remarks:      form.remarks || null,
    }]);
    setSaving(false);
    if (error) { onSaved("error", "Error: " + error.message); return; }
    onSaved("success", `Visit logged for ${selected.name}!`);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Log a visit">
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Patient *</label>
        <input style={inputStyle} placeholder="Start typing patient name…" value={query} onChange={(e) => onQueryChange(e.target.value)} autoFocus />
        {suggestions.length > 0 && !selected && (
          <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, background: "#fff", marginTop: 4, maxHeight: 160, overflowY: "auto" }}>
            {suggestions.map((p) => (
              <div key={p.id} onClick={() => { setSelected(p); setQuery(p.name); setSuggestions([]); }}
                style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f5f5f5" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7ff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <strong>{p.name}</strong> <span style={{ fontSize: 11, color: "#aaa" }}>{p.panchayath}</span>
              </div>
            ))}
          </div>
        )}
        {selected && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#3B6D11", background: "#EAF3DE", padding: "4px 12px", borderRadius: 6, display: "inline-block" }}>
            ✓ {selected.name} — {selected.panchayath}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Service given *</label>
          <select style={inputStyle} value={form.service} onChange={(e) => set("service", e.target.value)}>
            <option value="">Select service</option>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>BP reading</label>
          <input style={inputStyle} value={form.bp} onChange={(e) => set("bp", e.target.value)} placeholder="e.g. 120/80" />
        </div>
        <div>
          <label style={labelStyle}>Blood sugar (mg/dl)</label>
          <input style={inputStyle} value={form.sugar} onChange={(e) => set("sugar", e.target.value)} placeholder="e.g. 140" />
        </div>
      </div>

      <div style={{ marginTop: 14, marginBottom: 18 }}>
        <label style={labelStyle}>Remarks</label>
        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Any additional observations…" />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <PrimaryBtn onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save visit"}</PrimaryBtn>
        <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
      </div>
    </Modal>
  );
}

// ── Patient Detail Modal ───────────────────────────────────────────────────
function PatientDetailModal({ patient, open, onClose }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;
    setLoading(true);
    supabase.from("visits").select("*").eq("patient_id", patient.id).order("visited_date", { ascending: false })
      .then(({ data }) => { setVisits(data || []); setLoading(false); });
  }, [open, patient]);

  if (!patient) return null;

  return (
    <Modal open={open} onClose={onClose} title="Patient details">
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid #f0f0f0" }}>
        <Avatar name={patient.name} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{patient.name}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
            {patient.panchayath}{patient.ward ? ` · Ward ${patient.ward}` : ""}{patient.age ? ` · Age ${patient.age}` : ""}
          </div>
          {patient.phone && <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>📞 {patient.phone}</div>}
          {patient.remarks && <div style={{ fontSize: 12, color: "#aaa", marginTop: 5, fontStyle: "italic" }}>{patient.remarks}</div>}
        </div>
        <span style={{ background: "#E6F1FB", color: "#185FA5", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {visits.length} visit{visits.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Visit history</div>

      {loading ? <Spinner /> : visits.length === 0
        ? <div style={{ color: "#bbb", textAlign: "center", padding: 30 }}>No visits recorded yet</div>
        : visits.map((v, i) => (
          <div key={v.id} style={{ padding: "10px 14px", borderRadius: 8, background: i % 2 === 0 ? "#f9f9f9" : "#fff", marginBottom: 6, fontSize: 13, border: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>{v.visited_date}</div>
            <strong>{v.service_given}</strong>
            {v.bp_reading    && <span style={{ marginLeft: 10, color: "#185FA5", fontSize: 12 }}>BP {v.bp_reading}</span>}
            {v.blood_sugar   && <span style={{ marginLeft: 10, color: "#854F0B", fontSize: 12 }}>Sugar {v.blood_sugar} mg/dl</span>}
            {v.remarks       && <div style={{ color: "#888", marginTop: 4, fontSize: 12 }}>{v.remarks}</div>}
          </div>
        ))
      }
    </Modal>
  );
}

// ── Search Page ────────────────────────────────────────────────────────────
function SearchPage() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [visitsMap, setMap]   = useState({});
  const [loading, setLoading] = useState(false);
  const debounce              = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const { data: pts } = await supabase.from("patients").select("*").ilike("name", `%${q}%`).order("name").limit(20);
    setResults(pts || []);
    if (pts && pts.length > 0) {
      const { data: visits } = await supabase.from("visits").select("*").in("patient_id", pts.map((p) => p.id)).order("visited_date", { ascending: false });
      const map = {};
      (visits || []).forEach((v) => { if (!map[v.patient_id]) map[v.patient_id] = []; map[v.patient_id].push(v); });
      setMap(map);
    }
    setLoading(false);
  }, []);

  function handleInput(q) {
    setQuery(q);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q), 350);
  }

  return (
    <div>
      <div style={{ maxWidth: 500, marginBottom: 20 }}>
        <input style={{ ...inputStyle, fontSize: 15, padding: "12px 14px" }} placeholder="Type a patient name to view their full history…" value={query} onChange={(e) => handleInput(e.target.value)} autoFocus />
      </div>

      {loading && <Spinner />}
      {!loading && query && results.length === 0 && (
        <div style={{ color: "#bbb", textAlign: "center", padding: 48 }}>No patients found for "{query}"</div>
      )}

      {results.map((p) => {
        const pvs = visitsMap[p.id] || [];
        return (
          <div key={p.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #f5f5f5" }}>
              <Avatar name={p.name} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#999" }}>{p.panchayath}{p.ward ? ` · Ward ${p.ward}` : ""}{p.age ? ` · Age ${p.age}` : ""}{p.phone ? ` · ${p.phone}` : ""}</div>
              </div>
              <span style={{ marginLeft: "auto", background: "#E6F1FB", color: "#185FA5", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {pvs.length} visit{pvs.length !== 1 ? "s" : ""}
              </span>
            </div>
            {pvs.length === 0
              ? <div style={{ color: "#bbb", fontSize: 13 }}>No visits recorded yet.</div>
              : pvs.map((v, i) => (
                <div key={v.id} style={{ padding: "9px 12px", borderRadius: 7, background: i % 2 === 0 ? "#f9f9f9" : "#fff", marginBottom: 5, fontSize: 13, border: "1px solid #f0f0f0" }}>
                  <span style={{ fontSize: 11, color: "#bbb", marginRight: 10 }}>{v.visited_date}</span>
                  <strong>{v.service_given}</strong>
                  {v.bp_reading  && <span style={{ marginLeft: 10, color: "#185FA5", fontSize: 12 }}>BP {v.bp_reading}</span>}
                  {v.blood_sugar && <span style={{ marginLeft: 10, color: "#854F0B", fontSize: 12 }}>Sugar {v.blood_sugar} mg/dl</span>}
                  {v.remarks     && <span style={{ marginLeft: 10, color: "#aaa", fontSize: 12 }}>— {v.remarks}</span>}
                </div>
              ))
            }
          </div>
        );
      })}
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "patients",  label: "Patients",  icon: "👥" },
  { id: "visits",    label: "Visit log", icon: "📋" },
  { id: "register",  label: "Register",  icon: "➕" },
  { id: "search",    label: "Search",    icon: "🔍" },
];

export default function App() {
  const [page, setPage]             = useState("dashboard");
  const [visitModal, setVisitModal] = useState(false);
  const [detailModal, setDetail]    = useState(false);
  const [selPatient, setSelPatient] = useState(null);
  const [toast, setToast]           = useState(null);

  function showToast(type, message) { setToast({ type, message }); }

  function viewPatient(p) { setSelPatient(p); setDetail(true); }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f7f8fa" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
        input:focus, select:focus, textarea:focus { border-color: #185FA5 !important; box-shadow: 0 0 0 3px rgba(24,95,165,0.08); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 210, background: "#fff", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#185FA5" }}>🏥 MediTrack</div>
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>Patient Register</div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 8, border: "none", background: page === n.id ? "#E6F1FB" : "transparent", color: page === n.id ? "#185FA5" : "#666", fontWeight: page === n.id ? 600 : 400, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: page === n.id ? "3px solid #185FA5" : "3px solid transparent" }}>
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 10px", borderTop: "1px solid #eee" }}>
          <button onClick={() => setVisitModal(true)} style={{ width: "100%", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            + Log visit
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", background: "#fff", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700 }}>{NAV.find((n) => n.id === page)?.label}</h1>
          <button onClick={() => setPage("register")} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            + New patient
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {page === "dashboard" && <Dashboard onNavigate={setPage} />}
          {page === "patients"  && <Patients onViewPatient={viewPatient} />}
          {page === "visits"    && <VisitLog />}
          {page === "register"  && <RegisterPatient onSuccess={(type, msg) => { showToast(type, msg); if (type === "success") setPage("patients"); }} />}
          {page === "search"    && <SearchPage />}
        </div>
      </div>

      {/* Modals */}
      <LogVisitModal   open={visitModal} onClose={() => setVisitModal(false)} onSaved={showToast} />
      <PatientDetailModal patient={selPatient} open={detailModal} onClose={() => setDetail(false)} />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

