import {fmt} from './scope.js';
const labels={passive:'Passive observation',random:'Random',learned:'Trained chooser',gain:'Information gain'};
const palette={passive:'var(--muted)',random:'var(--blue)',learned:'var(--accent)',gain:'var(--primary-action)'};
let split='test',group='All';
export function benchmark(data,replay){
  const {n,curves}=data.splits[split][group], names=Object.keys(labels), budgets=curves.passive.map((_,i)=>i);
  const max=Math.max(5,Math.ceil(Math.max(...Object.values(curves).flat())/5)*5);
  const X=i=>49+494*i/data.budget,Y=v=>195-v/max*163;
  const legend=names.map(s=>`<span style="--line:${palette[s]}">${labels[s]}</span>`).join('');
  const ticks=Array.from({length:5},(_,i)=>i*max/4);
  const chart=`<svg class="chart" viewBox="0 0 580 240" role="img" aria-label="Mean forecast error in chamber units versus experiments used. Exact values in the table below.">
  ${ticks.map(v=>`<path d="M46 ${Y(v)} H547" stroke="var(--border)"/><text x="39" text-anchor="end" y="${Y(v)+4}">${fmt(v)}</text>`).join('')}
  ${names.map(s=>`<polyline fill="none" stroke="${palette[s]}" stroke-width="${s==='learned'?5:2.5}" stroke-dasharray="${s==='gain'?'4 6':'none'}" points="${curves[s].map((v,i)=>X(i)+','+Y(v)).join(' ')}"/>`).join('')}
  ${budgets.map(i=>`<text x="${X(i)}" y="215" text-anchor="middle">${i}</text>`).join('')}
  <text x="295" y="236" text-anchor="middle">Experiments used</text><text x="49" y="18">Mean endpoint error (units)</text></svg>`;
  const opts=vals=>vals.map(([v,t],i)=>`<option value="${v}" ${(v===split||v===group)?'selected':''}>${t}</option>`).join('');
  document.querySelector('#app').innerHTML=`<section class="hero"><div class="kicker">Research results / Benchmark</div><h1>Experiment <i>efficiency</i></h1><p>How much does one well-chosen test buy? Four strategies, the same forecast engine, and the same hidden worlds.</p></section>
  <div class="benchgrid"><section class="panel card"><div class="space wrap"><h2>Forecast error</h2><span class="pill">${n} configurations</span></div>
  ${chart}<div class="plotlegend">${legend}</div><p class="under">The dashed information-gain line overlays the trained chooser when their scores match.</p>
  <div class="tablewrap"><table><caption class="tiny">Mean distance in chamber units · lower is better</caption><thead><tr><th>Strategy / budget</th>${budgets.map(i=>'<th>'+i+'</th>').join('')}</tr></thead><tbody>${names.map(s=>`<tr><th>${labels[s]}</th>${curves[s].map(v=>'<td>'+v.toFixed(2)+'</td>').join('')}</tr>`).join('')}</tbody></table></div></section>
  <aside class="panel controls"><div class="kicker">Analysis settings</div><h2>Test population</h2><label class="ctrlLabel" for="split">Evaluation split</label><select id="split">${opts([['test','Held-out layouts'],['transfer','Unseen family × strength']])}</select>
  <label class="ctrlLabel" for="family">World family</label><select id="family">${opts(Object.keys(data.splits[split]).map(x=>[x,x]))}</select>
  <p class="note">${n} worlds × 4 forecasts each. Random curves average ${data.seeds} fixed seeds per world before averaging worlds.</p>
  <h3>Replay casebook</h3><p class="under">Split-wide extremes, not typical runs. Compared with random seed 0 by mean error over budgets 1–${data.budget}.</p>
  <button class="examplebtn" id="win"><strong>Where the chooser wins ↗</strong>Watch a diagnostic test pay off.</button>
  <button class="examplebtn" id="struggle"><strong>Where random gets lucky ↗</strong>A rare test that identifies a whole rule.</button></aside></div>
  <section class="panel card block"><div class="kicker">Interpretation</div><h2>A result about choosing, not inventing laws.</h2><p>The tiny network ranks interventions from measured motion. A separate evaluator enumerates compatible known laws and averages their endpoint predictions. Transfer holds out strength–family combinations, not entire mechanisms. It tests reuse of a normalized response in a noiseless catalog.</p></section>`;
  document.querySelector('#split').onchange=e=>{split=e.target.value;benchmark(data,replay)};
  document.querySelector('#family').onchange=e=>{group=e.target.value;benchmark(data,replay)};
  for(const example of ['win','struggle'])document.querySelector('#'+example).onclick=()=>replay(data.examples[split][example].id);
}
