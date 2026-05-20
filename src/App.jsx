import { useState, useEffect } from "react";
import INIT from "./personas.json";

const STORAGE_KEY = "desayuno-pablo-v1";
const SEDE_CENTRAL = "SPP";
const today = new Date();
const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

const C = {
  bg: "#F5F0FF", surface: "#EDE6FF", border: "#C9BAEE", borderStrong: "#A48ED4",
  text: "#1E1040", textMid: "#5B4A8A", textMuted: "#8A78B0",
  accent: "#7F77DD", accentDark: "#3C3489", accentLight: "#EEEDFE", white: "#FFFFFF",
  red: "#FCEBEB", redText: "#A32D2D",
  amber: "#FAEEDA", amberText: "#854F0B",
  green: "#EAF3DE", greenText: "#3B6D11",
  blue: "#E6F1FB", blueText: "#185FA5",
  purple: "#EEEDFE", purpleText: "#533AB7",
};

function monthsAgo(ym) {
  if (!ym) return 9999;
  const [y, m] = ym.split("-").map(Number);
  const [cy, cm] = currentYM.split("-").map(Number);
  return (cy - y) * 12 + (cm - m);
}

function formatMonth(ym) {
  if (!ym) return "Nunca";
  const [y, m] = ym.split("-").map(Number);
  return `${["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m-1]} ${y}`;
}

function getUrgency(p) {
  const m = monthsAgo(p.ultimaAsistencia);
  const cond = (p.condicion || "").toLowerCase();
  const esFuera = p.lugar !== SEDE_CENTRAL;
  if (cond === "licencia") return { bg: C.amber, text: C.amberText, label: "Con licencia" };
  if (cond === "remoto" && m === 9999) return { bg: C.purple, text: C.purpleText, label: "Remoto / sin asistencia" };
  if (esFuera && m === 9999) return { bg: C.purple, text: C.purpleText, label: "Fuera de sede" };
  if (m === 9999) return { bg: C.red, text: C.redText, label: "Nunca asistió" };
  if (m >= 6) return { bg: C.amber, text: C.amberText, label: `Hace ${m} meses` };
  if (m >= 3) return { bg: C.green, text: C.greenText, label: `Hace ${m} meses` };
  return { bg: C.blue, text: C.blueText, label: `Hace ${m} mes${m === 1 ? "" : "es"}` };
}

function Avatar({ nombre, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 32 ? 13 : 12, fontWeight: 500, color: C.textMid, flexShrink: 0 }}>
      {nombre.split(" ").map(w => w[0]).slice(0, 2).join("")}
    </div>
  );
}

function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: bg, color, flexShrink: 0 }}>{label}</span>;
}

function Chip({ label, active, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, cursor: "pointer", border: `1px solid ${active ? C.accent : C.border}`, background: active ? C.accent : C.surface, color: active ? "#fff" : C.textMid, userSelect: "none" }}>
      {label}
    </span>
  );
}

