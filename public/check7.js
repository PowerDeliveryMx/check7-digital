const CHECK7 = [
  {n:1, short:'Carga inicial', cat:'Alternador', title:'Carga inicial', instruction:'Enciende el vehículo.', type:'baseline'},
  {n:2, short:'Carga en baja', cat:'Alternador', title:'Carga en baja (sin acelerar)', instruction:'Apaga todos los accesorios del vehículo (radio, luces, A/C).', type:'carga'},
  {n:3, short:'Carga en alta', cat:'Alternador', title:'Carga en alta', instruction:'Enciende los accesorios y acelera a un solo paso a 2000 RPM durante 7 segundos.', type:'carga'},
  {n:4, short:'Estabilización', cat:'Alternador', title:'Estabilización', instruction:'Apaga el automóvil y deja reposar durante 7 segundos.', type:'stabilization'},
  {n:5, short:'Retención arranque', cat:'Batería', title:'Retención con arranque', instruction:'Enciende el automóvil.', type:'retiene'},
  {n:6, short:'Estabilización', cat:'Batería', title:'Estabilización', instruction:'Apaga el automóvil y deja reposar durante 7 segundos.', type:'stabilization'},
  {n:7, short:'Retención tester', cat:'Batería', title:'Retención con tester', instruction:'Con ayuda del cliente, realiza una simulación de arranque con el tester.', type:'retiene'}
];
const PRECHECK = [
  {key:'enciende', label:'¿Enciende el vehículo?'},
  {key:'estereo', label:'¿Enciende su estéreo?'},
  {key:'sujetador', label:'¿Tiene sujetador la batería?'},
  {key:'seguros', label:'¿Funcionan seguros y vidrios eléctricos?'},
  {key:'testigos', label:'¿Tiene testigos prendidos en el tablero?'}
];
const PAQUETE = [
  {key:'memorySaver', label:'Memory saver', desc:'Conserva la configuración de tu auto durante el cambio', icon:'memorySaver'},
  {key:'limpieza', label:'Limpieza de terminales', desc:'Mejor contacto, arranque más confiable', icon:'cleaning'},
  {key:'antisulfatantes', label:'Antisulfatantes', desc:'Protege y prolonga la vida de tu batería', icon:'shieldZap'}
];
const CHECK7SERV = [
  {key:'revAlternador', label:'Revisión de alternador', desc:'Detecta fallas antes de que te dejen varado', icon:'alternatorGauge'},
  {key:'revBateria', label:'Revisión de la batería', desc:'Diagnóstico preciso con parámetros reales', icon:'batteryCheck'}
];

const SCREENS = ['datos','pre','c1','c2','c3','c4','c5','c6','c7','diagnostico','servicios','evaluacion','resumen'];

function todayIso(){ return new Date().toISOString().slice(0,10); }
function blankState(folio){
  return {
    folio: folio,
    fecha: todayIso(),
    tecnico:'', idCliente:'', vehiculo:{modelo:'', anio:'', placa:''}, kilometraje:'', cliente:'', correoCliente:'',
    pre:{ enciende:null, estereo:null, sujetador:null, seguros:null, testigos:null, testigosCuales:'', observaciones:'' },
    volts:{1:'',2:'',3:'',4:'',5:'',6:'',7:''},
    stabilizeDone:{4:false,6:false},
    diag:{ bateriaNueva:null, alternador:null },
    serv:{ memorySaver:null, limpieza:null, antisulfatantes:null, revAlternador:null, revBateria:null },
    eval:{ calificacion:null, comentarios:'', nombreCliente:'', firmado:false }
  };
}
function newFolio(){
  const rand = Math.floor(1000 + Math.random()*9000);
  return `${todayIso().replace(/-/g,'').slice(2)}${rand}`;
}
let state = blankState(newFolio());
let idx = 0;
let countdownInterval = null;

