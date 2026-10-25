/* ===== คลังวงจร (circuit library): the editor with the library first, and one way out — to the main program =====
   Pick a part / VHDL block / tool in the library, it is generated and checked as in the main program, then
   "คัดลอกไปโปรแกรมหลัก" puts it on the system clipboard (`clipCopySheet`, editor/ux/67-clip.js of the main repo):
   Ctrl+V in Schematic Studio brings the block with every sheet / VHDL block it needs and its verified stamp. */
const CL={last:null};
document.title="คลังวงจร — FPGA Circuit Library";
document.body.classList.add("cl-app");

/* what to copy: the selection, else what was just made, else the sheet on screen */
function clCopy(){
  const sch=activeSch();
  if(state.selection && state.selection.size){
    CLIP.inMenu=true; let ok=false; try{ ok=document.execCommand("copy"); }finally{ CLIP.inMenu=false; }
    if(ok) toast(`คัดลอก ${state.selection.size} ชิ้นที่เลือกแล้ว — ไปที่โปรแกรมหลักแล้วกด Ctrl+V`, "ok", 5000);
    else toast("คัดลอกไม่ได้ — ลองกด Ctrl+C", "warn");
    return;
  }
  if(!sch || !sch.components.some(c=>c.type!=="JUNCTION")){ toast("แผ่นนี้ยังว่าง — เลือกชิ้นส่วนจากคลังก่อน", "warn"); return; }
  if(clipCopySheet(sch)) toast(`คัดลอก “${sch.name}” เป็นบล็อกแล้ว — ไปที่โปรแกรมหลัก คลิกบนแผ่นตรงที่จะวาง แล้วกด Ctrl+V`, "ok", 6000);
  else toast("คัดลอกไม่ได้", "warn");
}
/* the bar that follows each thing made */
function clMade(what){
  CL.last=what; let bar=document.getElementById("clBar");
  if(!bar){ bar=document.createElement("div"); bar.id="clBar"; document.body.appendChild(bar); }
  bar.innerHTML=`<span class="cl-ok">✓</span> <span>${esc(what.label)}</span>
    <button class="btn btn-primary" data-cl="copy">คัดลอกไปโปรแกรมหลัก</button><button class="btn" data-cl="lib">เลือกชิ้นอื่น</button><button class="btn cl-x" data-cl="x" title="ปิด">×</button>`;
  bar.classList.add("show");
}
document.addEventListener("click", e=>{
  const b=e.target.closest && e.target.closest("[data-cl]"); if(!b) return;
  const a=b.dataset.cl;
  if(a==="copy") clCopy();
  else if(a==="lib") openLibrary();
  else if(a==="x"){ const bar=document.getElementById("clBar"); if(bar) bar.classList.remove("show"); }
});
/* a part / generator draws a new sheet: that sheet is what gets copied */
{
  const _bp=MCP_OPS.build_part;
  MCP_OPS.build_part=function(){ const r=_bp.apply(this, arguments);
    try{ state.selection=new Set(); clMade({label:`สร้าง ${r.sheet} แล้ว (${r.verified && r.verified.method || "ตรวจแล้ว"})`}); }catch(_){} return r; };
  const _gen=uxDrawGenerated;
  uxDrawGenerated=function(){ const r=_gen.apply(this, arguments);
    if(r && r.sch){ state.selection=new Set(); clMade({label:`สร้าง ${r.sch.name} แล้ว`}); } return r; };
  // a VHDL block placed on the sheet: that block is selected, so the copy takes it alone
  const _vp=vhdlBlockPlace;
  vhdlBlockPlace=function(){ const c=_vp.apply(this, arguments);
    setTimeout(()=>{ try{ state.selection=new Set([c.id]); renderAll(); clMade({label:`บล็อก VHDL ${c.type.slice(7)} — เลือกไว้แล้ว`}); }catch(_){} }, 0); return c; };
}
/* the header: the library and the way out */
{
  const save=document.querySelector('.topbar [data-act="save-project"]');
  if(save){
    save.insertAdjacentHTML("beforebegin", `<button class="btn cl-libbtn" data-cl="lib" title="เปิดคลังชิ้นส่วน / บล็อก VHDL / เครื่องมือ">คลังวงจร</button>
      <button class="btn btn-primary cl-copybtn" data-cl="copy" title="ที่เลือกอยู่ หรือทั้งแผ่นนี้เป็นบล็อกเดียว → วางในโปรแกรมหลักด้วย Ctrl+V">คัดลอกไปโปรแกรมหลัก</button>`);
  }
  try{ GENERATORS.find(g=>g.id==="library").name="คลังวงจร"; }catch(_){}
}
/* opens on the library (after the editor's own first-run dialog would have shown) */
setTimeout(()=>{ document.querySelectorAll(".modal-bg").forEach(m=>{ if(!m.classList.contains("lib-bg")) m.remove(); }); openLibrary(); }, 900);