function Overlay({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, padding: 24, maxWidth: 380, width: "90%", border: `1px solid ${C.border}` }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [personas, setPersonas] = useState(null);
  const [eliminados, setEliminados] = useState(null);
  const [tab, setTab] = useState("lista");
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [mesEvento, setMesEvento] = useState(currentYM);
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroLugar, setFiltroLugar] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaReg, setBusquedaReg] = useState("");
  const [otraSede, setOtraSede] = useState(false);
  const [remoto, setRemoto] = useState(false);
  const [otraSedeReg, setOtraSedeReg] = useState(false);
  const [remotoReg, setRemotoReg] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ nombre: "", area: "", lugar: "", condicion: "", ultimaAsistencia: "" });
  const [confirmMes, setConfirmMes] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      const e = localStorage.getItem(STORAGE_KEY + "-eli");
      setPersonas(r ? JSON.parse(r) : INIT);
      setEliminados(e ? JSON.parse(e) : []);
    } catch {
      setPersonas(INIT);
      setEliminados([]);
    }
  }, []);

  function saveP(data) {
    setPersonas(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function saveE(data) {
    setEliminados(data);
    localStorage.setItem(STORAGE_KEY + "-eli", JSON.stringify(data));
  }

  function eliminar(p) {
    saveE([...(eliminados || []), { ...p, eliminadoEn: new Date().toISOString() }]);
    saveP((personas || []).filter(x => x.id !== p.id));
    setConfirmEliminar(null);
  }

  function restaurar(p) {
    const { eliminadoEn, ...persona } = p;
    saveP([...(personas || []), persona]);
    saveE((eliminados || []).filter(x => x.id !== p.id));
  }

  function registrar() {
    const updated = (personas || []).map(p => {
      if (!seleccionados.has(p.id)) return p;
      const hist = [...(p.historial || [])];
      if (!hist.includes(mesEvento)) hist.push(mesEvento);
      return { ...p, ultimaAsistencia: mesEvento, historial: hist.sort() };
    });
    saveP(updated);
    setSeleccionados(new Set());
    setConfirmMes(false);
  }

  function guardarForm() {
    if (!form.nombre.trim()) return;
    if (modal === "add") {
      saveP([...(personas || []), { id: Date.now(), nombre: form.nombre.trim(), area: form.area.trim(), lugar: form.lugar.trim(), condicion: form.condicion.trim(), ultimaAsistencia: null, historial: [] }]);
    } else {
      saveP((personas || []).map(p => {
        if (p.id !== modal.id) return p;
        const ua = form.ultimaAsistencia || null;
        const hist = [...(p.historial || [])];
        if (ua && !hist.includes(ua)) hist.push(ua);
        return { ...p, nombre: form.nombre.trim(), area: form.area.trim(), lugar: form.lugar.trim(), condicion: form.condicion.trim(), ultimaAsistencia: ua, historial: hist.sort() };
      }));
    }
    setModal(null);
  }

  function filtrar(list, { busq, area, lugar, incOtraSede, incRemoto, mes }) {
    return (list || [])
      .filter(p => {
        const esFuera = p.lugar !== SEDE_CENTRAL;
        const esRemoto = (p.condicion || "").toLowerCase() === "remoto";
        const esLicencia = (p.condicion || "").toLowerCase() === "licencia";
        if (esLicencia) return false;
        if (esFuera && !incOtraSede) return false;
        if (esRemoto && !incRemoto) return false;
        return (!area || p.area === area) &&
          (!lugar || p.lugar === lugar) &&
          (!busq || p.nombre.toLowerCase().includes(busq.toLowerCase())) &&
          (!mes || (p.historial || []).includes(mes));
      })
      .sort((a, b) => monthsAgo(b.ultimaAsistencia) - monthsAgo(a.ultimaAsistencia));
  }

  if (personas === null) return <div style={{ padding: "2rem", color: C.textMuted, fontSize: 14, background: C.bg, minHeight: "100vh" }}>Cargando...</div>;

  const lista = filtrar(personas, { busq: busqueda, area: filtroArea, lugar: filtroLugar, incOtraSede: otraSede, incRemoto: remoto, mes: filtroMes });
  const listaReg = filtrar(personas, { busq: busquedaReg, area: "", lugar: "", incOtraSede: otraSedeReg, incRemoto: remotoReg, mes: "" });
  const areas = [...new Set(personas.map(p => p.area))].sort();
  const lugares = [...new Set(personas.map(p => p.lugar))].sort();

  const inp = { padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: C.white, color: C.text, fontFamily: "inherit", outline: "none" };
  const btn = { padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 13, color: C.textMid, fontFamily: "inherit" };
  const btnP = { ...btn, background: C.accent, color: "#fff", border: "none", fontWeight: 500 };
  const cardS = { display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.white, borderRadius: 10, border: `1px solid ${C.border}` };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 720, margin: "0 auto", padding: "1rem", backgroundColor: C.bg, minHeight: "100vh", boxSizing: "border-box" }}>
      <h2 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 500, color: C.text }}>Desayunando con Pablo</h2>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textMuted }}>Gestión de asistencia mensual</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { k: "lista", l: "Lista de personas" },
          { k: "registro", l: `Registrar asistencia${seleccionados.size ? ` (${seleccionados.size})` : ""}` },
          { k: "eliminados", l: `Eliminados${eliminados && eliminados.length ? ` (${eliminados.length})` : ""}` },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ ...btn, background: tab === t.k ? C.accent : C.surface, color: tab === t.k ? "#fff" : C.textMid, border: tab === t.k ? "none" : `1px solid ${C.border}`, fontWeight: tab === t.k ? 500 : 400 }}>{t.l}</button>
        ))}
        <button onClick={() => { setForm({ nombre: "", area: "", lugar: "", condicion: "", ultimaAsistencia: "" }); setModal("add"); }} style={{ ...btnP, marginLeft: "auto" }}>+ Agregar</button>
      </div>

      {tab === "lista" && <>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input placeholder="Buscar nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inp, flex: 1, minWidth: 140 }} />
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={inp}>
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a}>{a}</option>)}
          </select>
          <select value={filtroLugar} onChange={e => setFiltroLugar(e.target.value)} style={inp}>
            <option value="">Todos los lugares</option>
            {lugares.map(l => <option key={l}>{l}</option>)}
          </select>
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={inp} />
          {filtroMes && <button onClick={() => setFiltroMes("")} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>× Mes</button>}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Incluir:</span>
          <Chip label="Otra sede" active={otraSede} onClick={() => setOtraSede(v => !v)} />
          <Chip label="Remoto" active={remoto} onClick={() => setRemoto(v => !v)} />
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{lista.length} persona{lista.length !== 1 ? "s" : ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lista.map(p => {
            const urg = getUrgency(p);
            return (
              <div key={p.id} style={cardS}>
                <Avatar nombre={p.nombre} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{p.nombre}</span>
                    {p.lugar !== SEDE_CENTRAL && <Badge label="Otra sede" bg={C.purple} color={C.purpleText} />}
                    {p.condicion && <Badge label={p.condicion} bg={C.amber} color={C.amberText} />}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{p.area} · {p.lugar}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: urg.bg, color: urg.text, whiteSpace: "nowrap", flexShrink: 0 }}>{urg.label}</span>
                <div style={{ fontSize: 12, color: C.textMuted, minWidth: 72, textAlign: "right", flexShrink: 0 }}>{formatMonth(p.ultimaAsistencia)}</div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { setForm({ nombre: p.nombre, area: p.area, lugar: p.lugar, condicion: p.condicion || "", ultimaAsistencia: p.ultimaAsistencia || "" }); setModal({ id: p.id }); }} style={{ ...btn, padding: "4px 10px", fontSize: 12 }}>Editar</button>
                  <button onClick={() => setConfirmEliminar(p)} style={{ ...btn, padding: "4px 10px", fontSize: 12, color: C.redText }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      </>}

      {tab === "registro" && <>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, padding: "12px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C.textMid }}>Mes del evento:</span>
          <input type="month" value={mesEvento} onChange={e => setMesEvento(e.target.value)} style={inp} />
          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>{seleccionados.size} seleccionada{seleccionados.size !== 1 ? "s" : ""}</span>
          {seleccionados.size > 0 && <button onClick={() => setConfirmMes(true)} style={btnP}>Registrar asistencia</button>}
        </div>
        <input placeholder="Buscar persona..." value={busquedaReg} onChange={e => setBusquedaReg(e.target.value)} style={{ ...inp, width: "100%", marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>Incluir:</span>
          <Chip label="Otra sede" active={otraSedeReg} onClick={() => setOtraSedeReg(v => !v)} />
          <Chip label="Remoto" active={remotoReg} onClick={() => setRemotoReg(v => !v)} />
        </div>
        {seleccionados.size > 0 && (
          <div style={{ marginBottom: 12, padding: "12px 14px", backgroundColor: C.accentLight, borderRadius: 10, border: `1px solid ${C.borderStrong}` }}>
            <div style={{ fontSize: 12, color: C.accentDark, marginBottom: 8, fontWeight: 500 }}>Seleccionados ({seleccionados.size})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(personas || []).filter(p => seleccionados.has(p.id)).map(p => (
                <span key={p.id} onClick={() => setSeleccionados(prev => { const n = new Set(prev); n.delete(p.id); return n; })} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#CECBF6", color: C.accentDark, border: `1px solid ${C.borderStrong}`, cursor: "pointer" }}>
                  {p.nombre} <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.6 }}>×</span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{listaReg.length} persona{listaReg.length !== 1 ? "s" : ""}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {listaReg.map(p => {
            const urg = getUrgency(p);
            const sel = seleccionados.has(p.id);
            return (
              <div key={p.id} onClick={() => setSeleccionados(prev => { const n = new Set(prev); sel ? n.delete(p.id) : n.add(p.id); return n; })} style={{ ...cardS, background: sel ? "#DDD8F8" : C.white, border: sel ? `1.5px solid ${C.accent}` : `1px solid ${C.border}`, cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: sel ? "none" : `1px solid ${C.border}`, background: sel ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {sel && <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>}
                </div>
                <Avatar nombre={p.nombre} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{p.nombre}</span>
                    {p.lugar !== SEDE_CENTRAL && <Badge label="Otra sede" bg={C.purple} color={C.purpleText} />}
                    {p.condicion && <Badge label={p.condicion} bg={C.amber} color={C.amberText} />}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{p.area} · {p.lugar}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: urg.bg, color: urg.text, whiteSpace: "nowrap", flexShrink: 0 }}>{urg.label}</span>
                <div style={{ fontSize: 12, color: C.textMuted, minWidth: 72, textAlign: "right", flexShrink: 0 }}>{formatMonth(p.ultimaAsistencia)}</div>
              </div>
            );
          })}
        </div>
      </>}

      {tab === "eliminados" && <>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
          {!eliminados || eliminados.length === 0 ? "No hay personas eliminadas." : `${eliminados.length} persona${eliminados.length !== 1 ? "s" : ""} eliminada${eliminados.length !== 1 ? "s" : ""} · puedes restaurarlas en cualquier momento`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(eliminados || []).map(p => (
            <div key={p.id} style={{ ...cardS, opacity: 0.85 }}>
              <Avatar nombre={p.nombre} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{p.nombre}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{p.area} · {p.lugar}</div>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, minWidth: 72, textAlign: "right", flexShrink: 0 }}>Última: {formatMonth(p.ultimaAsistencia)}</div>
              <button onClick={() => restaurar(p)} style={{ ...btn, padding: "4px 12px", fontSize: 12, color: C.accentDark, flexShrink: 0 }}>Restaurar</button>
            </div>
          ))}
        </div>
      </>}

      {confirmMes && (
        <Overlay onClose={() => setConfirmMes(false)}>
          <p style={{ margin: "0 0 8px", fontWeight: 500, color: C.text }}>Confirmar asistencia</p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textMid }}>¿Registrar {seleccionados.size} persona{seleccionados.size !== 1 ? "s" : ""} en {formatMonth(mesEvento)}?</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmMes(false)} style={btn}>Cancelar</button>
            <button onClick={registrar} style={btnP}>Confirmar</button>
          </div>
        </Overlay>
      )}

      {confirmEliminar && (
        <Overlay onClose={() => setConfirmEliminar(null)}>
          <p style={{ margin: "0 0 8px", fontWeight: 500, color: C.text }}>¿Eliminar persona?</p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: C.textMid }}><strong>{confirmEliminar.nombre}</strong> será movida a eliminados. Puedes restaurarla en cualquier momento.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setConfirmEliminar(null)} style={btn}>Cancelar</button>
            <button onClick={() => eliminar(confirmEliminar)} style={{ ...btn, background: C.red, color: C.redText, border: `1px solid #F09595` }}>Eliminar</button>
          </div>
        </Overlay>
      )}

      {modal && (
        <Overlay onClose={() => setModal(null)}>
          <p style={{ margin: "0 0 16px", fontWeight: 500, color: C.text }}>{modal === "add" ? "Agregar persona" : "Editar persona"}</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: C.textMid, display: "block", marginBottom: 4 }}>Nombre</label>
            <input value={form.nombre} onChange={e => setForm(x => ({ ...x, nombre: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: C.textMid, display: "block", marginBottom: 4 }}>Área</label>
            <select value={form.area} onChange={e => setForm(x => ({ ...x, area: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
              <option value="">— Seleccionar —</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: C.textMid, display: "block", marginBottom: 4 }}>Lugar</label>
            <select value={form.lugar} onChange={e => setForm(x => ({ ...x, lugar: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
              <option value="">— Seleccionar —</option>
              {lugares.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: C.textMid, display: "block", marginBottom: 4 }}>Condición</label>
            <select value={form.condicion} onChange={e => setForm(x => ({ ...x, condicion: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
              <option value="">Sin condición especial</option>
              <option value="Remoto">Remoto</option>
              <option value="Licencia">Licencia</option>
            </select>
          </div>
          {modal !== "add" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: C.textMid, display: "block", marginBottom: 4 }}>Última participación</label>
              <input type="month" value={form.ultimaAsistencia || ""} onChange={e => setForm(x => ({ ...x, ultimaAsistencia: e.target.value }))} style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setModal(null)} style={btn}>Cancelar</button>
            <button onClick={guardarForm} style={btnP}>Guardar</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}