function rangeFor(step){ return step.type==='carga' ? [10,16] : [6,13]; }
function zoneFor(step){
  const [min,max] = rangeFor(step);
  if(step.type==='carga') return {lo:13.5, hi:14.8};
  if(step.type==='retiene') return {lo:9.6, hi:max};
  return null;
}
function verdictFor(step, rawValue){
  const v = parseFloat(rawValue);
  if(isNaN(v)) return null;
  if(step.type==='carga'){
    if(v>=13.5 && v<=14.8) return {label:'Carga', tone:'pass'};
    if(v<13.5) return {label:'No carga', tone:'fail'};
    return {label:'Fuera de rango', tone:'warn'};
  }
  if(step.type==='retiene'){
    if(v>=9.6) return {label:'Retiene', tone:'pass'};
    if(v<9) return {label:'No retiene', tone:'fail'};
    return {label:'Zona intermedia', tone:'warn'};
  }
  return null;
}
function formatFecha(iso){
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ---------- Iconos ---------- */
function odometerIconSvg(size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/><path d="M12 12l4-4"/><path d="M12 3v2M21 12h-2M3 12h2"/></svg>`;
}
function iconPower(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>`; }
function iconClock(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`; }
function iconSparkle(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2z"/></svg>`; }
function iconShield(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z"/><path d="M9 12l2 2 4-4.5"/></svg>`; }
function iconReceipt(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>`; }
function iconShare(){ return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="6" r="2.3"/><circle cx="18" cy="18" r="2.3"/><path d="M8.1 10.6l7.6-4.3M8.1 13.4l7.6 4.3"/></svg>`; }

const SERVICE_ICONS = {
  memorySaver: ()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><rect x="2" y="7" width="17" height="11" rx="2.5"/><rect x="19.3" y="10.3" width="2.4" height="4.4" rx="1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="12.5" r="3.6"/><path d="M10.5 10.6v2l1.4 1"/></svg>`,
  cleaning: ()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M14.7 3.3l6 6-8.2 8.2-6-1-1-6z"/><path d="M9 15.5L4 20.5"/><path d="M5.5 5.5l1.4 1.4M8 3.2l1 1"/></svg>`,
  shieldZap: ()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><path d="M12 2.5l7.5 3.5v5c0 5-3.2 8-7.5 9.5-4.3-1.5-7.5-4.5-7.5-9.5V6z"/><path d="M13 7.2l-4 6h3l-1 4 4-6h-3z" fill="currentColor" stroke="none"/></svg>`,
  alternatorGauge: ()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><circle cx="10.3" cy="10.3" r="7.3"/><path d="M10.3 6.3v4l2.8 1.8"/><path d="M15.6 15.6l5.6 5.6"/></svg>`,
  batteryCheck: ()=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%"><rect x="2" y="7" width="17" height="11" rx="2.5"/><rect x="19.3" y="10.3" width="2.4" height="4.4" rx="1" fill="currentColor" stroke="none"/><path d="M5.5 12.5l2.3 2.6L14.5 9"/></svg>`
};

function batteryIconHtml(status){
  const pct = status===true?100:status===false?14:0;
  const color = status===true?'var(--pass)':status===false?'var(--fail)':'var(--ink-faint)';
  const fillW = Math.max(2, Math.round((pct/100)*38));
  return `<svg width="48" height="24" viewBox="0 0 48 24" class="battery-icon">
    <rect x="1" y="1" width="42" height="22" rx="5" fill="none" stroke="rgba(18,20,42,.22)" stroke-width="2"/>
    <rect x="45" y="8" width="3" height="8" rx="1.3" fill="rgba(18,20,42,.22)"/>
    <rect x="4" y="4" width="${fillW}" height="16" rx="2.5" fill="${color}"/>
  </svg>`;
}

/* ---------- Gauges ---------- */
const ARC_START = 210, ARC_SWEEP = 240;
const BAR_STEP = 0.25;

function polar(cx, cy, r, deg){
  const a = deg*Math.PI/180;
  return {x: cx + r*Math.cos(a), y: cy - r*Math.sin(a)};
}
function arcPath(cx, cy, r, fromDeg, toDeg){
  const s = polar(cx,cy,r,fromDeg), e = polar(cx,cy,r,toDeg);
  const large = (fromDeg-toDeg) > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)}A${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}
function valuePct(raw, min, max){
  const n = parseFloat(raw);
  if(isNaN(n)) return null;
  return Math.max(0, Math.min(1, (n-min)/(max-min)));
}
function angleFor(pct){ return ARC_START - ARC_SWEEP*pct; }
function toneColor(verdict){
  if(verdict && verdict.tone==='fail') return 'var(--fail)';
  if(verdict && verdict.tone==='warn') return 'var(--warn)';
  return 'var(--blue)';
}
function valueText(raw){
  const n = parseFloat(raw);
  return isNaN(n) ? '--' : n.toFixed(2);
}
function needleSvg(cx, cy, r, inner, outer, pct, id){
  const rot = -angleFor(pct===null ? 0 : pct);
  return `<g${id?` id="${id}"`:''} class="ag-needle${pct===null?'':' on'}" style="transform:rotate(${rot}deg);transform-origin:${cx}px ${cy}px">
    <line class="ag-needle-halo" x1="${cx+r-inner}" y1="${cy}" x2="${cx+r+outer}" y2="${cy}"/>
    <line class="ag-needle-line" x1="${cx+r-inner}" y1="${cy}" x2="${cx+r+outer}" y2="${cy}"/>
  </g>`;
}

function arcGaugeMarkup({value, min, max, verdict, zone, live=true, big=false}){
  const cx = 150, cy = 128, r = 98;
  const pct = valuePct(value, min, max);
  const full = arcPath(cx, cy, r, ARC_START, ARC_START-ARC_SWEEP);
  let zoneHtml = '';
  if(zone){
    const a1 = angleFor(Math.max(0, Math.min(1, (zone.lo-min)/(max-min))));
    const a2 = angleFor(Math.max(0, Math.min(1, (zone.hi-min)/(max-min))));
    zoneHtml = `<path class="ag-zone" d="${arcPath(cx, cy, r-15, a1, a2)}"/>`;
  }
  let ticks = '';
  for(let v=Math.ceil(min); v<=max; v++){
    const p = polar(cx, cy, r+(big?22:19), angleFor((v-min)/(max-min)));
    ticks += `<text class="ag-tick" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}">${v}</text>`;
  }
  return `<svg class="arc-gauge" viewBox="0 0 300 200" role="img" aria-label="Voltaje medido">
    <path class="ag-track" d="${full}"/>
    ${zoneHtml}
    <path${live?' id="liveGaugeProgress"':''} class="ag-progress" pathLength="100" d="${full}" style="stroke-dashoffset:${100*(1-(pct||0))};stroke:${toneColor(verdict)}"/>
    ${ticks}
    ${needleSvg(cx, cy, r, 13, 9, pct, live?'liveGaugeNeedle':null)}
    <text${live?' id="liveGaugeValue"':''} class="ag-value" x="${cx}" y="${cy+12}">${valueText(value)}</text>
    <text class="ag-unit" x="${cx}" y="${cy+36}">VOLTS</text>
  </svg>`;
}

function barsMarkup({min, max, zone}){
  const N = Math.round((max-min)/BAR_STEP);
  const x0 = 10, x1 = 314, base = 94, maxH = 82, bw = 7, cr = 3.5;
  const slot = (x1-x0)/N;
  const mid = (zone.lo+zone.hi)/2, sigma = 1.3;
  let bars = '';
  for(let i=0; i<N; i++){
    const v = min + BAR_STEP*(i+0.5);
    const h = maxH*(0.28 + 0.72*Math.exp(-Math.pow(v-mid,2)/(2*sigma*sigma)));
    const x = x0 + slot*i + (slot-bw)/2;
    const top = base - h;
    const inZone = v>=zone.lo && v<=zone.hi;
    const f = n => n.toFixed(2);
    bars += `<path class="ag-bar${inZone?' in':''}" data-i="${i}" data-cx="${f(x+bw/2)}" data-top="${f(top)}" d="M${f(x)} ${base}V${f(top+cr)}Q${f(x)} ${f(top)} ${f(x+cr)} ${f(top)}H${f(x+bw-cr)}Q${f(x+bw)} ${f(top)} ${f(x+bw)} ${f(top+cr)}V${base}Z"/>`;
  }
  let ticks = '';
  for(let v=Math.ceil(min/2)*2; v<=max; v+=2){
    const x = x0 + (v-min)/(max-min)*(x1-x0);
    ticks += `<text class="ag-tick" x="${x.toFixed(1)}" y="${base+17}">${v}</text>`;
  }
  return `<svg id="liveBars" class="bars-chart" viewBox="0 0 324 118" role="img" aria-label="Voltaje medido sobre la escala de ${min} a ${max} volts">
    <line class="ag-axis" x1="${x0}" y1="${base+1}" x2="${x1}" y2="${base+1}"/>
    ${bars}
    ${ticks}
    <circle id="liveBarDot" class="ag-dot" r="5" cx="0" cy="0" style="opacity:0"/>
  </svg>`;
}

function updateBarsChart(pct, color){
  const svg = document.getElementById('liveBars');
  if(!svg) return;
  svg.querySelectorAll('.ag-bar.is-read').forEach(b=>{ b.classList.remove('is-read'); b.style.fill = ''; });
  const dot = document.getElementById('liveBarDot');
  if(pct===null){ dot.style.opacity = 0; return; }
  const N = svg.querySelectorAll('.ag-bar').length;
  const bar = svg.querySelector(`.ag-bar[data-i="${Math.min(N-1, Math.floor(pct*N))}"]`);
  bar.classList.add('is-read');
  bar.style.fill = color;
  dot.setAttribute('cx', bar.dataset.cx);
  dot.setAttribute('cy', parseFloat(bar.dataset.top) - 10);
  dot.style.fill = color;
  dot.style.opacity = 1;
}

function chipStatusHtml(verdict){
  return `<span id="verdictBadge" class="chip-status${verdict?' show '+verdict.tone:''}">${verdict?verdict.label:''}</span>`;
}
function rangeText(step, zone){
  return step.type==='carga' ? `${zone.lo.toFixed(1)} – ${zone.hi.toFixed(1)} V` : `≥ ${zone.lo.toFixed(1)} V`;
}
function rangeRowHtml(step, zone, chip){
  const text = rangeText(step, zone);
  return `<div class="range-row">
    <div class="range-info"><span class="range-swatch"></span><div><div class="range-label">Rango ideal</div><div class="range-val">${text}</div></div></div>
    ${chip||''}
  </div>`;
}
function gaugeStageHtml(step, value, min, max, zone, verdict){
  if(step.type==='carga'){
    return `<div class="bars-stage">
      <div class="bars-head">
        <div class="big-value"><span id="liveGaugeValue">${valueText(value)}</span><small>V</small></div>
        ${chipStatusHtml(verdict)}
      </div>
      ${barsMarkup({min, max, zone})}
    </div>
    ${rangeRowHtml(step, zone)}`;
  }
  const arc = `<div class="gauge-stage">${arcGaugeMarkup({value, min, max, verdict, zone})}</div>`;
  return zone ? arc + rangeRowHtml(step, zone, chipStatusHtml(verdict)) : arc;
}

function miniGaugeMarkup({value, min, max, verdict}){
  const cx = 50, cy = 44, r = 33;
  const pct = valuePct(value, min, max);
  const full = arcPath(cx, cy, r, ARC_START, ARC_START-ARC_SWEEP);
  const n = parseFloat(value);
  return `<svg class="mini-gauge" viewBox="0 0 100 70" role="img" aria-label="${isNaN(n)?'Sin lectura':n.toFixed(2)+' volts'}">
    <path class="ag-track" d="${full}"/>
    <path class="ag-progress" pathLength="100" d="${full}" style="stroke-dashoffset:${100*(1-(pct||0))};stroke:${toneColor(verdict)}"/>
    ${needleSvg(cx, cy, r, 6, 5, pct, null)}
    <text class="mg-value" x="${cx}" y="${cy+6}">${valueText(value)}<tspan class="mg-unit" dx="2">V</tspan></text>
  </svg>`;
}
function statusPillHtml(verdict, hasValue){
  if(!hasValue) return `<span class="badge neutral">Sin lectura</span>`;
  if(!verdict) return `<span class="badge neutral">Lectura</span>`;
  const icon = verdict.tone==='pass' ? '✓' : verdict.tone==='fail' ? '✕' : '!';
  return `<span class="badge ${verdict.tone}">${icon} ${verdict.label}</span>`;
}
function buildFinalGauges(){
  const items = [
    {n:3, title:'Alternador', sub:'Carga final'},
    {n:7, title:'Batería', sub:'Retención final'}
  ];
  const cards = items.map(it=>{
    const step = CHECK7[it.n-1];
    const val = state.volts[it.n];
    const verdict = verdictFor(step, val);
    const [min,max] = rangeFor(step);
    const zone = zoneFor(step);
    return `<div class="final-card">
      <div class="final-title">${it.title}</div>
      <div class="final-sub">${it.sub}</div>
      <div class="gauge-stage">${arcGaugeMarkup({value:val, min, max, verdict, zone, live:false, big:true})}</div>
      <div class="final-foot">
        ${statusPillHtml(verdict, !isNaN(parseFloat(val)))}
        <span class="final-range">Rango ideal ${rangeText(step, zone)}</span>
      </div>
    </div>`;
  }).join('');
  return `<div class="ticket-final"><div class="section-title">Resultado final</div><div class="final-grid">${cards}</div></div>`;
}
function buildResultGrid(){
  const measured = [1,2,3,5,7].map(n=>{
    const step = CHECK7[n-1];
    const val = state.volts[n];
    const verdict = step.type==='baseline' ? null : verdictFor(step, val);
    const [min,max] = rangeFor(step);
    return `<div class="res-card">
      <div class="res-title">${n}. ${step.short}</div>
      ${miniGaugeMarkup({value:val, min, max, verdict})}
      ${statusPillHtml(verdict, !isNaN(parseFloat(val)))}
    </div>`;
  }).join('');
  const allDone = state.stabilizeDone[4] && state.stabilizeDone[6];
  const stab = `<div class="res-card">
    <div class="res-title">4 y 6. Estabilización</div>
    <div class="res-stab-icon${allDone?'':' pending'}">${iconClock()}</div>
    <span class="badge ${allDone?'pass':'fail'}">${allDone?'✓ Completadas':'✕ Pendiente'}</span>
  </div>`;
  return `<div class="res-grid">${measured}${stab}</div>`;
}

function yn(val){
  return `<div class="yn-row">
    <button class="yn-btn si ${val===true?'active':''}" data-yn="true">Sí</button>
    <button class="yn-btn no ${val===false?'active':''}" data-yn="false">No</button>
  </div>`;
}
function diagChips(val){
  return `<div class="chip-row">
    <div class="chip ${val===true?'active':''}" data-diag="true">Funciona</div>
    <div class="chip ${val===false?'active':''}" data-diag="false">No funciona</div>
  </div>`;
}
function chip(s){
  const active = state.serv[s.key]===true;
  return `<div class="chip ${active?'active':''}" data-serv="${s.key}">${s.label}</div>`;
}
function serviceCard(s){
  const active = state.serv[s.key]===true;
  return `<div class="service-card ${active?'active':''}" data-serv="${s.key}">
    <div class="service-check">✓</div>
    <div class="service-icon">${SERVICE_ICONS[s.icon]()}</div>
    <div class="service-label">${s.label}</div>
    <div class="service-desc">${s.desc}</div>
  </div>`;
}

function yearOptionsHtml(selected){
  let opts = `<option value="" ${selected?'':'selected'} disabled>Selecciona año</option>`;
  for(let y=2028; y>=1980; y--){
    opts += `<option value="${y}" ${String(selected)===String(y)?'selected':''}>${y}</option>`;
  }
  return opts;
}

function updateStepper(){
  const st = document.getElementById('stepper');
  if(!st.firstChild){
    st.innerHTML = `<div class="stepper-line"><div class="stepper-line-fill" id="stepperFill"></div></div><div class="stepper-dots">${SCREENS.map(()=>'<span class="sdot"></span>').join('')}</div>`;
  }
  const last = SCREENS.length-1;
  st.querySelectorAll('.sdot').forEach((d,i)=>{
    d.className = 'sdot' + (i<idx || (idx===last && i===last) ? ' done' : i===idx ? ' current' : '');
  });
  document.getElementById('stepperFill').style.width = (idx/last*100)+'%';
}

function render(){
  clearInterval(countdownInterval);
  const screen = SCREENS[idx];
  document.getElementById('folioTag').textContent = state.folio;
  updateStepper();
  document.getElementById('progressCaption').textContent = `Paso ${idx+1} de ${SCREENS.length}`;
  const app = document.getElementById('app');
  const nav = document.getElementById('navbar');
  let html = '', navHtml = '';
  const backBtn = idx>0 ? `<button class="btn btn-secondary" onclick="go(-1)">Atrás</button>` : '';

  if(screen==='datos'){
    document.getElementById('phaseLabel').textContent = 'Datos del servicio';
    html = `
      <h2 class="step-title">Antes de empezar</h2>
      <p class="step-sub">Estos datos van en el encabezado del comprobante que recibirá el cliente.</p>
      <div class="field"><label>ID Cliente</label><input type="text" id="fIdCliente" value="${state.idCliente}" placeholder="ID o folio del cliente en el CRM"></div>
      <div class="field"><label>Fecha</label><input type="date" id="fFecha" value="${state.fecha}"></div>
      <div class="field"><label>Técnico</label><input type="text" id="fTecnico" value="${state.tecnico}" placeholder="Nombre del técnico"></div>
      <div class="field"><label>Modelo del vehículo</label><input type="text" id="fModelo" value="${state.vehiculo.modelo}" placeholder="Marca y modelo"></div>
      <div class="field"><label>Año</label><select id="fAnio">${yearOptionsHtml(state.vehiculo.anio)}</select></div>
      <div class="field"><label>Placa</label><input type="text" id="fPlaca" value="${state.vehiculo.placa}" placeholder="Placa del vehículo"></div>
      <div class="field"><label>${odometerIconSvg(14)} Kilometraje actual</label><input type="text" inputmode="numeric" id="fKm" value="${state.kilometraje}" placeholder="Ej. 45000"></div>
      <div class="field"><label>Nombre del cliente</label><input type="text" id="fCliente" value="${state.cliente}" placeholder="Nombre completo"></div>
    `;
    navHtml = `${backBtn}<button class="btn btn-primary" onclick="saveDatos()">Continuar</button>`;
  }

  else if(screen==='pre'){
    document.getElementById('phaseLabel').textContent = 'Revisión antes de desinstalar';
    html = `<p class="step-sub">Con el cliente presente, antes de tocar la batería.</p>`;
    PRECHECK.forEach(p=>{
      html += `<div class="precheck-item">
        <p>${p.label}</p>
        <div data-key="${p.key}">${yn(state.pre[p.key])}</div>
        ${p.key==='testigos' && state.pre.testigos===true ? `<div class="field" style="margin-top:12px;"><label>¿Cuáles?</label><input type="text" id="testigosCuales" value="${state.pre.testigosCuales}" placeholder="Ej. check engine, batería"></div>` : ''}
      </div>`;
    });
    html += `<div class="field" style="margin-top:20px;"><label>Observaciones iniciales</label><textarea id="observaciones" placeholder="Golpes, detalles del vehículo, contexto del cliente...">${state.pre.observaciones}</textarea></div>`;
    navHtml = `${backBtn}<button class="btn btn-primary" onclick="savePreAndGo()">Continuar</button>`;
  }

  else if(screen.startsWith('c') && screen.length<=3 && !isNaN(screen[1])){
    const n = parseInt(screen.slice(1));
    const step = CHECK7[n-1];
    document.getElementById('phaseLabel').textContent = `Check 7 · Paso ${n} de 7`;
    let body = '';
    if(step.type==='stabilization'){
      const done = state.stabilizeDone[n];
      body = `
        <div class="stabilize-wrap">
          <div class="stabilize-ring">
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle class="track" cx="75" cy="75" r="64" stroke-width="8"/>
              <circle id="cdCircle" class="progress ${done?'done':''}" cx="75" cy="75" r="64" stroke-width="8"
                stroke-dasharray="${2*Math.PI*64}" stroke-dashoffset="${done?0:2*Math.PI*64}"/>
            </svg>
            <div class="stabilize-number" id="cdNumber">${done?'✓':'7'}</div>
          </div>
          <p class="stabilize-caption">${done?'Estabilización completada.':'Espera mientras el vehículo se estabiliza…'}</p>
          ${done?'':`<button class="skip-link" onclick="skipStabilize(${n})">Adelantar (solo demo)</button>`}
        </div>
      `;
    } else {
      const [min,max] = rangeFor(step);
      const zone = zoneFor(step);
      const initVerdict = step.type==='baseline' ? null : verdictFor(step, state.volts[n]);
      body = `
        ${gaugeStageHtml(step, state.volts[n], min, max, zone, initVerdict)}
        <div class="value-entry field">
          <label>Ingresa la lectura</label>
          <input type="number" step="0.01" inputmode="decimal" id="voltInput" placeholder="0.00" value="${state.volts[n]}" oninput="onVoltInput(${n})">
        </div>
      `;
    }
    const initVerdictForNum = step.type==='baseline'||step.type==='stabilization' ? null : verdictFor(step, state.volts[n]);
    const numClass = initVerdictForNum ? (initVerdictForNum.tone==='pass'?' pass':initVerdictForNum.tone==='fail'?' fail':'') : '';
    html = `
      <div class="check-card">
        <div class="check-eyebrow">
          <div class="check-num${numClass}" id="checkNum">${step.n}</div>
          <div class="check-what">${step.cat}</div>
        </div>
        <h3 class="check-title">${step.title}</h3>
        <p class="check-instruction">${step.instruction}</p>
        ${body}
      </div>
    `;
    if(step.type==='stabilization'){
      const done = state.stabilizeDone[n];
      navHtml = `${backBtn}<button class="btn btn-primary" ${done?'':'disabled'} onclick="go(1)">${n<7?'Siguiente medición':'Continuar'}</button>`;
    } else {
      navHtml = `${backBtn}<button class="btn btn-primary" onclick="saveVoltAndGo(${n})">${n<7?'Siguiente medición':'Continuar'}</button>`;
    }
  }

  else if(screen==='diagnostico'){
    document.getElementById('phaseLabel').textContent = 'Diagnóstico';
    html = `
      <p class="step-sub">Con base en las 7 mediciones anteriores.</p>
      <div class="diag-row">
        <div class="diag-row-head"><p>Batería nueva</p>${batteryIconHtml(state.diag.bateriaNueva)}</div>
        <div data-key="bateriaNueva">${diagChips(state.diag.bateriaNueva)}</div>
      </div>
      <div class="diag-row">
        <div class="diag-row-head"><p>Alternador</p>${batteryIconHtml(state.diag.alternador)}</div>
        <div data-key="alternador">${diagChips(state.diag.alternador)}</div>
      </div>
    `;
    navHtml = `${backBtn}<button class="btn btn-primary" onclick="go(1)">Continuar</button>`;
  }

  else if(screen==='servicios'){
    document.getElementById('phaseLabel').textContent = 'Servicios realizados';
    html = `<p class="step-sub">Marca lo que se realizó durante esta visita.</p>
      <div class="section-title">Paquete Tu Solución Total</div>
      <div class="service-grid">${PAQUETE.map(s=>serviceCard(s)).join('')}</div>
      <div class="section-title">Check 7</div>
      <div class="service-grid">${CHECK7SERV.map(s=>serviceCard(s)).join('')}</div>
    `;
    navHtml = `${backBtn}<button class="btn btn-primary" onclick="go(1)">Continuar</button>`;
  }

  else if(screen==='evaluacion'){
    document.getElementById('phaseLabel').textContent = 'Cierre con el cliente';
    html = `
      <p class="step-sub">Que el cliente califique el servicio y firme de conformidad.</p>
      <div class="section-title">Calificación</div>
      <div class="rate-row">
        <button class="rate-btn ${state.eval.calificacion==='bien'?'active':''}" data-r="bien">🙂</button>
        <button class="rate-btn ${state.eval.calificacion==='regular'?'active':''}" data-r="regular">😐</button>
        <button class="rate-btn ${state.eval.calificacion==='mal'?'active':''}" data-r="mal">🙁</button>
      </div>
      <div class="field"><label>Comentarios</label><textarea id="comentarios" placeholder="Opcional">${state.eval.comentarios}</textarea></div>
      <div class="section-title">Firma del cliente</div>
      <canvas id="sigCanvas"></canvas>
      <div class="sig-row">
        <button class="sig-clear" onclick="clearSig()">Borrar firma</button>
        <span class="sig-confirm ${state.eval.firmado?'show':''}" id="sigConfirm">✓ Firma capturada</span>
      </div>
      <p class="disclaimer">Acepto que el vehículo está funcionando con normalidad, que lo recibo en las mismas condiciones en que lo entregué (a excepción del cambio de batería), que estuve presente y supervisé al técnico durante todo el servicio, y que el diagnóstico emitido por el técnico es válido únicamente el día que fue emitido.</p>
    `;
    navHtml = `${backBtn}<button class="btn btn-primary" onclick="finishEval()">Generar comprobante</button>`;
  }

  else if(screen==='resumen'){
    document.getElementById('phaseLabel').textContent = 'Comprobante';
    html = buildResumen();
    navHtml = `<button class="btn btn-secondary" onclick="go(-1)">Editar</button><button class="btn btn-primary" onclick="nuevoServicio()">Nuevo servicio</button>`;
  }

  app.innerHTML = html;
  nav.innerHTML = navHtml;
  wireEvents(screen);
}

function wireEvents(screen){
  document.querySelectorAll('.yn-btn').forEach(b=>{
    b.onclick = ()=>{
      const parent = b.closest('[data-key]');
      const key = parent.getAttribute('data-key');
      state.pre[key] = b.getAttribute('data-yn')==='true';
      render();
    };
  });
  document.querySelectorAll('[data-diag]').forEach(b=>{
    b.onclick = ()=>{
      const parent = b.closest('[data-key]');
      const key = parent.getAttribute('data-key');
      state.diag[key] = b.getAttribute('data-diag')==='true';
      render();
    };
  });
  document.querySelectorAll('[data-serv]').forEach(b=>{
    b.onclick = ()=>{
      const key = b.getAttribute('data-serv');
      state.serv[key] = !state.serv[key];
      render();
    };
  });
  document.querySelectorAll('.rate-btn').forEach(b=>{
    b.onclick = ()=>{ state.eval.calificacion = b.getAttribute('data-r'); render(); };
  });
  if(screen==='evaluacion'){ setTimeout(setupSignature, 0); }

  if(screen.startsWith('c') && screen.length<=3 && !isNaN(screen[1])){
    const n = parseInt(screen.slice(1));
    const step = CHECK7[n-1];
    if(step.type==='stabilization'){
      if(!state.stabilizeDone[n]) startCountdown(n);
    } else if(step.type!=='baseline'){
      onVoltInput(n);
    }
  }
}

function saveDatos(){
  state.idCliente = document.getElementById('fIdCliente').value;
  state.fecha = document.getElementById('fFecha').value || todayIso();
  state.tecnico = document.getElementById('fTecnico').value;
  state.vehiculo = {
    modelo: document.getElementById('fModelo').value,
    anio: document.getElementById('fAnio').value,
    placa: document.getElementById('fPlaca').value
  };
  state.kilometraje = document.getElementById('fKm').value;
  state.cliente = document.getElementById('fCliente').value;
  go(1);
}
function savePreAndGo(){
  const tc = document.getElementById('testigosCuales');
  if(tc) state.pre.testigosCuales = tc.value;
  const obs = document.getElementById('observaciones');
  if(obs) state.pre.observaciones = obs.value;
  go(1);
}
function saveVoltAndGo(n){
  const v = document.getElementById('voltInput');
  state.volts[n] = v.value;
  go(1);
}
function onVoltInput(n){
  const el = document.getElementById('voltInput');
  const step = CHECK7[n-1];
  if(!el) return;
  const val = el.value;
  const verdict = step.type==='baseline' ? null : verdictFor(step, val);
  const [min,max] = rangeFor(step);
  const pct = valuePct(val, min, max);
  const color = toneColor(verdict);
  const valueEl = document.getElementById('liveGaugeValue');
  if(valueEl) valueEl.textContent = valueText(val);
  const progress = document.getElementById('liveGaugeProgress');
  if(progress){ progress.style.strokeDashoffset = 100*(1-(pct||0)); progress.style.stroke = color; }
  const needle = document.getElementById('liveGaugeNeedle');
  if(needle){
    needle.style.transform = `rotate(${-angleFor(pct===null ? 0 : pct)}deg)`;
    needle.classList.toggle('on', pct!==null);
  }
  updateBarsChart(pct, color);
  const badge = document.getElementById('verdictBadge');
  if(badge){
    if(verdict){ badge.className = 'chip-status show '+verdict.tone; badge.textContent = verdict.label; }
    else { badge.className = 'chip-status'; badge.textContent=''; }
  }
  const numEl = document.getElementById('checkNum');
  if(numEl){
    numEl.className = 'check-num' + (verdict && verdict.tone==='pass' ? ' pass' : verdict && verdict.tone==='fail' ? ' fail' : '');
  }
}
function finishEval(){
  const c = document.getElementById('comentarios');
  state.eval.comentarios = c.value;
  go(1);
}
/* ---------- Intro Check 7 ---------- */
let introPlayed = false;
let introTimer = null;
function introMarkup(){
  let dots = '';
  for(let i=0; i<7; i++){
    const a = (-90 + i*360/7);
    const p = polar(100, 100, 88, -a);
    dots += `<circle class="idot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" style="animation-delay:${(0.8+i*0.17).toFixed(2)}s"/>`;
  }
  return `
    <div class="intro-grid"></div>
    <div class="intro-scan"></div>
    <div class="intro-center">
      <div class="intro-glow"></div>
      <svg class="intro-ring" viewBox="0 0 200 200" aria-hidden="true">
        <circle class="iring" cx="100" cy="100" r="88" pathLength="100" style="transform:rotate(-90deg);transform-origin:100px 100px"/>
        <circle class="iring-spin" cx="100" cy="100" r="94" pathLength="100"/>
        ${dots}
      </svg>
      <div class="intro-word">
        <svg class="intro-bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
        <span class="iw-check">Check</span>
        <span class="iw-seven">7</span>
      </div>
    </div>
    <div class="intro-tag">Diagnóstico eléctrico</div>
    <div class="intro-badge">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z"/><path d="M9 12l2 2 4-4.5"/></svg>
      Software exclusivo Power Delivery
    </div>
    <div class="intro-skip">Toca para continuar</div>`;
}
function playCheck7Intro(){
  const el = document.createElement('div');
  el.id = 'check7Intro';
  el.className = 'intro';
  el.innerHTML = introMarkup();
  el.onclick = closeIntro;
  document.body.appendChild(el);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  introTimer = setTimeout(closeIntro, reduced ? 1400 : 3800);
}
function closeIntro(){
  clearTimeout(introTimer);
  const el = document.getElementById('check7Intro');
  if(!el || el.classList.contains('out')) return;
  el.classList.add('out');
  setTimeout(()=>el.remove(), 550);
}

function go(delta){
  const leavingPre = delta>0 && SCREENS[idx]==='pre';
  idx = Math.max(0, Math.min(SCREENS.length-1, idx+delta));
  render();
  if(leavingPre && !introPlayed){ introPlayed = true; playCheck7Intro(); }
}
function nuevoServicio(){
  state = blankState(newFolio());
  idx = 0;
  introPlayed = false;
  render();
}

function startCountdown(n){
  clearInterval(countdownInterval);
  let remaining = 7;
  const numEl = document.getElementById('cdNumber');
  const circle = document.getElementById('cdCircle');
  const CIRC = 2*Math.PI*64;
  if(circle){
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = CIRC;
    requestAnimationFrame(()=>{
      circle.style.transition = 'stroke-dashoffset 7s linear';
      circle.style.strokeDashoffset = '0';
    });
  }
  countdownInterval = setInterval(()=>{
    remaining--;
    if(numEl) numEl.textContent = Math.max(remaining,0);
    if(remaining<=0){
      clearInterval(countdownInterval);
      state.stabilizeDone[n] = true;
      render();
    }
  },1000);
}
function skipStabilize(n){
  clearInterval(countdownInterval);
  state.stabilizeDone[n] = true;
  render();
}

// Signature pad
let sigCtx, drawing=false;
function setupSignature(){
  const canvas = document.getElementById('sigCanvas');
  if(!canvas) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth*ratio;
  canvas.height = canvas.clientHeight*ratio;
  sigCtx = canvas.getContext('2d');
  sigCtx.scale(ratio,ratio);
  sigCtx.strokeStyle = '#12142A';
  sigCtx.lineWidth = 2;
  sigCtx.lineCap = 'round';
  const pos = e=>{
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {x:t.clientX-r.left, y:t.clientY-r.top};
  };
  const start = e=>{ drawing=true; const p=pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x,p.y); markSigned(); };
  const move = e=>{ if(!drawing) return; e.preventDefault(); const p=pos(e); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); };
  const end = ()=>{ drawing=false; };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
}
function markSigned(){
  state.eval.firmado = true;
  const el = document.getElementById('sigConfirm');
  if(el) el.classList.add('show');
}
function clearSig(){
  if(!sigCtx) return;
  const canvas = document.getElementById('sigCanvas');
  sigCtx.clearRect(0,0,canvas.width,canvas.height);
  state.eval.firmado = false;
  const el = document.getElementById('sigConfirm');
  if(el) el.classList.remove('show');
}

