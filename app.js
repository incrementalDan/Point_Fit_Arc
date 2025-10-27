
/* Circle fitting web app — no dependencies
 * Algorithm: algebraic least squares (Pratt/Taubin-style stabilization)
 * Behavior: values are interpreted in the currently selected unit (no auto-scaling)
 * Formatting: 4 decimals for inches, 3 for mm
 */
const state = {
  unit: 'in',   // 'in' | 'mm'
  points: [],   // [{x:number,y:number}]
};

const fmt = (v) => {
  if (!isFinite(v)) return '—';
  const dp = state.unit === 'in' ? 4 : 3;
  return (+v).toFixed(dp);
};

const unitLabelEls = () => Array.from(document.querySelectorAll('.unit-label'));
const $ = (id) => document.getElementById(id);
const pointsBody = () => $('pointsBody');

function setUnit(u){
  state.unit = u;
  // aria + toggle visuals
  const btnIn = $('btnIn'), btnMm = $('btnMm');
  if(u === 'in'){
    btnIn.classList.add('active'); btnIn.setAttribute('aria-checked','true');
    btnMm.classList.remove('active'); btnMm.setAttribute('aria-checked','false');
  }else{
    btnMm.classList.add('active'); btnMm.setAttribute('aria-checked','true');
    btnIn.classList.remove('active'); btnIn.setAttribute('aria-checked','false');
  }
  // Update unit labels
  unitLabelEls().forEach(el => el.textContent = `(${u})`);
  // Re-render results with new decimal precision
  updateResults();
  drawPreview();
}

function addRow(x='', y=''){
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="idx"></td>
    <td><input inputmode="decimal" aria-label="X" value="${x}"></td>
    <td><input inputmode="decimal" aria-label="Y" value="${y}"></td>
    <td><button class="del" title="Delete row">×</button></td>
  `;
  pointsBody().appendChild(tr);
  tr.querySelectorAll('input').forEach(inp=>{
    inp.addEventListener('input', ()=>{ readPointsFromTable(); updateResults(); drawPreview(); });
    inp.addEventListener('keydown', (e)=>{
      if(e.key==='Enter'){ addRow(); const last = pointsBody().lastElementChild.querySelector('td:nth-child(2) input'); last.focus(); }
    });
  });
  tr.querySelector('.del').addEventListener('click', ()=>{ tr.remove(); refreshRowIndices(); updateResults(); drawPreview(); });
  refreshRowIndices();
}

function refreshRowIndices(){
  Array.from(pointsBody().querySelectorAll('tr')).forEach((tr,i)=>{
    tr.querySelector('.idx').textContent = i+1;
  });
  readPointsFromTable();
}

function readPointsFromTable(){
  const pts = [];
  Array.from(pointsBody().querySelectorAll('tr')).forEach(tr=>{
    const x = parseFloat(tr.querySelector('td:nth-child(2) input').value);
    const y = parseFloat(tr.querySelector('td:nth-child(3) input').value);
    if(isFinite(x) && isFinite(y)) pts.push({x,y});
  });
  state.points = pts;
  $('npts').textContent = pts.length;
  return pts;
}

function clearTable(){
  pointsBody().innerHTML = '';
  state.points = [];
  $('npts').textContent = '0';
  updateResults();
  drawPreview();
}

function sampleData(){
  clearTable();
  const pts = [
    [1,0],[0,1],[-1,0],[0,-1],
    [0.707,0.707],[-0.707,0.707],[-0.707,-0.707],[0.707,-0.707],
    [0.9,0.2],[0.2,0.95],[-0.3, -0.95]
  ];
  pts.forEach(([x,y]) => addRow(x,y));
  updateResults();
  drawPreview();
}

function exportCSV(){
  const header = `x_${state.unit},y_${state.unit}\n`;
  const rows = state.points.map(p => `${p.x},${p.y}`).join('\n');
  const blob = new Blob([header+rows], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `points_${state.unit}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importCSV(file){
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    const lines = text.split(/\\r?\\n/).filter(Boolean);
    const data = [];
    for(let i=0;i<lines.length;i++){
      const parts = lines[i].split(',').map(s=>s.trim());
      if (i===0 && parts[0] && parts[0].toLowerCase().startsWith('x')) continue; // skip header
      if(parts.length>=2){
        const x = parseFloat(parts[0]), y = parseFloat(parts[1]);
        if(isFinite(x) && isFinite(y)) data.push([x,y]);
      }
    }
    clearTable();
    data.forEach(([x,y])=>addRow(x,y));
    updateResults();
    drawPreview();
  };
  reader.readAsText(file);
}

