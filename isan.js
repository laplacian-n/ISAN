/* ISAN — คลังวงจร: a viewer of a catalogue made in advance.
   Nothing here builds a circuit. data/index.js lists the items and their variants; data/items/<id>.js holds, per
   variant, the circuit as the main program's clipboard data and its picture. This file shows them and copies the
   chosen one to the clipboard, where Schematic Studio's Ctrl+V takes it. */
const ISAN = {
  idx: null, data: {}, waiting: {}, cat: "all", q: "", open: null,
  index(o) { this.idx = o; render(); },
  load(id, variants) { this.data[id] = variants; (this.waiting[id] || []).forEach(f => f()); delete this.waiting[id]; },
};
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* which category an item sits in */
const EXTRA_CATS = [{ id: "fsm", label: "FSM / ตรวจจับลำดับบิต" }];
function catOf(it) {
  const m = ISAN.idx.meta;
  if (it.src === "vhdl") return (m.vlib[it.kind] || {}).cat || "other";
  if (it.src === "fsm") return "fsm";
  const c = m.cats.find(c => c.kinds.includes(it.kind) || (it.kind === "clock_divider" && c.kinds.includes("clock_divider")));
  return c ? c.id : "other";
}
function labelOf(it) {
  const m = ISAN.idx.meta;
  if (it.src === "vhdl") return (m.vlib[it.kind] || {}).label || it.kind;
  if (it.src === "fsm") return "ตรวจจับลำดับบิต (sequence detector)";
  if (it.kind === "clock_divider") return "หารความถี่ ÷N (แบ่งขั้นให้เมื่อ N ใหญ่)";
  return (m.parts[it.kind] || {}).label || it.kind;
}
function descOf(it) {
  const m = ISAN.idx.meta;
  if (it.src === "vhdl") return (m.vlib[it.kind] || {}).desc || "";
  if (it.src === "fsm") return "ขาเข้า x ทีละบิต · z = 1 เมื่อเจอลำดับที่เลือก · Moore / Mealy · ซ้อนทับได้หรือไม่";
  if (it.kind === "clock_divider") return "clk_out = clk_in / N · N ≤ 16 = ตัวนับตัวเดียว · N ใหญ่ = ตัวหาร ≤ 10 ต่อกันเป็นทอด (5000 = ÷5 → ÷10 → ÷10 → ÷10)";
  return (m.parts[it.kind] || {}).desc || "";
}
function catList() {
  const m = ISAN.idx.meta, cats = m.cats.filter(c => c.id !== "tools").map(c => ({ id: c.id, label: c.label })).concat(EXTRA_CATS, [{ id: "other", label: "อื่นๆ" }]);
  const n = id => items().filter(it => id === "all" || catOf(it) === id).length;
  return [{ id: "all", label: "ทั้งหมด" }].concat(cats).map(c => Object.assign(c, { n: n(c.id), icon: m.icons[c.id] || m.icons.user || "" })).filter(c => c.n || c.id === "all");
}
function hit(it) {
  const q = ISAN.q.trim().toLowerCase(); if (!q) return true;
  const ports = it.variants[it.def || 0].ports.map(p => p.name).join(" ");
  const hay = (labelOf(it) + " " + descOf(it) + " " + it.kind + " " + ports + (it.src === "vhdl" ? " vhdl" : "")).toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}
function items() { return ISAN.idx.items.filter(hit); }
const fmtPorts = (ports, d) => ports.filter(p => p.dir === d).map(p => esc(p.name)).join(", ") || "—";

