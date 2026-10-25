/* ===== คลังวงจร (ISAN): the library window is the whole program ===========================================
   The page is the library (categories, cards, search) and nothing else. Picking a card opens the same form as in
   the main program; what it makes is generated and checked there, then a result page says what was made and how
   it was checked, with "คัดลอกไปโปรแกรมหลัก": the system clipboard gets it in the main program's clip format
   (editor/ux/67-clip.js of the main repo), and Ctrl+V in Schematic Studio brings it with every sheet / VHDL block
   it needs. The editor still runs underneath (it draws and simulates the parts); "ดูวงจรเต็ม" shows it. */
const CL={known:new Set(), last:null, view:"lib"};
document.title="คลังวงจร";
document.body.classList.add("cl-app", "cl-lib");

/* only what makes a circuit, nothing that belongs to the user's own project */
["report","labhelper","busports","equiv"].forEach(id=>{ const i=GENERATORS.findIndex(g=>g.id===id); if(i>=0) GENERATORS.splice(i,1); });
{
  const _list=libCatList;
  libCatList=function(){ const L=_list.apply(this, arguments).filter(c=>!(c.id==="mine" || c.id==="vhdl" || String(c.id).startsWith("u:")));
    return L.filter((c,i)=>!(c.sep && i===L.length-1)); };          // the "ของฉัน" heading has nothing under it now
  const _items=libItems;
  libItems=function(){ return _items.apply(this, arguments).filter(it=>it.kind!=="mod" && it.kind!=="vhdl"); };
}

/* ---- the library as the page: opened at start, and again whenever a dialog closed it ---- */
function clShowLib(){
  if(!document.querySelector(".lib-bg")){ openLibrary(); const m=document.querySelector(".lib-bg");
    if(m){ m.classList.add("cl-page"); const h=m.querySelector(".modal h2"); if(h && h.firstChild) h.firstChild.textContent="คลังวงจร"; } }
}
new MutationObserver(()=>{
  if(CL.ready && CL.view==="lib" && !CL.busy && !document.querySelector(".lib-bg") && !document.querySelector(".modal-bg")){ CL.busy=true; setTimeout(()=>{ CL.busy=false; clAfterDialog(); }, 30); }
}).observe(document.body, {childList:true});

/* what a dialog made: a part / generator → its sheet; a VHDL block placed → that block alone */
{
  const how=name=>((state.project.customs[name]||{}).description||"").split(" — ").slice(1).join(" — ");
  const _bp=MCP_OPS.build_part;
  MCP_OPS.build_part=function(){ const r=_bp.apply(this, arguments); try{ CL.last={kind:"sheet", name:r.sheet, how:r.verified && r.verified.method}; }catch(_){} return r; };
  const _vp=vhdlBlockPlace;
  vhdlBlockPlace=function(name, sch){ const c=_vp.apply(this, arguments); CL.last={kind:"vhdl", name, sheet:(sch||activeSch()).id, cid:c.id, how:how(name)}; return c; };
  const _wrap=vhdlWrapSheet;
  vhdlWrapSheet=function(sch, name){ const r=_wrap.apply(this, arguments); CL.last={kind:"sheet", name:sch.name, how:how(name)}; return r; };
}
function clAfterDialog(){
  let what=CL.last; CL.last=null;
  if(!what){                                   // a tool (truth table, FSM, counter …) drew a new sheet
    const fresh=Object.values(state.project.schematics).filter(s=>!CL.known.has(s.id) && s.components.some(c=>c.type!=="JUNCTION"));
    const s=fresh[fresh.length-1];
    if(s) what={kind:"sheet", name:s.name, how:sheetVerified(s) ? s.verified.how : ""};
  }
  Object.values(state.project.schematics).forEach(s=>CL.known.add(s.id));
  if(what) clResult(what); else clShowLib();
}