// Pratt/Taubin stabilized algebraic circle fit
function fitCircle(points){
  const n = points.length;
  if(n < 3) return null;

  // Shift to mean for numerical stability
  let mx=0,my=0;
  for(const p of points){ mx+=p.x; my+=p.y; }
  mx/=n; my/=n;
  const X = points.map(p => ({x:p.x-mx, y:p.y-my}));

  // Compute moments
  let Suu=0,Svv=0,Suv=0, Suuu=0,Svvv=0,Suvv=0,Svuu=0;
  for(const p of X){
    const u=p.x, v=p.y;
    const uu=u*u, vv=v*v;
    Suu+=uu; Svv+=vv; Suv+=u*v;
    Suuu+=uu*u; Svvv+=vv*v; Suvv+=u*vv; Svuu+=v*uu;
  }

  const A = [[Suu, Suv],[Suv, Svv]];
  const B = [(Suuu+Suvv)/2, (Svvv+Svuu)/2];

  // Solve A * [uc, vc]^T = B
  const det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
  if (Math.abs(det) < 1e-12) return null;
  const uc = ( B[0]*A[1][1] - B[1]*A[0][1]) / det;
  const vc = (-B[0]*A[1][0] + B[1]*A[0][0]) / det;

  // Radius
  const r = Math.sqrt( (Suu+Svv)/n + uc*uc + vc*vc );

  // Shift back
  const cx = uc + mx;
  const cy = vc + my;

  // RMSE
  let err = 0;
  for(const p of points){
    const di = Math.hypot(p.x-cx, p.y-cy);
    err += (di - r)**2;
  }
  const rmse = Math.sqrt(err / n);
  return {cx, cy, r, rmse};
}

function updateResults(){
  const pts = readPointsFromTable();
  const out = fitCircle(pts);

  const set = (id,val)=>$(id).textContent = fmt(val);
  if(!out){
    ['cx','cy','r','d','rmse'].forEach(id=>$(id).textContent='—');
    return;
  }
  set('cx', out.cx);
  set('cy', out.cy);
  set('r', out.r);
  set('d', out.r * 2);
  set('rmse', out.rmse);
}

function drawPreview(){
  const canvas = $('preview');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // Background + grid
  ctx.save();
  ctx.fillStyle = '#101114';
  ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#22252a';
  ctx.lineWidth = 1;
  for(let x=0;x<=W;x+=50){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<=H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.restore();

  const pts = state.points;
  if (pts.length === 0) return;

  // Bounds
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const p of pts){ if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x; if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; }
  const fit = fitCircle(pts);
  if(fit){
    const r = fit.r;
    minX = Math.min(minX, fit.cx - r);
    maxX = Math.max(maxX, fit.cx + r);
    minY = Math.min(minY, fit.cy - r);
    maxY = Math.max(maxY, fit.cy + r);
  }
  if(!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return;

  // Padding + scale
  const pad = 0.1 * Math.max(maxX-minX, maxY-minY) || 1;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const dataW = maxX - minX, dataH = maxY - minY;
  const scale = 0.9 * Math.min(W/dataW, H/dataH);
  const offX = (W - dataW*scale)/2 - minX*scale;
  const offY = (H - dataH*scale)/2 + maxY*scale;

  const toXY = (p)=>({x: p.x*scale + offX, y: -p.y*scale + offY});

  // Points
  ctx.save();
  ctx.fillStyle = '#ff9500';
  for(const p of pts){
    const q = toXY(p);
    ctx.beginPath(); ctx.arc(q.x,q.y,4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Circle + center
  if(fit){
    const C = toXY({x:fit.cx, y:fit.cy});
    const edge = toXY({x:fit.cx + fit.r, y:fit.cy});
    const rr = Math.hypot(edge.x-C.x, edge.y-C.y);

    ctx.save();
    ctx.strokeStyle = '#34c759'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, Math.PI*2); ctx.stroke();

    ctx.fillStyle = '#0a84ff';
    ctx.beginPath(); ctx.arc(C.x, C.y, 5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#bbb';
    ctx.font = '12px system-ui, -apple-system, Segoe UI';
    const dp = state.unit === 'in' ? 4 : 3;
    ctx.fillText(`C = (${fit.cx.toFixed(dp)}, ${fit.cy.toFixed(dp)}) ${state.unit}`, C.x + 8, C.y - 8);
    ctx.fillText(`R = ${fit.r.toFixed(dp)} ${state.unit}`, C.x + 8, C.y + 10);
    ctx.restore();
  }
}

function wireUI(){
  $('unitToggle').addEventListener('click',(e)=>{
    const btn = e.target.closest('button[data-unit]');
    if(!btn) return;
    const u = btn.dataset.unit;
    if(u !== state.unit) setUnit(u);
  });

  $('addRowBtn').addEventListener('click', ()=>{ addRow(); drawPreview(); });
  $('clearBtn').addEventListener('click', ()=>{ clearTable(); });

  $('fitBtn').addEventListener('click', ()=>{ updateResults(); drawPreview(); });
  $('sampleBtn').addEventListener('click', ()=>{ sampleData(); });
  $('exportBtn').addEventListener('click', exportCSV);

  $('importBtn').addEventListener('click', ()=> $('importCsv').click());
  $('importCsv').addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(f) importCSV(f);
    e.target.value = '';
  });

  // Add some starter rows
  for(let i=0;i<4;i++) addRow();
  setUnit('in');
  drawPreview();
}

document.addEventListener('DOMContentLoaded', wireUI);