/* ---- the list ---- */
function render() {
  if (!ISAN.idx) return;
  if (ISAN.open) return renderItem();
  const cats = catList();
  if (!cats.some(c => c.id === ISAN.cat)) ISAN.cat = "all";
  $("#side").innerHTML = cats.map(c => `<button class="cat ${c.id === ISAN.cat ? "on" : ""}" data-cat="${c.id}"><span class="ic">${c.icon}</span><span class="lb">${esc(c.label)}</span><span class="n">${c.n}</span></button>`).join("");
  const card = it => { const v = it.variants[it.def || 0], vl = it.src === "vhdl";
    return `<div class="card" data-item="${esc(it.id)}"><div class="ct">${esc(labelOf(it))}${vl ? `<span class="badge vl">VHDL</span>` : ""}<span class="badge ok">✓ ตรวจแล้ว</span>${it.variants.length > 1 ? `<span class="badge">${it.variants.length} แบบ</span>` : ""}</div>
      <div class="cd">${esc(descOf(it))}</div><div class="io"><div><b>Input:</b> ${fmtPorts(v.ports, "in")}</div><div><b>Output:</b> ${fmtPorts(v.ports, "out")}</div></div></div>`; };
  const cur = cats.find(c => c.id === ISAN.cat);
  let body;
  if (ISAN.cat === "all" && !ISAN.q.trim())
    body = cats.filter(c => c.id !== "all").map(c => `<div class="sh" data-cat="${c.id}"><span class="ic">${c.icon}</span>${esc(c.label)} <span class="n">${c.n}</span></div>
      <div class="grid">${items().filter(it => catOf(it) === c.id).map(card).join("")}</div>`).join("");
  else { const L = items().filter(it => ISAN.q.trim() || catOf(it) === ISAN.cat);
    body = `<div class="grid">${L.map(card).join("") || `<div class="empty">ไม่พบ “${esc(ISAN.q)}”</div>`}</div>`; }
  $("#main").innerHTML = `<div class="mh"><span class="ic">${cur.icon}</span>${esc(ISAN.q.trim() ? `ผลค้นหา “${ISAN.q}”` : cur.label)}</div>` + body;
}

/* ---- one item: pick the variant, see it, copy it ---- */
const PARAM_LABEL = { n: "จำนวนบิต", m: "นับถึง (m)", cin: "มีขา cin", bus: "ขาแบบบัส", en: "มีขา enable", odd: "parity คี่", active_low: "active-low (บอร์ด EDGE)",
  output: "ขาออก", values: "ลำดับค่า", text: "ข้อความ", mode: "รูปแบบ", clr: "มีขา clr", set: "ชุดตัวอักษร", blank0: "รหัส 0 = ว่าง", down: "นับลง", load: "มีขา load",
  async: "async reset (วงจรเล็กลง)", format: "รูปแบบ", hex: "แสดง 0–F", dp: "จุดทศนิยม", ops: "ชุดคำสั่ง", k: "จำนวนชุดข้อมูล", pattern: "ลำดับบิต", mealy: "แบบ",
  overlap: "ซ้อนทับได้", digits: "จำนวนหลัก", blank: "ดับเลข 0 นำหน้า", line1: "บรรทัด 1", line2: "บรรทัด 2", ch: "ช่อง ADC", baud: "baud", f: "ความถี่ (Hz)" };
/* the same setting means different things on a few items */
const PARAM_LABEL_OF = { multiplier: { n: "บิตของ a", m: "บิตของ b" }, clock_divider: { n: "หารด้วย (N)" }, mod_counter: { n: "นับ 0 … N−1 (N)" },
  jk_counter: { n: "นับ 0 … N−1 (N)" }, mux: { n: "จำนวนขาข้อมูล" }, demux: { n: "จำนวนขาออก" }, encoder: { n: "จำนวนขาเข้า" }, mux_bus: { n: "บิตต่อชุด" } };