function faceFor(c){ return c==='bien'?'🙂':c==='regular'?'😐':c==='mal'?'🙁':'—'; }
function servLabel(key){
  const all = [...PAQUETE, ...CHECK7SERV];
  const f = all.find(s=>s.key===key);
  return f ? f.label : key;
}
function serviceMiniChip(key){
  const all = [...PAQUETE, ...CHECK7SERV];
  const s = all.find(x=>x.key===key);
  if(!s) return '';
  return `<div class="mini-service-chip">
    <span class="mini-service-icon">${SERVICE_ICONS[s.icon]()}</span>
    <span>${s.label}</span>
  </div>`;
}
function categoryPct(steps){
  let p=0,t=0;
  steps.forEach(n=>{
    const step = CHECK7[n-1];
    const v = verdictFor(step, state.volts[n]);
    if(!v) return;
    t++;
    if(v.tone==='pass') p++;
  });
  return t===0 ? null : Math.round((p/t)*100);
}
function categoryBarHtml(label, pct){
  const color = pct===null ? 'var(--ink-faint)' : pct>=70?'var(--pass)':pct>=40?'var(--warn)':'var(--fail)';
  const display = pct===null?'—':pct+'%';
  const width = pct===null?0:pct;
  return `<div class="cat-bar-row">
    <div class="cat-bar-label">${label}</div>
    <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${width}%;background:${color}"></div></div>
    <div class="cat-bar-pct">${display}</div>
  </div>`;
}
function buildSummaryDonut(){
  const measurable = CHECK7.filter(s=>s.type==='carga'||s.type==='retiene');
  let p=0,f=0,w=0;
  measurable.forEach(s=>{
    const v = verdictFor(s, state.volts[s.n]);
    if(!v) return;
    if(v.tone==='pass') p++; else if(v.tone==='fail') f++; else w++;
  });
  const total = p+f+w;
  const size=92, strokeW=11, r=(size/2)-strokeW/2, circ=2*Math.PI*r;
  let segments = '';
  if(total===0){
    segments = `<circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#E3E7F7" stroke-width="${strokeW}" fill="none"/>`;
  } else {
    let offsetAcc = 0;
    const parts = [
      {count:p, color:'var(--pass)'},
      {count:w, color:'var(--warn)'},
      {count:f, color:'var(--fail)'}
    ];
    parts.forEach(part=>{
      if(part.count<=0) return;
      const len = (part.count/total)*circ;
      segments += `<circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${part.color}" stroke-width="${strokeW}" fill="none"
        stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offsetAcc}" transform="rotate(-90 ${size/2} ${size/2})"/>`;
      offsetAcc += len;
    });
  }
  return `<div class="donut-wrap">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${segments}</svg>
    <div class="donut-center"><div class="donut-num">${p}/${total||4}</div><div class="donut-label">en rango</div></div>
  </div>`;
}