/* ---- the result page ---- */
function clSheetByName(n){ return Object.values(state.project.schematics).find(s=>s.name===n); }
function clResult(what){
  CL.view="result"; CL.cur=what;
  document.querySelectorAll(".lib-bg").forEach(m=>m.remove());
  let el=document.getElementById("clResult");
  if(!el){ el=document.createElement("div"); el.id="clResult"; document.body.appendChild(el); }
  el.style.display="";
  let title="", ports=[], pic="";
  if(what.kind==="vhdl"){ const cc=state.project.customs[what.name]; title=`บล็อก VHDL ${what.name}`;
    ports=(cc.ports||[]).map(p=>({dir:p.dir, n:p.width>1?`${p.name}[${p.width-1}:0]`:p.name}));
    pic=`<pre class="cl-vhdl">${esc(cc.vhdl)}</pre>`; }
  else { const s=clSheetByName(what.name); title=s.name;
    ports=schPortList(s).map(p=>({dir:p.dir, n:p.width>1?`${p.id}[${p.width-1}:0]`:p.id}));
    pic=`<div class="cl-pic">${clSheetSvg(s)}</div>`; }
  const fmt=d=>ports.filter(p=>p.dir===d).map(p=>esc(p.n)).join(", ")||"—";
  el.innerHTML=`<div class="cl-res">
    <div class="cl-head"><button class="btn" data-cl="back">← กลับไปคลัง</button><b>${esc(title)}</b>
      ${what.how?`<span class="pt-badge ok" title="${esc(what.how)}">✓ ตรวจแล้ว</span>`:""}</div>
    <div class="cl-body">
      <div class="cl-side">
        <div class="lib-io"><div><b>Input:</b> ${fmt("in")}</div><div><b>Output:</b> ${fmt("out")}</div></div>
        ${what.how?`<div class="cl-how"><b>ตรวจแล้ว:</b> ${esc(what.how)}</div>`:""}
        <button class="btn btn-primary cl-big" data-cl="copy">คัดลอกไปโปรแกรมหลัก</button>
        <div class="muted cl-tip">แล้วไปที่ Schematic Studio คลิกบนแผ่นตรงที่จะวาง กด <b>Ctrl+V</b> — ${what.kind==="vhdl"?"บล็อก VHDL มาพร้อมโค้ด":"มาเป็นบล็อกเดียว พร้อมแผ่นย่อยที่ใช้"}</div>
        ${what.kind==="vhdl"?"":`<button class="btn" data-cl="open">ดูวงจรเต็ม / จำลอง</button>`}
      </div>
      <div class="cl-main">${pic}</div>
    </div></div>`;
}
/* a picture of the sheet as the editor draws it (its canvas SVG, framed on the drawing) */
function clSheetSvg(s){
  try{
    openSchTab(s.id); renderAll();
    const svg=document.getElementById("canvas"); if(!svg) return thumbnailSvg(s);   // the canvas IS the svg; its first group is the drawing
    const g=svg.firstElementChild, box=g.getBBox();
    const c=svg.cloneNode(true); c.removeAttribute("width"); c.removeAttribute("height"); c.removeAttribute("style"); c.removeAttribute("id");
    const cg=c.firstElementChild; if(cg) cg.removeAttribute("transform");
    c.querySelectorAll(".bp-clk, .grid, [data-grid]").forEach(x=>x.remove());
    c.setAttribute("viewBox", `${box.x-20} ${box.y-20} ${box.width+40} ${box.height+40}`); c.setAttribute("preserveAspectRatio", "xMidYMid meet");
    return c.outerHTML;
  }catch(e){ console.warn("picture", e); return thumbnailSvg(s); }
}
function clCopy(){
  const w=CL.cur; if(!w) return;
  let ok=false;
  if(w.kind==="vhdl"){
    const s=state.project.schematics[w.sheet], c=s && s.components.find(x=>x.id===w.cid);
    const need=clipNeeds([c]);
    CLIP.pending={kind:"parts", components:[JSON.parse(JSON.stringify(c))], wires:[], ties:[], sheets:need.sheets, customs:need.customs};
    try{ ok=document.execCommand("copy"); }catch(_){}
    if(!ok && navigator.clipboard){ navigator.clipboard.writeText(clipText(CLIP.pending)).catch(()=>{}); ok=true; }
    CLIP.pending=null;
  } else ok=clipCopySheet(clSheetByName(w.name));
  const b=document.querySelector('#clResult [data-cl="copy"]');
  if(ok){ toast("คัดลอกแล้ว — ไปที่โปรแกรมหลักแล้วกด Ctrl+V", "ok", 5000); if(b) b.textContent="✓ คัดลอกแล้ว (กดอีกครั้งได้)"; }
  else toast("คัดลอกไม่ได้", "warn");
}
document.addEventListener("click", e=>{
  const b=e.target.closest && e.target.closest("[data-cl]"); if(!b) return;
  const a=b.dataset.cl;
  if(a==="copy") clCopy();
  else if(a==="back"){ CL.view="lib"; document.body.classList.add("cl-lib"); const r=document.getElementById("clResult"); if(r) r.remove(); clShowLib(); }
  else if(a==="open"){ CL.view="editor"; document.body.classList.remove("cl-lib"); const r=document.getElementById("clResult"); if(r) r.style.display="none";
    const s=clSheetByName(CL.cur.name); if(s){ openSchTab(s.id); renderAll(); try{ zoomFit(); }catch(_){} }
    let bar=document.getElementById("clBar"); if(!bar){ bar=document.createElement("div"); bar.id="clBar"; document.body.appendChild(bar); }
    bar.innerHTML=`<button class="btn" data-cl="result">← กลับ</button><button class="btn btn-primary" data-cl="copy">คัดลอกไปโปรแกรมหลัก</button>`; bar.style.display="flex"; }
  else if(a==="result"){ document.body.classList.add("cl-lib"); const bar=document.getElementById("clBar"); if(bar) bar.style.display="none"; clResult(CL.cur); }
});
/* start: the editor's own first-run dialog never shows; the library fills the page */
setTimeout(()=>{ document.querySelectorAll(".modal-bg").forEach(m=>m.remove());
  Object.values(state.project.schematics).forEach(s=>CL.known.add(s.id)); clShowLib(); CL.ready=true; }, 700);
