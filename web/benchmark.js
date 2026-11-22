import {fmt} from './scope.js';
const labels={passive:'Passive observation',random:'Random',learned:'Trained chooser',gain:'Information gain'};
const palette={passive:'var(--muted)',random:'var(--blue)',learned:'var(--accent)',gain:'var(--c)'};
let split='test',group='All';
export function benchmark(data,replay){
  const {n,curves,at_three}=data.splits[split][group], names=Object.keys(labels), budgets=curves.passive.map((_,i)=>i);
  const k=data.three_budget, fixed=at_three.fixed, retro=data.retrospective[split].groups[group];
  const max=Math.max(5,Math.ceil(Math.max(...Object.values(curves).flat())/5)*5);
  const X=i=>49+494*i/data.budget,Y=v=>195-v/max*163;
  const legend=names.map(s=>`<span style="--line:${palette[s]}">${labels[s]}</span>`).join('');
  const ticks=Array.from({length:5},(_,i)=>i*max/4);
  const chart=`<svg class="chart" viewBox="0 0 580 240" role="img" aria-label="Mean forecast error in chamber units versus experiments used. Exact values in the table below.">
  ${ticks.map(v=>`<path d="M46 ${Y(v)} H547" stroke="var(--border)"/><text x="39" text-anchor="end" y="${Y(v)+4}">${fmt(v)}</text>`).join('')}
  ${names.map(s=>`<polyline fill="none" stroke="${palette[s]}" stroke-width="${s==='learned'?5:2.5}" stroke-dasharray="${s==='gain'?'4 6':'none'}" points="${curves[s].map((v,i)=>X(i)+','+Y(v)).join(' ')}"/>`).join('')}
  <g transform="translate(${X(k)},${Y(fixed.error)})"><title>Frozen fixed triple: ${fmt(fixed.error,6)} units, test ${k}</title><path d="M0 -6 L6 0 L0 6 L-6 0 Z" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/></g>
  ${budgets.map(i=>`<text x="${X(i)}" y="215" text-anchor="middle">${i}</text>`).join('')}
  <text x="295" y="236" text-anchor="middle">Experiments used</text><text x="49" y="18">Mean endpoint error (units)</text></svg>`;
  const opts=vals=>vals.map(([v,t],i)=>`<option value="${v}" ${(v===split||v===group)?'selected':''}>${t}</option>`).join('');
  const solvedAt=curves.learned.findIndex(v=>v===0);
  document.querySelector('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">Benchmark</div><h1>The cost of knowing.</h1></div><div class="intro"><p>${solvedAt<0?'The chooser still had forecast error at the final budget.':`The trained chooser reached zero forecast error after ${solvedAt} experiments.`} Random testing still averaged ${fmt(curves.random.at(-1),2)} units of error after ${data.budget}.</p></div></section>
  <div class="benchgrid"><section class="panel card"><div class="space wrap"><h2>Forecast error</h2><span class="pill">${n} configurations</span></div>
  ${chart}<div class="plotlegend">${legend}<b>◇ Frozen triple</b></div><p class="under">The diamond is a three-test result, not a curve. Dashes mark information gain where it overlaps the chooser.</p>
  <div class="tablewrap"><table><caption class="tiny">Mean distance in chamber units · lower is better</caption><thead><tr><th>Strategy / budget</th>${budgets.map(i=>'<th>'+i+'</th>').join('')}</tr></thead><tbody>${names.map(s=>`<tr><th>${labels[s]}</th>${curves[s].map(v=>'<td>'+v.toFixed(2)+'</td>').join('')}</tr>`).join('')}</tbody></table></div></section>
  <aside class="controls"><h2>Compare worlds</h2><label class="ctrlLabel" for="split">Evaluation split</label><select id="split">${opts([['test','Held-out layouts'],['transfer','Unseen family × strength']])}</select>
  <label class="ctrlLabel" for="family">World family</label><select id="family">${opts(Object.keys(data.splits[split]).map(x=>[x,x]))}</select>
  <p class="note">${n} worlds × 4 forecasts each. Random curves average ${data.seeds} fixed seeds per world before averaging worlds.</p>
  <button class="solid full" id="branch">Replay fixed vs. adaptive →</button></aside></div>
  <section class="card block"><div class="kicker">Matched budget · ${n} worlds</div><h2>Three tests, chosen when?</h2>
  <p>The fixed policy commits to its family’s training-selected triple before test one. Only the chooser and information-gain policy use the outcomes to design the next test.</p>
  <div class="tablewrap"><table><thead><tr><th>Strategy</th><th>Mean endpoint error</th><th>One rule / runs</th></tr></thead><tbody>${['fixed','learned','random','gain'].map(s=>`<tr><th>${labels[s]||'Frozen triple'}</th><td>${fmt(at_three[s].error,6)}</td><td>${at_three[s].unique} / ${at_three[s].runs}</td></tr>`).join('')}</tbody></table></div>
  <p class="under">Random counts world–seed pairs: ${at_three.random.unique/data.seeds} of ${n} worlds identified per seed on average. Other policies run once per world.</p>
  <details><summary>Retrospective check (not a deployable baseline)</summary><p>Choosing a new fixed triple with this split’s answers gives ${fmt(retro.error,6)} units of error and identifies ${retro.unique}/${retro.runs} worlds. These selections are not used by the frozen policy or replay.</p></details></section>
  <div class="workbench block"><section class="card"><h2>Choosing a test ≠ discovering a law.</h2><p>The network decides what to change next. A separate evaluator predicts motion by averaging the endpoints of every rule still consistent with the evidence. On the transfer set the model sees new combinations of familiar strengths and families, not new laws.</p></section>
  <section class="card"><h2>Two episodes</h2><p class="under">The biggest win and loss on this split against random seed 0, averaged over budgets 1–${data.budget}.</p>
  <button class="examplebtn" id="win"><strong>Where the chooser wins →</strong></button>
  <button class="examplebtn" id="struggle"><strong>Where random gets lucky →</strong></button></section></div>`;
  document.querySelector('#split').onchange=e=>{split=e.target.value;benchmark(data,replay)};
  document.querySelector('#family').onchange=e=>{group=e.target.value;benchmark(data,replay)};
  for(const example of ['win','struggle'])document.querySelector('#'+example).onclick=()=>replay(data.examples[split][example].id);
  document.querySelector('#branch').onclick=()=>replay(data.examples[split].branch[group].id,'compare');
}
