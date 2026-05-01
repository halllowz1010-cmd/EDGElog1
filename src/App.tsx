import { useState, useRef, useEffect, useCallback } from "react";

// ── Fonts ─────────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500;700&display=swap";
document.head.appendChild(fontLink);

// ── Utils ─────────────────────────────────────────────────────────────────────
const rId = () => Math.random().toString(36).slice(2,9);
const fmt = (n) => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0}).format(n);
const fmtS = (n) => (n >= 0 ? "+" : "") + fmt(n);

async function askClaude(system, user) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system,messages:[{role:"user",content:user}]})
    });
    const d = await res.json();
    return d.content?.[0]?.text || "No response.";
  } catch { return "Connection error."; }
}

// ── Design System ─────────────────────────────────────────────────────────────
const C = {
  bg: "#080c10",
  surface: "#0e1419",
  surfaceHigh: "#141c24",
  surfaceHigher: "#1a2433",
  border: "#1e2d3d",
  borderBright: "#2a3f55",
  text: "#e8f0f8",
  textMid: "#8ba0b8",
  textDim: "#3d5470",
  green: "#00e5a0",
  greenDark: "#00a86b",
  greenGlow: "rgba(0,229,160,0.15)",
  greenDim: "rgba(0,229,160,0.08)",
  red: "#ff4d6d",
  redDark: "#cc2244",
  redGlow: "rgba(255,77,109,0.15)",
  redDim: "rgba(255,77,109,0.08)",
  gold: "#f5c842",
  goldGlow: "rgba(245,200,66,0.15)",
  blue: "#4dabf7",
  blueGlow: "rgba(77,171,247,0.15)",
  purple: "#b197fc",
  purpleGlow: "rgba(177,151,252,0.15)",
  cyan: "#22d3ee",
};

const mono = "'JetBrains Mono', monospace";
const display = "'Syne', sans-serif";
const body = "'Space Grotesk', sans-serif";

// ── Particle System ───────────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef();
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const particles = Array.from({length:60},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3,
      r:Math.random()*1.5+0.5,
      a:Math.random(),
      color:Math.random()<0.5?C.green:Math.random()<0.5?C.blue:C.purple,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H)p.y=0;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = p.color + "40";
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const resize = () => { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; };
    window.addEventListener("resize",resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.6}}/>;
}

// ── Confetti burst ────────────────────────────────────────────────────────────
function ConfettiBurst({ active, onDone }) {
  const canvasRef = useRef();
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({length:120},()=>({
      x: canvas.width/2, y: canvas.height/2,
      vx:(Math.random()-0.5)*18, vy:(Math.random()-1.2)*16,
      w:Math.random()*10+4, h:Math.random()*6+3,
      color:[C.green,C.gold,C.blue,C.purple,C.cyan][Math.floor(Math.random()*5)],
      rot:Math.random()*360, rotV:(Math.random()-0.5)*8, gravity:0.4, life:1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.life -= 0.018;
        if(p.life <= 0) return; alive = true;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      if(alive) raf = requestAnimationFrame(draw);
      else { ctx.clearRect(0,0,canvas.width,canvas.height); onDone(); }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  },[active]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9998}}/>;
}

// ── Glow Number ───────────────────────────────────────────────────────────────
function GlowNum({ val, prev, prefix="", suffix="" }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev !== undefined && prev !== val) { setFlash(true); setTimeout(()=>setFlash(false),600); }
  },[val]);
  const color = typeof val === "number" ? (val >= 0 ? C.green : C.red) : C.text;
  return (
    <span style={{ color, transition:"color 0.3s",
      textShadow: flash ? `0 0 20px ${color}` : "none",
      display:"inline-block", transform:flash?"scale(1.08)":"scale(1)", transition:"transform 0.2s, text-shadow 0.3s" }}>
      {prefix}{typeof val==="number"?fmtS(val):val}{suffix}
    </span>
  );
}

// ── Win Rate Ring ─────────────────────────────────────────────────────────────
function WinRateRing({ rate, size=120 }) {
  const r = 46, circ = 2*Math.PI*r;
  const dash = (rate/100)*circ;
  const color = rate >= 60 ? C.green : rate >= 45 ? C.gold : C.red;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{transition:"stroke-dasharray 1s ease, stroke 0.5s",filter:`drop-shadow(0 0 6px ${color})`}}/>
      <text x={size/2} y={size/2+6} textAnchor="middle" fill={color}
        style={{fontSize:22,fontFamily:mono,fontWeight:700,transform:"rotate(90deg)",transformOrigin:`${size/2}px ${size/2}px`,
          filter:`drop-shadow(0 0 8px ${color})`}}>
        {rate}%
      </text>
    </svg>
  );
}

// ── Equity Curve ──────────────────────────────────────────────────────────────
function EquityCurve({ trades, height=140 }) {
  if (!trades.length) return (
    <div style={{textAlign:"center",padding:"40px 0",color:C.textDim,fontSize:13,fontFamily:body}}>
      No data yet
    </div>
  );
  const cum = []; let s = 0;
  [...trades].reverse().forEach(t => { s += t.pnl; cum.push(s); });
  if (cum.length===1) cum.unshift(0);
  const mn = Math.min(0,...cum), mx = Math.max(...cum,1), rng = mx-mn||1;
  const W=500, H=100;
  const pts = cum.map((v,i)=>({x:(i/(cum.length-1||1))*W, y:H-((v-mn)/rng)*H}));
  const d = pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  const area = `M0,${H} ${d} L${W},${H}Z`;
  const col = s>=0?C.green:C.red;
  const glowId = "eqglow"+Math.random().toString(36).slice(2,6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height}} preserveAspectRatio="none">
      <defs>
        <linearGradient id={glowId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={col} stopOpacity="0"/>
        </linearGradient>
        <filter id="gf"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <path d={area} fill={`url(#${glowId})`}/>
      <path d={d} fill="none" stroke={col} strokeWidth="1" strokeLinejoin="round" filter="url(#gf)" opacity="0.5"/>
      <path d={d} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"
        style={{filter:`drop-shadow(0 0 4px ${col})`}}/>
      {pts.length>0&&<circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="4" fill={col}
        style={{filter:`drop-shadow(0 0 8px ${col})`}}/>}
    </svg>
  );
}