function buildFooter(){
  return `
    <div class="ticket-footer">
      <div class="footer-section">
        <div class="footer-title">Prolonga la vida de tu batería con estos consejos</div>
        <div class="tip-row">${iconPower()}<div><b>Apaga todo antes de encender.</b> Asegúrate de que el aire acondicionado, las luces y el radio estén apagados antes de girar la llave o presionar el botón de arranque.</div></div>
        <div class="tip-row">${iconClock()}<div><b>Dale 20 minutos de uso continuo.</b> Al menos una vez por semana, maneja sin paradas durante 20 minutos. Esto le da tiempo al alternador para recargar la batería al 100%.</div></div>
        <div class="tip-row">${iconSparkle()}<div><b>Pasa un trapo seco.</b> De vez en cuando, limpia el polvo y la tierra de la parte superior de la batería. La suciedad acumulada puede crear pequeñas fugas de energía.</div></div>
      </div>
      <div class="footer-section">
        <div class="footer-title">${iconShield()} Garantía</div>
        <p class="footer-text">Recuerda que tienes un periodo de 30 días para aplicar la garantía a domicilio sin costo, posteriormente tiene un cobro de $400 por concepto de asistencia, o si lo prefieres puedes llevar la batería a nuestra sucursal.</p>
      </div>
      <div class="footer-section">
        <div class="footer-title">${iconReceipt()} Facturación</div>
        <p class="footer-text">Si requieres facturar tu compra ingresa a <a href="https://www.powerdelivery.mx/facturacion" target="_blank">www.powerdelivery.mx/facturacion</a> y manda tus datos a más tardar en un periodo de 24 hrs posterior a tu compra, de lo contrario se facturará al público en general.</p>
      </div>
      <div class="footer-section">
        <div class="footer-title">${iconShare()} Síguenos</div>
        <p class="footer-text">Síguenos en nuestras redes sociales para estar pendiente de tips y dinámicas todas las semanas en <b>@PowerDeliveryMX</b>.</p>
      </div>
    </div>
  `;
}