const labelFor = (it, k) => (PARAM_LABEL_OF[it.kind] || {})[k] || PARAM_LABEL[k] || k;
const show = (k, v) => typeof v === "boolean" ? (k === "mealy" ? (v ? "Mealy" : "Moore") : (v ? "ใช่" : "ไม่")) : String(v);
function renderItem() {
  const it = ISAN.idx.items.find(x => x.id === ISAN.open.id), V = it.variants, sel = ISAN.open.sel;
  if (!Object.keys(sel).length) Object.assign(sel, V[it.def || 0].params);          // opens on the form's usual settings
  const keys = [...new Set(V.flatMap(v => Object.keys(v.params)))];
  // the variant that matches every choice; else the closest one (most choices equal)
  const score = v => keys.reduce((n, k) => n + (JSON.stringify(v.params[k]) === JSON.stringify(sel[k]) ? 1 : 0), 0);
  let vi = 0, best = -1; V.forEach((x, i) => { const s = score(x); if (s > best) { best = s; vi = i; } });
  const v = V[vi];
  keys.forEach(k => sel[k] = v.params[k]);
  const opts = keys.map(k => { const vals = [...new Set(V.map(x => JSON.stringify(x.params[k])))].map(x => JSON.parse(x)).filter(x => x !== undefined);
    if (vals.length < 2) return "";
    return `<label>${esc(labelFor(it, k))} <select data-k="${esc(k)}">${vals.map(x => `<option value='${esc(JSON.stringify(x))}' ${JSON.stringify(x) === JSON.stringify(sel[k]) ? "selected" : ""}>${esc(show(k, x))}</option>`).join("")}</select></label>`; }).join("");
  const data = ISAN.data[it.id], full = data && data[vi];
  $("#side").innerHTML = catList().map(c => `<button class="cat ${c.id === catOf(it) ? "on" : ""}" data-cat="${c.id}"><span class="ic">${c.icon}</span><span class="lb">${esc(c.label)}</span><span class="n">${c.n}</span></button>`).join("");
  $("#main").innerHTML = `<div class="det"><div class="left">
      <button class="back" data-back="1">← กลับไปคลัง</button>
      <h1>${esc(labelOf(it))}</h1><div class="cd">${esc(descOf(it))}</div>
      ${opts ? `<div class="opts">${opts}</div>` : ""}
      <div class="io"><div><b>Input:</b> ${fmtPorts(v.ports, "in")}</div><div><b>Output:</b> ${fmtPorts(v.ports, "out")}</div></div>
      <div class="how"><b>ชื่อ:</b> ${esc(v.name)}${v.sub && v.sub.length ? ` · แผ่นย่อย: ${esc(v.sub.join(", "))}` : ""}<br><b>ตรวจแล้ว:</b> ${esc(v.how || "")}</div>
      <button class="copy" data-copy="1" ${full ? "" : "disabled"}>${full ? "คัดลอกไปโปรแกรมหลัก" : "กำลังโหลด…"}</button>
      <div class="tip">แล้วไปที่ Schematic Studio คลิกบนแผ่นตรงที่จะวาง กด <b>Ctrl+V</b> — ${it.src === "vhdl" ? "บล็อก VHDL มาพร้อมโค้ด" : "มาเป็นบล็อกเดียว พร้อมแผ่นย่อยที่ใช้"}</div>
    </div><div class="right">${full ? (full.code ? `<pre class="code">${esc(full.code)}</pre>` : `<div class="pic">${full.picture}</div>`) : `<div class="pic"></div>`}</div></div>`;
  if (!data) need(it.id, renderItem);
}
function need(id, then) {
  if (ISAN.data[id]) return then();
  if (ISAN.waiting[id]) { ISAN.waiting[id].push(then); return; }
  ISAN.waiting[id] = [then];
  const s = document.createElement("script"); s.src = `data/items/${id}.js`; document.body.appendChild(s);
}
function copyText(t) {
  if (navigator.clipboard && window.isSecureContext !== false) return navigator.clipboard.writeText(t).then(() => true, () => fallback());
  return Promise.resolve(fallback());
  function fallback() { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (_) {} a.remove(); return ok; }
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3800); }

document.addEventListener("click", e => {
  const c = e.target.closest("[data-cat]"); if (c) { ISAN.cat = c.dataset.cat; ISAN.open = null; ISAN.q = ""; $("#q").value = ""; render(); $("#main").scrollTop = 0; return; }
  const it = e.target.closest("[data-item]"); if (it) { ISAN.open = { id: it.dataset.item, sel: {} }; render(); $("#main").scrollTop = 0; return; }
  if (e.target.closest("[data-back]")) { ISAN.open = null; render(); return; }
  if (e.target.closest("[data-copy]")) {
    const item = ISAN.idx.items.find(x => x.id === ISAN.open.id), V = item.variants;
    const vi = V.findIndex(v => Object.keys(v.params).every(k => JSON.stringify(v.params[k]) === JSON.stringify(ISAN.open.sel[k])));
    const full = ISAN.data[item.id][vi < 0 ? 0 : vi];
    const text = JSON.stringify(Object.assign({ schstudio: "clip", v: 1, win: "isan", project: null, app: "ISAN" }, full.clip));
    copyText(text).then(ok => { toast(ok ? `คัดลอก ${full.name} แล้ว — ไปที่โปรแกรมหลักแล้วกด Ctrl+V` : "คัดลอกไม่ได้");
      const b = document.querySelector("[data-copy]"); if (ok && b) b.textContent = "✓ คัดลอกแล้ว (กดอีกครั้งได้)"; });
  }
});
document.addEventListener("change", e => { const s = e.target.closest("select[data-k]"); if (!s || !ISAN.open) return; ISAN.open.sel[s.dataset.k] = JSON.parse(s.value); renderItem(); });
document.addEventListener("input", e => { if (e.target.id !== "q") return; ISAN.q = e.target.value; ISAN.open = null; render(); });