// ── PnL Calendar ─────────────────────────────────────────────────────────────
function PnlCalendar({ trades }) {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(),now.getMonth(),1));
  const y=month.getFullYear(), m=month.getMonth();
  const firstDay=new Date(y,m,1).getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const byDay={};
  trades.forEach(t=>{
    if(!byDay[t.date]) byDay[t.date]={pnl:0,count:0};
    byDay[t.date].pnl+=t.pnl; byDay[t.date].count++;
  });
  const monthKey=`${y}-${String(m+1).padStart(2,"0")}`;
  const monthPnl=Object.entries(byDay).filter(([d])=>d.startsWith(monthKey)).reduce((a,[,v])=>a+v.pnl,0);
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={()=>setMonth(new Date(y,m-1,1))} style={navBtn}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:display,fontSize:16,color:C.text,fontWeight:700}}>{MONTHS[m]} {y}</div>
          {trades.length>0&&<div style={{fontFamily:mono,fontSize:12,color:monthPnl>=0?C.green:C.red,marginTop:2}}>{fmtS(monthPnl)}</div>}
        </div>
        <button onClick={()=>setMonth(new Date(y,m+1,1))} style={navBtn}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
          <div key={d} style={{fontSize:9,color:C.textDim,textAlign:"center",fontFamily:body,fontWeight:600,letterSpacing:"0.08em"}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((day,i)=>{
          if(!day) return <div key={i}/>;
          const key=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const data=byDay[key];
          const today=new Date();
          const isToday=today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===day;
          const bg=data?(data.pnl>=0?C.greenDim:C.redDim):C.surface;
          const bc=data?(data.pnl>=0?C.green+"44":C.red+"44"):C.border;
          return (
            <div key={i} style={{background:bg,borderRadius:4,padding:"4px 2px",minHeight:36,textAlign:"center",
              border:`1px solid ${isToday?C.cyan:bc}`,boxShadow:data?`0 0 8px ${data.pnl>=0?C.green+"20":C.red+"20"}`:"none"}}>
              <div style={{fontSize:9,color:C.textMid}}>{day}</div>
              {data&&<div style={{fontFamily:mono,fontSize:8,color:data.pnl>=0?C.green:C.red,marginTop:1,lineHeight:1.2,fontWeight:700}}>
                {data.pnl>=0?"+":""}{Math.abs(data.pnl)<1000?data.pnl:(data.pnl/1000).toFixed(1)+"k"}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn = {background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 12px",
  cursor:"pointer",fontFamily:body,fontSize:14,color:C.textMid,transition:"all 0.15s"};

// ── Image Upload ──────────────────────────────────────────────────────────────
function ImageUpload({images,onChange}) {
  const ref=useRef();
  const [drag,setDrag]=useState(false);
  const handle=(files)=>{
    Promise.all(Array.from(files).filter(f=>f.type.startsWith("image/")).map(f=>new Promise(res=>{
      const r=new FileReader();r.onload=e=>res({id:rId(),url:e.target.result,name:f.name});r.readAsDataURL(f);
    }))).then(imgs=>onChange([...images,...imgs]));
  };
  return (
    <div>
      <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files);}}
        onClick={()=>ref.current?.click()}
        style={{border:`1.5px dashed ${drag?C.green:C.border}`,borderRadius:8,padding:"14px 12px",
          textAlign:"center",cursor:"pointer",background:drag?C.greenDim:C.surface,transition:"all 0.2s",
          boxShadow:drag?`0 0 20px ${C.greenGlow}`:"none"}}>
        <div style={{fontSize:12,color:C.textMid,fontFamily:body}}>Drop charts or <span style={{color:C.green,fontWeight:600}}>browse</span></div>
        <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handle(e.target.files)}/>
      </div>
      {images.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:8}}>
          {images.map(img=>(
            <div key={img.id} style={{position:"relative",borderRadius:6,overflow:"hidden",aspectRatio:"16/9",border:`1px solid ${C.border}`}}>
              <img src={img.url} alt={img.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              <button onClick={e=>{e.stopPropagation();onChange(images.filter(i=>i.id!==img.id));}}
                style={{position:"absolute",top:3,right:3,background:"rgba(0,0,0,0.8)",border:"none",
                  color:"#fff",borderRadius:"50%",width:18,height:18,cursor:"pointer",fontSize:10}}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGallery({images}) {
  const [lb,setLb]=useState(null);
  if(!images?.length) return null;
  return (
    <div>
      <div style={{...labelSt,marginBottom:8}}>Charts ({images.length})</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
        {images.map(img=>(
          <div key={img.id} onClick={()=>setLb(img)}
            style={{borderRadius:6,overflow:"hidden",aspectRatio:"16/9",border:`1px solid ${C.border}`,cursor:"zoom-in"}}>
            <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>
        ))}
      </div>
      {lb&&(
        <div onClick={()=>setLb(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={lb.url} style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}}/>
        </div>
      )}
    </div>
  );
}

// ── Setup Checklist ───────────────────────────────────────────────────────────
function SetupChecklist({setup,checked,onChange}) {
  if(!setup?.items?.length) return null;
  return (
    <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",margin:"10px 0"}}>
      <div style={{...labelSt,marginBottom:10}}>{setup.name} Checklist</div>
      {setup.items.map(item=>(
        <label key={item.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,cursor:"pointer"}}>
          <div onClick={()=>onChange(item.id)} style={{
            width:16,height:16,borderRadius:4,flexShrink:0,cursor:"pointer",transition:"all 0.15s",
            border:`1.5px solid ${checked.includes(item.id)?setup.color:C.borderBright}`,
            background:checked.includes(item.id)?setup.color:"transparent",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:checked.includes(item.id)?`0 0 8px ${setup.color}66`:"none",
          }}>
            {checked.includes(item.id)&&<span style={{color:"#000",fontSize:9,fontWeight:900,lineHeight:1}}>✓</span>}
          </div>
          <span style={{fontSize:13,color:checked.includes(item.id)?C.text:C.textMid,fontFamily:body,transition:"color 0.15s"}}>{item.text}</span>
        </label>
      ))}
      <div style={{fontSize:11,color:C.textDim,fontFamily:mono,marginTop:4}}>
        {checked.length} / {setup.items.length} conditions
      </div>
    </div>
  );
}

// ── Setup Manager ─────────────────────────────────────────────────────────────
function SetupManager({setups,tags,onSaveSetups,onSaveTags,onClose}) {
  const [activeTab,setActiveTab]=useState("setups");
  const [setupList,setSetupList]=useState(setups.map(s=>({...s,items:[...s.items]})));
  const [tagList,setTagList]=useState([...tags]);
  const [expandedId,setExpandedId]=useState(null);
  const [newSetupName,setNewSetupName]=useState("");
  const [newItemText,setNewItemText]=useState({});
  const [newTagText,setNewTagText]=useState("");

  const addSetup=()=>{if(!newSetupName.trim())return;const ns={id:rId(),name:newSetupName.trim(),color:C.green,items:[]};setSetupList(p=>[...p,ns]);setExpandedId(ns.id);setNewSetupName("");};
  const deleteSetup=(id)=>{setSetupList(p=>p.filter(s=>s.id!==id));if(expandedId===id)setExpandedId(null);};
  const addItem=(id)=>{const txt=newItemText[id]?.trim();if(!txt)return;setSetupList(p=>p.map(s=>s.id===id?{...s,items:[...s.items,{id:rId(),text:txt}]}:s));setNewItemText(p=>({...p,[id]:""}));};
  const removeItem=(sid,iid)=>setSetupList(p=>p.map(s=>s.id===sid?{...s,items:s.items.filter(i=>i.id!==iid)}:s));
  const addTag=()=>{if(!newTagText.trim())return;setTagList(p=>[...p,{id:rId(),text:newTagText.trim()}]);setNewTagText("");};
  const removeTag=(id)=>setTagList(p=>p.filter(t=>t.id!==id));

  const COLORS=[C.green,"#ff4d6d","#4dabf7","#f5c842","#b197fc","#22d3ee","#ff9f43","#fd79a8"];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div style={{width:"100%",maxWidth:640,maxHeight:"88vh",overflow:"auto",borderRadius:16,
        background:C.surface,border:`1px solid ${C.borderBright}`,boxShadow:`0 0 60px rgba(0,0,0,0.8), 0 0 30px ${C.blueGlow}`}}>
        <div style={{padding:"24px 28px 0",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div>
              <div style={{fontFamily:display,fontSize:22,color:C.text,fontWeight:800}}>Playbook Settings</div>
              <div style={{fontSize:12,color:C.textMid,fontFamily:body,marginTop:3}}>Build your trading system</div>
            </div>
            <button onClick={()=>{onSaveSetups(setupList);onSaveTags(tagList);onClose();}}
              style={{...glowBtn(C.green),padding:"8px 20px",fontSize:13}}>Save & Close</button>
          </div>
          <div style={{display:"flex",gap:0}}>
            {[["setups","Setups"],["tags","Tags"]].map(([k,l])=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                style={{padding:"8px 20px",border:"none",borderBottom:activeTab===k?`2px solid ${C.green}`:"2px solid transparent",
                  background:"none",cursor:"pointer",fontFamily:body,fontSize:13,fontWeight:600,
                  color:activeTab===k?C.green:C.textMid,marginBottom:-1,transition:"color 0.15s"}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{padding:24}}>
          {activeTab==="setups"&&(
            <>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <input style={inputSt} placeholder="New setup name…" value={newSetupName}
                  onChange={e=>setNewSetupName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSetup()}/>
                <button onClick={addSetup} style={{...glowBtn(C.green),padding:"9px 18px",whiteSpace:"nowrap"}}>+ Add</button>
              </div>
              {setupList.map(s=>(
                <div key={s.id} style={{...cardSt,marginBottom:10,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",cursor:"pointer"}} onClick={()=>setExpandedId(expandedId===s.id?null:s.id)}>
                    <div style={{width:12,height:12,borderRadius:"50%",background:s.color,boxShadow:`0 0 8px ${s.color}`,flexShrink:0}}/>
                    <div style={{flex:1,fontFamily:body,fontSize:14,color:C.text,fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:11,color:C.textDim,fontFamily:mono}}>{s.items.length} items</div>
                    <div style={{display:"flex",gap:4}}>
                      {COLORS.map(col=>(
                        <div key={col} onClick={e=>{e.stopPropagation();setSetupList(p=>p.map(x=>x.id===s.id?{...x,color:col}:x));}}
                          style={{width:14,height:14,borderRadius:"50%",background:col,cursor:"pointer",
                            border:s.color===col?`2px solid #fff`:"none",boxSizing:"border-box"}}/>
                      ))}
                    </div>
                    <button onClick={e=>{e.stopPropagation();deleteSetup(s.id);}}
                      style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:14}}>✕</button>
                  </div>
                  {expandedId===s.id&&(
                    <div style={{padding:"0 16px 14px",borderTop:`1px solid ${C.border}`}}>
                      {s.items.map(item=>(
                        <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                          <span style={{flex:1,fontSize:13,color:C.textMid,fontFamily:body}}>{item.text}</span>
                          <button onClick={()=>removeItem(s.id,item.id)} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:12}}>✕</button>
                        </div>
                      ))}
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <input style={{...inputSt,flex:1,fontSize:12}} placeholder="Add checklist item…"
                          value={newItemText[s.id]||""}
                          onChange={e=>setNewItemText(p=>({...p,[s.id]:e.target.value}))}
                          onKeyDown={e=>e.key==="Enter"&&addItem(s.id)}/>
                        <button onClick={()=>addItem(s.id)} style={{...glowBtn(C.blue),padding:"7px 14px",fontSize:12}}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          {activeTab==="tags"&&(
            <>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                <input style={inputSt} placeholder="New tag…" value={newTagText} onChange={e=>setNewTagText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTag()}/>
                <button onClick={addTag} style={{...glowBtn(C.green),padding:"9px 18px"}}>+ Add</button>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {tagList.map(t=>(
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
                    borderRadius:20,background:C.surfaceHigh,border:`1px solid ${C.borderBright}`,fontFamily:body,fontSize:13,color:C.text}}>
                    {t.text}
                    <button onClick={()=>removeTag(t.id)} style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const labelSt = {
  display:"block",fontSize:10,color:C.textDim,letterSpacing:"0.12em",
  textTransform:"uppercase",marginBottom:6,fontFamily:body,fontWeight:700,
};
const inputSt = {
  width:"100%",background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:8,
  padding:"10px 14px",color:C.text,fontSize:13,fontFamily:body,boxSizing:"border-box",outline:"none",
  transition:"border-color 0.2s, box-shadow 0.2s",
};
const cardSt = {
  background:C.surfaceHigh,border:`1px solid ${C.border}`,borderRadius:12,
  boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
};
const glowBtn = (color) => ({
  background:`linear-gradient(135deg, ${color}22, ${color}11)`,
  color:color,border:`1px solid ${color}66`,borderRadius:8,
  padding:"10px 20px",cursor:"pointer",fontFamily:body,fontSize:13,fontWeight:700,
  transition:"all 0.2s",boxShadow:`0 0 10px ${color}22`,
  letterSpacing:"0.03em",
});
const solidBtn = (color,bg) => ({
  background:bg||color,color:bg?"#000":"#fff",border:"none",borderRadius:8,
  padding:"10px 22px",cursor:"pointer",fontFamily:body,fontSize:13,fontWeight:700,
  boxShadow:`0 0 20px ${color}44`,transition:"all 0.2s",
});

// ── Stats Dashboard ───────────────────────────────────────────────────────────
function StatCard({label,value,sub,color,icon,glow}) {
  return (
    <div style={{...cardSt,padding:"18px 20px",position:"relative",overflow:"hidden",
      boxShadow:glow?`0 0 30px ${color}22, 0 4px 20px rgba(0,0,0,0.4)`:"0 4px 20px rgba(0,0,0,0.3)"}}>
      <div style={{position:"absolute",top:0,right:0,width:60,height:60,
        background:`radial-gradient(circle at top right, ${color}15, transparent 70%)`,borderRadius:"0 12px 0 0"}}/>
      <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
      <div style={{...labelSt,marginBottom:4}}>{label}</div>
      <div style={{fontFamily:mono,fontSize:22,fontWeight:700,color:color,
        textShadow:glow?`0 0 20px ${color}`:"none"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.textDim,fontFamily:body,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ── Advanced Stats ────────────────────────────────────────────────────────────
function AdvancedStats({ trades, setups, tags }) {
  if (!trades.length) return null;
  const wins = trades.filter(t=>t.pnl>0);
  const losses = trades.filter(t=>t.pnl<0);
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  const winRate = trades.length ? Math.round(wins.length/trades.length*100) : 0;
  const avgWin = wins.length ? wins.reduce((a,t)=>a+t.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a,t)=>a+t.pnl,0)/losses.length) : 0;
  const pf = avgLoss>0 ? (avgWin/avgLoss).toFixed(2) : "∞";
  const rrAvg = avgLoss>0 ? (avgWin/avgLoss).toFixed(2) : "∞";

  // Streaks
  let curStreak=0, maxWin=0, maxLoss=0, cw=0, cl=0;
  [...trades].reverse().forEach(t=>{
    if(t.pnl>0){cw++;cl=0;maxWin=Math.max(maxWin,cw);}
    else{cl++;cw=0;maxLoss=Math.max(maxLoss,cl);}
  });
  const lastDir = trades[0]?.pnl>0;
  trades.some(t=>{if((t.pnl>0)===lastDir){curStreak++;}else return true;});

  // By setup performance
  const setupStats = setups.map(s=>{
    const st = trades.filter(t=>t.setup===s.id);
    if(!st.length) return null;
    const sw = st.filter(t=>t.pnl>0);
    const wr = Math.round(sw.length/st.length*100);
    const avg = st.reduce((a,t)=>a+t.pnl,0)/st.length;
    return {name:s.name,color:s.color,count:st.length,wr,avg};
  }).filter(Boolean).sort((a,b)=>b.avg-a.avg);

  // By emotion
  const emotionMap={};
  trades.forEach(t=>{
    if(!emotionMap[t.emotion]) emotionMap[t.emotion]={wins:0,total:0,pnl:0};
    emotionMap[t.emotion].total++;
    emotionMap[t.emotion].pnl+=t.pnl;
    if(t.pnl>0) emotionMap[t.emotion].wins++;
  });
  const emotionStats = Object.entries(emotionMap).map(([e,d])=>({emotion:e,...d,wr:Math.round(d.wins/d.total*100)})).sort((a,b)=>b.wr-a.wr).slice(0,5);

  // Best day of week
  const dowMap={};
  trades.forEach(t=>{
    const dow=new Date(t.date+"T12:00").toLocaleDateString("en-US",{weekday:"short"});
    if(!dowMap[dow]) dowMap[dow]={pnl:0,count:0,wins:0};
    dowMap[dow].pnl+=t.pnl; dowMap[dow].count++; if(t.pnl>0) dowMap[dow].wins++;
  });
  const dowStats=Object.entries(dowMap).sort((a,b)=>b[1].pnl-a[1].pnl);

  // Max drawdown
  let peak=0, dd=0;
  let cum=0;
  [...trades].reverse().forEach(t=>{cum+=t.pnl;if(cum>peak)peak=cum;if(peak-cum>dd)dd=peak-cum;});

  // Largest win / loss
  const bigWin = wins.length ? Math.max(...wins.map(t=>t.pnl)) : 0;
  const bigLoss = losses.length ? Math.min(...losses.map(t=>t.pnl)) : 0;

  return (
    <div>
      {/* Setup performance */}
      {setupStats.length>0&&(
        <div style={{...cardSt,padding:20,marginBottom:16}}>
          <div style={{...labelSt,marginBottom:14,fontSize:11}}>Setup Performance</div>
          {setupStats.map(s=>(
            <div key={s.name} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:s.color,boxShadow:`0 0 6px ${s.color}`}}/>
                  <span style={{fontFamily:body,fontSize:13,color:C.text}}>{s.name}</span>
                  <span style={{fontFamily:mono,fontSize:10,color:C.textDim}}>{s.count} trades</span>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontFamily:mono,fontSize:12,color:s.wr>=50?C.green:C.red}}>{s.wr}% WR</span>
                  <span style={{fontFamily:mono,fontSize:12,color:s.avg>=0?C.green:C.red}}>{fmtS(Math.round(s.avg))} avg</span>
                </div>
              </div>
              <div style={{height:4,background:C.surface,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:s.wr+"%",background:`linear-gradient(90deg, ${s.color}, ${s.color}88)`,borderRadius:2,
                  boxShadow:`0 0 6px ${s.color}44`,transition:"width 0.6s ease"}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streak & advanced metrics */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{...cardSt,padding:16}}>
          <div style={{...labelSt,marginBottom:10}}>Streaks</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Current streak</span>
              <span style={{fontFamily:mono,fontSize:12,color:lastDir?C.green:C.red,fontWeight:700}}>
                {lastDir?"🔥":"❄️"} {curStreak} {lastDir?"W":"L"}
              </span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Best win streak</span>
              <span style={{fontFamily:mono,fontSize:12,color:C.green}}>{maxWin}W</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Worst loss streak</span>
              <span style={{fontFamily:mono,fontSize:12,color:C.red}}>{maxLoss}L</span>
            </div>
          </div>
        </div>
        <div style={{...cardSt,padding:16}}>
          <div style={{...labelSt,marginBottom:10}}>Risk Metrics</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Max drawdown</span>
              <span style={{fontFamily:mono,fontSize:12,color:C.red}}>{fmt(dd)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Largest win</span>
              <span style={{fontFamily:mono,fontSize:12,color:C.green}}>{fmtS(bigWin)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:C.textMid,fontSize:12,fontFamily:body}}>Largest loss</span>
              <span style={{fontFamily:mono,fontSize:12,color:C.red}}>{fmtS(bigLoss)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mindset vs Performance */}
      {emotionStats.length>0&&(
        <div style={{...cardSt,padding:20,marginBottom:16}}>
          <div style={{...labelSt,marginBottom:12}}>Mindset vs Performance (top 5)</div>
          {emotionStats.map(e=>{
            const clr = e.wr>=60?C.green:e.wr>=45?C.gold:C.red;
            return (
              <div key={e.emotion} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <span style={{fontFamily:body,fontSize:12,color:C.textMid,width:90,flexShrink:0}}>{e.emotion}</span>
                <div style={{flex:1,height:20,background:C.surface,borderRadius:4,overflow:"hidden",position:"relative"}}>
                  <div style={{position:"absolute",inset:0,width:e.wr+"%",background:`linear-gradient(90deg,${clr}55,${clr}22)`,
                    borderRadius:4,transition:"width 0.5s ease"}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:8}}>
                    <span style={{fontFamily:mono,fontSize:10,color:clr,fontWeight:700}}>{e.wr}% WR</span>
                  </div>
                </div>
                <span style={{fontFamily:mono,fontSize:11,color:e.pnl>=0?C.green:C.red,width:60,textAlign:"right"}}>
                  {fmtS(Math.round(e.pnl))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Best days of week */}
      {dowStats.length>0&&(
        <div style={{...cardSt,padding:20}}>
          <div style={{...labelSt,marginBottom:12}}>P&L by Day of Week</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {dowStats.map(([day,d])=>{
              const clr=d.pnl>=0?C.green:C.red;
              return (
                <div key={day} style={{flex:1,minWidth:60,background:C.surface,borderRadius:8,padding:"10px 8px",textAlign:"center",
                  border:`1px solid ${clr}33`,boxShadow:`0 0 10px ${clr}11`}}>
                  <div style={{fontFamily:body,fontSize:11,color:C.textMid,marginBottom:4,fontWeight:600}}>{day}</div>
                  <div style={{fontFamily:mono,fontSize:12,color:clr,fontWeight:700}}>
                    {d.pnl>=0?"+":""}{Math.abs(d.pnl)<1000?Math.round(d.pnl):(d.pnl/1000).toFixed(1)+"k"}
                  </div>
                  <div style={{fontSize:9,color:C.textDim,fontFamily:mono,marginTop:2}}>{d.count} tr</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Trade Form ────────────────────────────────────────────────────────────────
function TradeForm({onSave,onCancel,setups,tags}) {
  const [f,setF]=useState({
    date:new Date().toISOString().slice(0,10),asset:"",direction:"Long",
    entryTime:"",contracts:1,pnl:"",setup:setups[0]?.id||"",htf:"1H",
    notes:"",emotion:"Disciplined",rating:4,tags:[],images:[],checklistChecked:[],
  });
  const upd=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const currentSetup=setups.find(s=>s.id===f.setup);
  const EMOTIONS=["Disciplined","Calm","Confident","Patient","Impatient","Fearful","Frustrated","Greedy","Uncertain","Revenge","FOMO","Excited","Bored","Stressed"];
  const HTFS=["1W","1D","4H","1H","30m","15m","5m","1m"];
  const handleSave=()=>{
    if(!f.asset.trim()){alert("Please enter an asset.");return;}
    onSave({...f,id:rId(),pnl:parseFloat(f.pnl)||0,contracts:parseInt(f.contracts)||1});
  };
  const pnlVal=parseFloat(f.pnl)||0;
  const pnlColor=pnlVal>=0?C.green:C.red;

  return (
    <div style={{...cardSt,marginBottom:24,border:`1px solid ${C.borderBright}`,
      boxShadow:`0 0 40px rgba(0,0,0,0.5), 0 0 20px ${pnlVal>=0?C.greenGlow:C.redGlow}`}}>
      <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.border}`,
        background:`linear-gradient(135deg, ${C.surfaceHigher}, ${C.surfaceHigh})`}}>
        <div style={{fontFamily:display,fontSize:20,color:C.text,fontWeight:800,letterSpacing:"-0.3px"}}>
          ✦ New Trade Entry
        </div>
      </div>
      <div style={{padding:"20px 22px"}}>
        {/* Row 1 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={labelSt}>Date</label>
            <input style={inputSt} type="date" value={f.date} onChange={upd("date")}/>
          </div>
          <div>
            <label style={labelSt}>Asset</label>
            <input style={inputSt} placeholder="NQ, AAPL, BTC…" value={f.asset} onChange={upd("asset")}/>
          </div>
          <div>
            <label style={labelSt}>Direction</label>
            <div style={{display:"flex",gap:6}}>
              {["Long","Short"].map(d=>(
                <button key={d} onClick={()=>setF(p=>({...p,direction:d}))}
                  style={{flex:1,padding:"10px 0",borderRadius:8,cursor:"pointer",fontFamily:body,fontSize:13,fontWeight:700,
                    border:`1.5px solid ${f.direction===d?(d==="Long"?C.green:C.red):C.border}`,
                    background:f.direction===d?(d==="Long"?C.greenDim:C.redDim):"transparent",
                    color:f.direction===d?(d==="Long"?C.green:C.red):C.textMid,transition:"all 0.15s",
                    boxShadow:f.direction===d?`0 0 12px ${d==="Long"?C.greenGlow:C.redGlow}`:"none"}}>
                  {d==="Long"?"▲ Long":"▼ Short"}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Row 2 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={labelSt}>Entry Time</label>
            <input style={inputSt} type="time" value={f.entryTime} onChange={upd("entryTime")}/>
          </div>
          <div>
            <label style={labelSt}>P&L ($)</label>
            <input style={{...inputSt,color:pnlColor,fontFamily:mono,fontWeight:700,
              boxShadow:f.pnl?`0 0 15px ${pnlVal>=0?C.greenGlow:C.redGlow}`:"none"}}
              type="number" step="0.01" placeholder="e.g. 420 or -180"
              value={f.pnl} onChange={upd("pnl")}/>
          </div>
          <div>
            <label style={labelSt}>Contracts / Lots</label>
            <input style={inputSt} type="number" min="1" step="0.01" value={f.contracts} onChange={upd("contracts")}/>
          </div>
        </div>
        {/* Setup */}
        <div style={{marginBottom:4}}>
          <label style={labelSt}>Setup</label>
          {setups.length>0?(
            <select style={{...inputSt,background:C.surfaceHigh}} value={f.setup}
              onChange={e=>setF(p=>({...p,setup:e.target.value,checklistChecked:[]}))}>
              <option value="">— No setup —</option>
              {setups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          ):(
            <div style={{...inputSt,color:C.textDim,cursor:"default"}}>No setups — create in Playbook Settings</div>
          )}
        </div>
        {currentSetup&&<SetupChecklist setup={currentSetup} checked={f.checklistChecked}
          onChange={itemId=>setF(p=>({...p,checklistChecked:p.checklistChecked.includes(itemId)?p.checklistChecked.filter(i=>i!==itemId):[...p.checklistChecked,itemId]}))}/>}
        {/* Row 3 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,margin:"14px 0"}}>
          <div>
            <label style={labelSt}>HTF Bias</label>
            <select style={{...inputSt,background:C.surfaceHigh}} value={f.htf} onChange={upd("htf")}>
              {HTFS.map(h=><option key={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Mindset</label>
            <select style={{...inputSt,background:C.surfaceHigh}} value={f.emotion} onChange={upd("emotion")}>
              {EMOTIONS.map(e=><option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={labelSt}>Execution Quality</label>
            <div style={{display:"flex",gap:6,marginTop:6}}>
              {[1,2,3,4,5].map(n=>(
                <span key={n} style={{fontSize:24,cursor:"pointer",
                  color:n<=f.rating?C.gold:C.textDim,
                  textShadow:n<=f.rating?`0 0 10px ${C.gold}`:  "none",
                  transition:"all 0.1s",filter:n<=f.rating?"drop-shadow(0 0 4px #f5c84288)":"none"}}
                  onClick={()=>setF(p=>({...p,rating:n}))}>★</span>
              ))}
            </div>
          </div>
        </div>
        {/* Notes */}
        <div style={{marginBottom:14}}>
          <label style={labelSt}>Notes</label>
          <textarea style={{...inputSt,minHeight:80,resize:"vertical",lineHeight:1.6}}
            placeholder="What did you see? How did you execute? What would you do differently?"
            value={f.notes} onChange={upd("notes")}/>
        </div>
        {/* Tags */}
        {tags.length>0&&(
          <div style={{marginBottom:16}}>
            <label style={labelSt}>Tags</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {tags.map(t=>(
                <button key={t.id}
                  style={{padding:"5px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontFamily:body,fontWeight:500,transition:"all 0.15s",
                    border:`1px solid ${f.tags.includes(t.id)?C.cyan:C.border}`,
                    background:f.tags.includes(t.id)?C.blueGlow:"transparent",
                    color:f.tags.includes(t.id)?C.cyan:C.textMid,
                    boxShadow:f.tags.includes(t.id)?`0 0 10px ${C.blueGlow}`:"none"}}
                  onClick={()=>setF(p=>({...p,tags:p.tags.includes(t.id)?p.tags.filter(x=>x!==t.id):[...p.tags,t.id]}))}>
                  {t.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Images */}
        <div style={{marginBottom:20}}>
          <label style={labelSt}>Chart Screenshots</label>
          <ImageUpload images={f.images} onChange={imgs=>setF(p=>({...p,images:imgs}))}/>
        </div>
        {/* Footer */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,borderTop:`1px solid ${C.border}`}}>
          <div>
            {f.pnl!==""&&(
              <span style={{fontFamily:mono,fontSize:24,fontWeight:700,color:pnlColor,
                textShadow:`0 0 20px ${pnlColor}`}}>
                {pnlVal>=0?"+":""}{fmt(pnlVal||0)}
              </span>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onCancel} style={{...glowBtn(C.textMid)}}>Cancel</button>
            <button onClick={handleSave} style={{...solidBtn(C.green),background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#000",
              boxShadow:`0 0 30px ${C.greenGlow}`}}>
              ⚡ Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── News Feed ─────────────────────────────────────────────────────────────────
function NewsFeed() {
  const [news,setNews]=useState([]);
  const [loading,setLoading]=useState(false);
  const fetchNews=async()=>{
    setLoading(true);setNews([]);
    const today=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    const prompt=`Generate 8 realistic financial news headlines for traders on ${today}. Mix: macro, Fed/rates, equities, energy, metals, crypto. JSON array, each item: id(1-8), time(HH:MM EST), category(Fed/Rates|Macro|Equities|Energy|Metals|Crypto), headline, impact(High|Medium|Low), instrument(label), summary(1 sentence). Return ONLY valid JSON, no markdown.`;
    const res=await askClaude("You are a financial news aggregator. Return only valid JSON arrays, no extra text.",prompt);
    try{setNews(JSON.parse(res.replace(/```json|```/g,"").trim()));}
    catch{setNews([
      {id:1,time:"08:30",category:"Macro",headline:"Non-Farm Payrolls surprise markets with stronger-than-expected print",impact:"High",instrument:"Multi",summary:"Jobs data beats estimates, causing yield spikes and equity volatility."},
      {id:2,time:"09:15",category:"Fed/Rates",headline:"Fed minutes reveal divided committee on pace of rate decisions",impact:"High",instrument:"Bonds",summary:"Hawkish and dovish factions emerge as inflation picture remains mixed."},
    ]);}
    setLoading(false);
  };
  const impactColor={High:C.red,Medium:C.gold,Low:C.textMid};
  const catColor={Macro:C.blue,"Fed/Rates":C.purple,Equities:C.cyan,Energy:C.gold,Metals:C.textMid,Crypto:C.green};
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
        <div>
          <div style={{fontFamily:display,fontSize:32,color:C.text,fontWeight:800,letterSpacing:"-0.5px"}}>Market Desk</div>
          <div style={{fontSize:12,color:C.textMid,fontFamily:body,marginTop:4}}>AI-curated headlines for today's session</div>
        </div>
        <button onClick={fetchNews} disabled={loading} style={{...glowBtn(C.cyan),opacity:loading?0.6:1}}>
          {loading?"Loading…":"⟳ Refresh"}
        </button>
      </div>
      {!news.length&&!loading&&(
        <div style={{...cardSt,textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>📰</div>
          <div style={{fontFamily:display,fontSize:18,color:C.textMid,marginBottom:8}}>No headlines loaded</div>
          <button onClick={fetchNews} style={{...solidBtn(C.cyan),background:`linear-gradient(135deg,${C.cyan}33,${C.cyan}11)`,color:C.cyan,border:`1px solid ${C.cyan}66`,marginTop:8}}>Load Headlines</button>
        </div>
      )}
      {loading&&<div style={{textAlign:"center",padding:"50px 0",color:C.textMid,fontFamily:display,fontSize:16}}>Fetching headlines…</div>}
      <div style={{display:"flex",flexDirection:"column",gap:1}}>
        {news.map(n=>(
          <div key={n.id} style={{...cardSt,padding:"16px 20px",marginBottom:4,borderLeft:`3px solid ${impactColor[n.impact]||C.border}`,
            boxShadow:`0 0 15px ${impactColor[n.impact]||C.border}11`}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:56,flexShrink:0}}>
                <div style={{fontFamily:mono,fontSize:11,color:C.textMid}}>{n.time}</div>
                <div style={{marginTop:4,padding:"2px 6px",borderRadius:4,
                  background:`${impactColor[n.impact]||C.textMid}22`,
                  fontSize:9,color:impactColor[n.impact]||C.textMid,fontFamily:body,fontWeight:700,textAlign:"center"}}>
                  {n.impact}
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:display,fontSize:15,color:C.text,fontWeight:700,lineHeight:1.3,marginBottom:4}}>{n.headline}</div>
                <div style={{fontSize:12,color:C.textMid,fontFamily:body,lineHeight:1.5}}>{n.summary}</div>
              </div>
              <span style={{fontFamily:body,fontSize:10,color:catColor[n.category]||C.textMid,
                background:`${catColor[n.category]||C.textMid}22`,border:`1px solid ${catColor[n.category]||C.textMid}44`,
                borderRadius:4,padding:"2px 8px",fontWeight:700,letterSpacing:"0.06em",flexShrink:0}}>
                {n.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("dashboard");
  const [trades,setTrades]=useState([]);
  const [showForm,setShowForm]=useState(false);
  const [selected,setSelected]=useState(null);
  const [aiText,setAiText]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [aiTarget,setAiTarget]=useState(null);
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [showPlaybook,setShowPlaybook]=useState(false);
  const [setups,setSetups]=useState([]);
  const [tags,setTags]=useState([]);
  const [confetti,setConfetti]=useState(false);
  const [prevPnl,setPrevPnl]=useState(undefined);
  const [statsTab,setStatsTab]=useState("overview");

  const wins=trades.filter(t=>t.pnl>0);
  const losses=trades.filter(t=>t.pnl<0);
  const totalPnl=trades.reduce((a,t)=>a+t.pnl,0);
  const winRate=trades.length?Math.round(wins.length/trades.length*100):0;
  const avgWin=wins.length?wins.reduce((a,t)=>a+t.pnl,0)/wins.length:0;
  const avgLoss=losses.length?Math.abs(losses.reduce((a,t)=>a+t.pnl,0)/losses.length):0;
  const pf=avgLoss>0?(avgWin/avgLoss).toFixed(2):"∞";

  const getTagName=(id)=>tags.find(t=>t.id===id)?.text||id;
  const getSetupName=(id)=>setups.find(s=>s.id===id)?.name||id;
  const getSetup=(id)=>setups.find(s=>s.id===id);

  const ai=async(system,prompt,target)=>{
    setAiLoading(true);setAiText("");setAiTarget(target);
    const r=await askClaude(system,prompt);
    setAiText(r);setAiLoading(false);
  };
  const analyzeAll=()=>{
    if(!trades.length){alert("Log some trades first.");return;}
    ai("You are a professional trading coach. Be direct, specific, and actionable.",
      `My recent trades:\n${trades.slice(0,15).map(t=>`${t.direction} ${t.asset} | Setup:${getSetupName(t.setup)} | P&L:$${t.pnl} | Mindset:${t.emotion} | Rating:${t.rating}`).join("\n")}\n\n1) Identify patterns in my best vs worst trades 2) Note recurring psychological mistakes 3) Give me 2 concrete rules to improve. Be direct.`,
      "all");
  };
  const analyzeTrade=(t)=>{
    ai("You are a professional trading coach. Be direct, specific, and actionable.",
      `Trade: ${t.direction} ${t.asset} | P&L: $${t.pnl} | Mindset: ${t.emotion} | Rating: ${t.rating}/5\nNotes: ${t.notes}\n\n1) Execution quality 2) Psychology read 3) One rule for this setup. Under 150 words.`,
      t.id);
  };
  const deleteTrade=(id)=>{setTrades(p=>p.filter(t=>t.id!==id));setDeleteConfirm(null);if(selected===id)setSelected(null);};

  const handleSave=(trade)=>{
    const isWin=trade.pnl>0;
    setPrevPnl(totalPnl);
    setTrades(p=>[trade,...p]);
    setShowForm(false);
    if(isWin) { setTimeout(()=>{setConfetti(true);},100); }
    setTab("dashboard");
  };

  const TABS=[["dashboard","Overview"],["stats","Stats"],["calendar","Calendar"],["journal","Journal"],["news","News"]];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:body,position:"relative",overflow:"hidden"}}>
      <Particles/>
      <ConfettiBurst active={confetti} onDone={()=>setConfetti(false)}/>

      {/* Ambient glow blobs */}
      <div style={{position:"fixed",top:-200,left:-200,width:600,height:600,
        background:`radial-gradient(circle, ${C.green}08 0%, transparent 70%)`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:-200,right:-200,width:600,height:600,
        background:`radial-gradient(circle, ${C.blue}06 0%, transparent 70%)`,pointerEvents:"none",zIndex:0}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:1200,margin:"0 auto",padding:"0 28px"}}>

        {/* NAV */}
        <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",
          borderBottom:`1px solid ${C.border}`,marginBottom:0,
          backdropFilter:"blur(10px)"}}>
          <div style={{fontFamily:display,fontSize:24,color:C.text,fontWeight:800,letterSpacing:"-1px",
            textShadow:`0 0 30px ${C.green}66`}}>
            EDGE<span style={{color:C.green}}>log</span>
          </div>
          <div style={{display:"flex",gap:0}}>
            {TABS.map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                style={{padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:body,fontSize:12,
                  fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",
                  color:tab===k?C.green:C.textMid,transition:"color 0.15s",
                  borderBottom:tab===k?`2px solid ${C.green}`:"2px solid transparent",marginBottom:-1,
                  textShadow:tab===k?`0 0 10px ${C.green}`:  "none"}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowPlaybook(true)} style={{...glowBtn(C.textMid),padding:"7px 14px",fontSize:12}}>⚙ Playbook</button>
            <button onClick={()=>{setShowForm(true);setTab("journal");}}
              style={{...solidBtn(C.green),background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#000",
                padding:"7px 20px",fontSize:12,boxShadow:`0 0 20px ${C.greenGlow}`}}>
              + Log Trade
            </button>
          </div>
        </nav>

        {showPlaybook&&(
          <SetupManager setups={setups} tags={tags} onSaveSetups={setSetups} onSaveTags={setTags} onClose={()=>setShowPlaybook(false)}/>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {tab==="dashboard"&&(
          <div style={{paddingTop:28}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
              <div>
                <div style={{fontFamily:display,fontSize:38,fontWeight:800,color:C.text,letterSpacing:"-1px",lineHeight:1}}>
                  Performance
                </div>
                <div style={{fontSize:12,color:C.textMid,marginTop:6,fontFamily:body}}>
                  {trades.length} trade{trades.length!==1?"s":""} logged
                </div>
              </div>
              <button onClick={analyzeAll} style={{...glowBtn(C.green)}}>✦ AI Analysis</button>
            </div>

            {!trades.length?(
              <div style={{...cardSt,textAlign:"center",padding:"80px 20px",
                background:`linear-gradient(135deg, ${C.surfaceHigh}, ${C.surface})`,
                boxShadow:`0 0 60px rgba(0,0,0,0.5), 0 0 20px ${C.greenGlow}`}}>
                <div style={{fontSize:56,marginBottom:16}}>📈</div>
                <div style={{fontFamily:display,fontSize:24,color:C.text,marginBottom:8,fontWeight:800}}>Your ledger is empty</div>
                <div style={{fontSize:13,color:C.textMid,fontFamily:body,marginBottom:24}}>Every great trader keeps records. Log your first trade to begin.</div>
                <button onClick={()=>{setShowForm(true);setTab("journal");}}
                  style={{...solidBtn(C.green),background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#000",fontSize:14,padding:"12px 28px"}}>
                  ⚡ Log First Trade
                </button>
              </div>
            ):(
              <>
                {/* Main stat row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
                  <StatCard icon="💰" label="Total P&L" value={fmtS(Math.round(totalPnl))}
                    color={totalPnl>=0?C.green:C.red} glow={true}
                    sub={`${trades.length} total trades`}/>
                  <StatCard icon="🎯" label="Win Rate" value={winRate+"%"}
                    color={winRate>=60?C.green:winRate>=45?C.gold:C.red}
                    sub={`${wins.length}W · ${losses.length}L`}/>
                  <StatCard icon="⚡" label="Profit Factor" value={pf}
                    color={parseFloat(pf)>=1.5?C.green:parseFloat(pf)>=1?C.gold:C.red}
                    sub="Avg win / avg loss"/>
                  <StatCard icon="🏆" label="Avg Win" value={fmt(Math.round(avgWin))} color={C.green}
                    sub="Per winning trade"/>
                  <StatCard icon="🛡" label="Avg Loss" value={fmt(Math.round(avgLoss))} color={C.red}
                    sub="Per losing trade"/>
                </div>

                {/* Equity + Win Rate Ring */}
                <div style={{display:"grid",gridTemplateColumns:"1.8fr 1fr",gap:16,marginBottom:16}}>
                  <div style={{...cardSt,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                      <div style={{...labelSt,marginBottom:0}}>Equity Curve</div>
                      <div style={{fontFamily:mono,fontSize:14,color:totalPnl>=0?C.green:C.red,fontWeight:700,
                        textShadow:`0 0 10px ${totalPnl>=0?C.green:C.red}`}}>
                        {fmtS(Math.round(totalPnl))}
                      </div>
                    </div>
                    <EquityCurve trades={trades} height={140}/>
                  </div>
                  <div style={{...cardSt,padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{...labelSt,marginBottom:12,textAlign:"center"}}>Win Rate</div>
                    <WinRateRing rate={winRate} size={130}/>
                    <div style={{marginTop:12,display:"flex",gap:20,justifyContent:"center"}}>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:mono,fontSize:18,color:C.green,fontWeight:700,textShadow:`0 0 10px ${C.green}`}}>{wins.length}</div>
                        <div style={{fontSize:10,color:C.textDim,fontFamily:body}}>Wins</div>
                      </div>
                      <div style={{width:1,background:C.border}}/>
                      <div style={{textAlign:"center"}}>
                        <div style={{fontFamily:mono,fontSize:18,color:C.red,fontWeight:700,textShadow:`0 0 10px ${C.red}`}}>{losses.length}</div>
                        <div style={{fontSize:10,color:C.textDim,fontFamily:body}}>Losses</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI analysis panel */}
                {(aiLoading&&aiTarget==="all"||aiText&&aiTarget==="all"&&!aiLoading)&&(
                  <div style={{...cardSt,padding:20,marginBottom:16,borderColor:C.green+"44",
                    background:`linear-gradient(135deg, ${C.greenDim}, ${C.surface})`,
                    boxShadow:`0 0 30px ${C.greenGlow}`}}>
                    <div style={{...labelSt,color:C.green,marginBottom:8}}>✦ AI Coach Analysis</div>
                    {aiLoading?
                      <div style={{color:C.textMid,fontSize:13,fontFamily:body}}>Analyzing your trades…</div>:
                      <div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:"pre-line",fontFamily:body}}>{aiText}</div>}
                  </div>
                )}

                {/* Recent trades mini-list */}
                <div style={{...cardSt,padding:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                    <div style={labelSt}>Recent Trades</div>
                    <button onClick={()=>setTab("journal")} style={{background:"none",border:"none",cursor:"pointer",color:C.cyan,fontSize:12,fontFamily:body,fontWeight:600}}>View all →</button>
                  </div>
                  {trades.slice(0,5).map(t=>{
                    const setup=getSetup(t.setup);
                    return (
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                        borderBottom:`1px solid ${C.border}`}}>
                        <div style={{fontFamily:mono,fontSize:11,color:C.textDim,width:72,flexShrink:0}}>{t.date}</div>
                        <div style={{fontFamily:mono,fontSize:13,color:C.text,fontWeight:600,width:64,flexShrink:0}}>{t.asset}</div>
                        <span style={{fontSize:10,fontFamily:body,fontWeight:700,padding:"2px 8px",borderRadius:4,flexShrink:0,
                          background:t.direction==="Long"?C.greenDim:C.redDim,
                          color:t.direction==="Long"?C.green:C.red,
                          border:`1px solid ${t.direction==="Long"?C.green+"44":C.red+"44"}`}}>
                          {t.direction[0]}
                        </span>
                        {setup&&<div style={{width:8,height:8,borderRadius:"50%",background:setup.color,flexShrink:0,boxShadow:`0 0 6px ${setup.color}`}}/>}
                        <div style={{flex:1,fontSize:12,color:C.textMid,fontFamily:body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{setup?.name||"—"}</div>
                        <div style={{fontFamily:mono,fontSize:13,color:t.pnl>=0?C.green:C.red,fontWeight:700,width:80,textAlign:"right",flexShrink:0,
                          textShadow:`0 0 8px ${t.pnl>=0?C.green:C.red}`}}>
                          {fmtS(t.pnl)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ STATS ═══ */}
        {tab==="stats"&&(
          <div style={{paddingTop:28}}>
            <div style={{fontFamily:display,fontSize:32,fontWeight:800,color:C.text,marginBottom:24,letterSpacing:"-0.5px"}}>Advanced Stats</div>
            {!trades.length?(
              <div style={{...cardSt,textAlign:"center",padding:"60px",color:C.textMid,fontFamily:body}}>
                Log trades to see advanced statistics
              </div>
            ):(
              <AdvancedStats trades={trades} setups={setups} tags={tags}/>
            )}
          </div>
        )}

        {/* ═══ CALENDAR ═══ */}
        {tab==="calendar"&&(
          <div style={{paddingTop:28}}>
            <div style={{fontFamily:display,fontSize:32,fontWeight:800,color:C.text,marginBottom:24,letterSpacing:"-0.5px"}}>Calendar</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div style={{...cardSt,padding:20}}>
                <PnlCalendar trades={trades}/>
              </div>
              <div style={{...cardSt,padding:20}}>
                <div style={labelSt}>Monthly Breakdown</div>
                {(() => {
                  const monthly={};
                  trades.forEach(t=>{
                    const k=t.date.slice(0,7);
                    if(!monthly[k]){monthly[k]={pnl:0,wins:0,total:0};}
                    monthly[k].pnl+=t.pnl;monthly[k].total++;if(t.pnl>0)monthly[k].wins++;
                  });
                  return Object.entries(monthly).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8).map(([m,d])=>(
                    <div key={m} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{fontFamily:mono,fontSize:12,color:C.textMid,width:72}}>{m}</div>
                      <div style={{flex:1,height:6,background:C.surface,borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.round(d.wins/d.total*100)+"%",
                          background:`linear-gradient(90deg,${C.green},${C.green}88)`,borderRadius:2}}/>
                      </div>
                      <div style={{fontFamily:mono,fontSize:12,color:d.pnl>=0?C.green:C.red,fontWeight:700,width:72,textAlign:"right"}}>
                        {fmtS(Math.round(d.pnl))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ═══ JOURNAL ═══ */}
        {tab==="journal"&&(
          <div style={{paddingTop:28}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24}}>
              <div style={{fontFamily:display,fontSize:32,fontWeight:800,color:C.text,letterSpacing:"-0.5px"}}>Journal</div>
              {!showForm&&(
                <button onClick={()=>setShowForm(true)} style={{...solidBtn(C.green),background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#000",boxShadow:`0 0 20px ${C.greenGlow}`}}>
                  + Log Trade
                </button>
              )}
            </div>

            {showForm&&<TradeForm onSave={handleSave} onCancel={()=>setShowForm(false)} setups={setups} tags={tags}/>}

            {!showForm&&!trades.length?(
              <div style={{...cardSt,textAlign:"center",padding:"72px 20px"}}>
                <div style={{fontSize:48,marginBottom:14}}>📓</div>
                <div style={{fontFamily:display,fontSize:20,color:C.text,marginBottom:8,fontWeight:800}}>No trades logged yet</div>
                <button onClick={()=>setShowForm(true)} style={{...solidBtn(C.green),background:`linear-gradient(135deg,${C.green},${C.greenDark})`,color:"#000",marginTop:8}}>Write First Entry</button>
              </div>
            ):trades.length>0&&(
              <>
                {/* Column headers */}
                <div style={{display:"grid",gridTemplateColumns:"90px 70px 52px 150px 75px 90px 80px 100px 36px",
                  gap:10,padding:"0 12px 8px",borderBottom:`1px solid ${C.border}`,marginBottom:4}}>
                  {["Date","Asset","Dir","Setup","Time","P&L","Rating","AI",""].map(h=>(
                    <div key={h} style={{...labelSt,marginBottom:0}}>{h}</div>
                  ))}
                </div>

                {trades.map(t=>{
                  const isOpen=selected===t.id;
                  const setup=getSetup(t.setup);
                  return (
                    <div key={t.id} style={{borderRadius:isOpen?10:0,marginBottom:isOpen?8:0,
                      border:isOpen?`1px solid ${C.borderBright}`:"none",
                      boxShadow:isOpen?`0 0 30px rgba(0,0,0,0.4)`:"none",
                      transition:"all 0.2s",overflow:"hidden"}}>
                      <div onClick={()=>setSelected(isOpen?null:t.id)}
                        style={{display:"grid",gridTemplateColumns:"90px 70px 52px 150px 75px 90px 80px 100px 36px",
                          gap:10,alignItems:"center",padding:"13px 12px",cursor:"pointer",
                          background:isOpen?C.surfaceHigher:t.pnl>0?`${C.green}04`:`${C.red}04`,
                          borderLeft:`3px solid ${t.pnl>=0?C.green+"44":C.red+"44"}`,
                          transition:"background 0.15s"}}>
                        <div style={{fontSize:11,color:C.textDim,fontFamily:mono}}>{t.date}</div>
                        <div style={{fontSize:13,color:C.text,fontFamily:mono,fontWeight:700}}>{t.asset}</div>
                        <div>
                          <span style={{fontSize:10,fontFamily:body,fontWeight:700,padding:"3px 7px",borderRadius:4,
                            background:t.direction==="Long"?C.greenDim:C.redDim,
                            color:t.direction==="Long"?C.green:C.red,
                            border:`1px solid ${t.direction==="Long"?C.green+"33":C.red+"33"}`}}>
                            {t.direction[0]}
                          </span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
                          {setup&&<div style={{width:7,height:7,borderRadius:"50%",background:setup.color,flexShrink:0,boxShadow:`0 0 5px ${setup.color}`}}/>}
                          <span style={{fontSize:12,color:C.textMid,fontFamily:body,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{setup?.name||"—"}</span>
                        </div>
                        <div style={{fontSize:11,color:C.textDim,fontFamily:mono}}>{t.entryTime||"—"}</div>
                        <div style={{fontSize:13,color:t.pnl>=0?C.green:C.red,fontFamily:mono,fontWeight:700,
                          textShadow:`0 0 8px ${t.pnl>=0?C.green:C.red}`}}>
                          {fmtS(t.pnl)}
                        </div>
                        <div style={{color:C.gold,fontSize:12,textShadow:`0 0 6px ${C.gold}66`}}>
                          {"★".repeat(t.rating)}{"☆".repeat(5-t.rating)}
                        </div>
                        <button style={{padding:"5px 10px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:body,fontWeight:700,
                          background:C.greenDim,color:C.green,border:`1px solid ${C.green}33`,
                          boxShadow:aiLoading&&aiTarget===t.id?`0 0 12px ${C.greenGlow}`:"none"}}
                          onClick={e=>{e.stopPropagation();analyzeTrade(t);}}>
                          {aiLoading&&aiTarget===t.id?"…":"✦ AI"}
                        </button>
                        <button style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:14,padding:4}}
                          onClick={e=>{e.stopPropagation();setDeleteConfirm(t.id);}}>✕</button>
                      </div>

                      {isOpen&&(
                        <div style={{padding:"16px 14px 20px",background:C.surface,borderTop:`1px solid ${C.border}`}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
                            <div style={{...cardSt,padding:14,background:C.surfaceHigh}}>
                              <div style={{...labelSt,marginBottom:8}}>Trade Details</div>
                              <div style={{fontSize:12,color:C.textMid,lineHeight:2,fontFamily:body}}>
                                Asset <span style={{color:C.text,fontFamily:mono,fontWeight:600}}>{t.asset}</span><br/>
                                Contracts <span style={{color:C.text,fontFamily:mono}}>{t.contracts}</span><br/>
                                Entry time <span style={{color:C.text,fontFamily:mono}}>{t.entryTime||"—"}</span><br/>
                                HTF <span style={{color:C.text,fontFamily:mono}}>{t.htf}</span>
                              </div>
                            </div>
                            <div style={{...cardSt,padding:14,background:C.surfaceHigh}}>
                              <div style={{...labelSt,marginBottom:8}}>Psychology</div>
                              <div style={{fontSize:12,color:C.textMid,lineHeight:2,fontFamily:body}}>
                                Mindset <span style={{color:C.text}}>{t.emotion}</span><br/>
                                Rating <span style={{color:C.gold,textShadow:`0 0 6px ${C.gold}66`}}>{"★".repeat(t.rating)}{"☆".repeat(5-t.rating)}</span><br/>
                                Checklist <span style={{color:C.text,fontFamily:mono}}>{t.checklistChecked?.length||0} / {setup?.items?.length||0}</span>
                              </div>
                            </div>
                            <div style={{...cardSt,padding:14,background:C.surfaceHigh}}>
                              <div style={{...labelSt,marginBottom:8}}>Tags</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                {t.tags?.length?t.tags.map(tid=>(
                                  <span key={tid} style={{fontSize:11,padding:"3px 10px",background:C.blueGlow,border:`1px solid ${C.blue}33`,
                                    borderRadius:12,fontFamily:body,color:C.blue}}>{getTagName(tid)}</span>
                                )):<span style={{fontSize:12,color:C.textDim}}>No tags</span>}
                              </div>
                            </div>
                          </div>

                          {t.notes&&(
                            <div style={{...cardSt,padding:"12px 14px",margin:"0 0 12px",background:C.surfaceHigh,
                              borderLeft:`3px solid ${C.cyan}`,boxShadow:`-4px 0 15px ${C.cyan}11`}}>
                              <div style={{...labelSt,marginBottom:6}}>Notes</div>
                              <div style={{fontSize:13,color:C.textMid,lineHeight:1.7,fontFamily:body}}>{t.notes}</div>
                            </div>
                          )}

                          {t.images?.length>0&&<div style={{marginBottom:12}}><ImageGallery images={t.images}/></div>}

                          {(aiLoading&&aiTarget===t.id||aiText&&aiTarget===t.id&&!aiLoading)&&(
                            <div style={{...cardSt,padding:14,background:C.greenDim,border:`1px solid ${C.green}33`,
                              borderLeft:`3px solid ${C.green}`,boxShadow:`0 0 20px ${C.greenGlow}`}}>
                              <div style={{...labelSt,color:C.green,marginBottom:8}}>✦ AI Coach</div>
                              {aiLoading?<div style={{color:C.textMid,fontSize:13}}>Analyzing…</div>:
                                <div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:"pre-line",fontFamily:body}}>{aiText}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ═══ NEWS ═══ */}
        {tab==="news"&&(
          <div style={{paddingTop:28}}><NewsFeed/></div>
        )}

        {/* Delete confirm */}
        {deleteConfirm&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,
            display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}} onClick={()=>setDeleteConfirm(null)}>
            <div style={{...cardSt,padding:28,maxWidth:340,width:"90%",border:`1px solid ${C.red}44`,
              boxShadow:`0 0 40px ${C.redGlow}`}} onClick={e=>e.stopPropagation()}>
              <div style={{fontFamily:display,fontSize:20,color:C.text,marginBottom:6,fontWeight:800}}>Delete this entry?</div>
              <div style={{fontSize:13,color:C.textMid,marginBottom:20,fontFamily:body}}>This cannot be undone.</div>
              <div style={{display:"flex",gap:8}}>
                <button style={{flex:1,...glowBtn(C.textMid)}} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
                <button style={{flex:1,background:C.red,color:"#fff",border:"none",borderRadius:8,padding:"9px",
                  cursor:"pointer",fontFamily:body,fontSize:13,fontWeight:700,boxShadow:`0 0 20px ${C.redGlow}`}}
                  onClick={()=>deleteTrade(deleteConfirm)}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <div style={{height:60}}/>
      </div>

      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=time]::-webkit-calendar-picker-indicator { opacity:0.4; cursor:pointer; filter:invert(1); }
        input:focus, select:focus, textarea:focus {
          border-color:${C.cyan} !important;
          outline:none;
          box-shadow: 0 0 15px ${C.cyan}33 !important;
        }
        button:hover { opacity:0.85; transform:translateY(-1px); }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:${C.surface}; }
        ::-webkit-scrollbar-thumb { background:${C.borderBright}; border-radius:3px; }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        textarea { resize:vertical; font-family:'Space Grotesk',sans-serif; }
        select option { background:${C.surfaceHigh}; color:${C.text}; }
        @keyframes pulse {
          0%, 100% { opacity:1; }
          50% { opacity:0.5; }
        }
      `}</style>
    </div>
  );
}