function buildResumen(){
  const activeServKeys = Object.keys(state.serv).filter(k=>state.serv[k]===true);
  const servActivos = activeServKeys.length ? `<div class="mini-service-grid">${activeServKeys.map(k=>serviceMiniChip(k)).join('')}</div>` : '<span style="color:var(--ink-faint);font-size:13px;">Ninguno marcado</span>';

  const altPct = categoryPct([2,3]);
  const battPct = categoryPct([5,7]);

  return `
    <div class="ticket">
      <div class="ticket-head">
        <img class="brand-logo" src="/logo.png" alt="Power Delivery">
        <div class="meta">FOLIO ${state.folio} · ${formatFecha(state.fecha)}</div>
      </div>
      <div class="ticket-dash">
        ${buildSummaryDonut()}
        <div class="cat-bars">
          ${categoryBarHtml('Alternador', altPct)}
          ${categoryBarHtml('Batería', battPct)}
        </div>
      </div>
      ${buildFinalGauges()}
      <div class="ticket-body">
        <div class="ticket-meta-grid">
          <div class="meta-item"><div class="meta-label">ID Cliente</div><div class="meta-value">${state.idCliente||'—'}</div></div>
          <div class="meta-item"><div class="meta-label">Cliente</div><div class="meta-value">${state.cliente||'—'}</div></div>
          <div class="meta-item"><div class="meta-label">Técnico</div><div class="meta-value">${state.tecnico||'—'}</div></div>
          <div class="meta-item"><div class="meta-label">Modelo</div><div class="meta-value">${state.vehiculo.modelo||'—'}</div></div>
          <div class="meta-item"><div class="meta-label">Año</div><div class="meta-value">${state.vehiculo.anio||'—'}</div></div>
          <div class="meta-item"><div class="meta-label">Placa</div><div class="meta-value">${state.vehiculo.placa||'—'}</div></div>
          <div class="meta-item full"><div class="meta-label">${odometerIconSvg(11)} Kilometraje</div><div class="meta-value">${state.kilometraje?state.kilometraje+' km':'—'}</div></div>
        </div>
        ${state.pre.observaciones ? `<div class="section-title">Observaciones iniciales</div><p class="obs-text">${state.pre.observaciones}</p>` : ''}
        <div class="section-title">Check 7 — resultados</div>
        ${buildResultGrid()}
        <div class="section-title">Diagnóstico</div>
        <div class="ticket-row"><span class="label">Batería nueva</span><span class="val" style="gap:8px;">${batteryIconHtml(state.diag.bateriaNueva)}<span style="font-family:var(--font-body);font-size:12.5px;font-weight:600;">${state.diag.bateriaNueva===null?'—':(state.diag.bateriaNueva?'Funciona':'No funciona')}</span></span></div>
        <div class="ticket-row"><span class="label">Alternador</span><span class="val" style="gap:8px;">${batteryIconHtml(state.diag.alternador)}<span style="font-family:var(--font-body);font-size:12.5px;font-weight:600;">${state.diag.alternador===null?'—':(state.diag.alternador?'Funciona':'No funciona')}</span></span></div>
        <div class="section-title">Servicios realizados</div>
        <div style="margin-bottom:6px;">${servActivos}</div>
        <div class="section-title">Cliente</div>
        <div class="ticket-row"><span class="label">Calificación</span><span class="val" style="font-size:20px;">${faceFor(state.eval.calificacion)}</span></div>
        <div class="ticket-row" style="border-bottom:none;"><span class="label">Firma</span><span class="val">${state.eval.firmado?'Capturada ✓':'Pendiente'}</span></div>
      </div>
      ${buildFooter()}
    </div>
    <p class="step-sub" style="margin-top:-8px;">El comprobante en PDF se envía por correo al cliente.</p>
    <div class="field">
      <label>Correo del cliente</label>
      <input type="email" id="fCorreoCliente" value="${state.correoCliente}" placeholder="correo@ejemplo.com">
    </div>
    <button class="send-btn-primary" id="sendBtn" onclick="sendReport()">Enviar por correo</button>
  `;
}

function showToast(msg, ms){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=>t.classList.remove('show'), ms || 3200);
}

async function sendReport(){
  const input = document.getElementById('fCorreoCliente');
  const email = input.value.trim();
  state.correoCliente = email;
  if(!email || !email.includes('@') || !email.includes('.')){
    showToast('Ingresa un correo válido para enviar el comprobante.');
    return;
  }
  const btn = document.getElementById('sendBtn');
  const ticketEl = document.querySelector('.ticket');
  if(!ticketEl){ showToast('No se encontró el comprobante en pantalla.'); return; }
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try{
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ state, ticketHtml: ticketEl.outerHTML })
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || !data.ok){
      throw new Error(data.error || 'No se pudo enviar el comprobante.');
    }
    btn.textContent = 'Enviado ✓';
    let msg = `Comprobante enviado a ${email}.`;
    if(data.mondayError) msg += ' (No se pudo registrar en Monday.com)';
    showToast(msg, 4000);
  } catch(err){
    console.error(err);
    btn.disabled = false;
    btn.textContent = originalLabel;
    showToast(err.message || 'Ocurrió un error al enviar el comprobante.', 4000);
  }
}

render();
