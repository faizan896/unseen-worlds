import {fmt} from './scope.js';

const labels={learned:'Trained chooser',gain:'Information gain',fixed:'Fixed plan',random:'Random',passive:'Passive observation'};
const curvesShown=['passive','random','learned','gain'];
let split='test',group='All';
const options=(items,current)=>items.map(([v,t])=>`<option value="${v}" ${v===current?'selected':''}>${t}</option>`).join('');
const key=s=>`<i class="swatch ${s}" aria-hidden="true"></i>`;

function errorChart(curves,fixed,k){
  const max=Math.max(5,Math.ceil(Math.max(...Object.values(curves).flat())/5)*5);
  const left=72,right=550;
  const X=i=>left+(right-left)*i/(curves.learned.length-1),Y=v=>186-v/max*145;
  const budgets=curves.learned.map((_,i)=>i);
  return `<svg class="chart" viewBox="0 0 580 238" role="img" aria-label="Mean forecast error versus tests used. Information-gain rings coincide with the trained chooser line. Tables follow.">
    <text x="13" y="19">Endpoint error (units)</text>
    ${Array.from({length:5},(_,i)=>max*i/4).map(v=>`<path class="graticule" d="M${left} ${Y(v)}H${right}"/><text x="${left-8}" y="${Y(v)+4}" text-anchor="end">${fmt(v,2)}</text>`).join('')}
    ${budgets.map(i=>`<path class="graticule" stroke-dasharray="1 4" d="M${X(i)} 35V188"/><text x="${X(i)}" y="207" text-anchor="middle">${i}</text>`).join('')}
    ${curvesShown.map(s=>`<polyline class="curve ${s}" points="${curves[s].map((v,i)=>X(i)+','+Y(v)).join(' ')}"/>`).join('')}
    ${curves.gain.map((v,i)=>`<circle class="gain-point" cx="${X(i)}" cy="${Y(v)}" r="3.5"/>`).join('')}
    <g transform="translate(${X(k)},${Y(fixed.error)})"><title>Fixed plan at test ${k}: ${fixed.error} units</title><path class="diamond" d="M0 -6 6 0 0 6 -6 0Z"/></g>
    <text x="${(left+right)/2}" y="231" text-anchor="middle">Tests used</text></svg>`;
}
export function benchmark(data,replay){
  const {n,curves,at_three}=data.splits[split][group],k=data.three_budget,retro=data.retrospective[split].groups[group];
  const budgets=curves.passive.map((_,i)=>i);
  document.querySelector('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">Benchmark / Policy evaluation</div><h1>Forecast error</h1>
    <p>Compare how well each strategy predicts four unseen endpoints as it spends its experiment budget.</p></div></section>
    <div class="workbench benchmark"><div><figure class="chamber"><figcaption><span class="instrument-name"><i aria-hidden="true">03</i> Error by test budget</span><span class="figure-state">${n} worlds</span></figcaption>
    <div class="filters"><label>Evaluation split<select id="split">${options([['test','Held-out layouts'],['transfer','Transfer · family × strength']],split)}</select></label>
    <label>World family<select id="family">${options(Object.keys(data.splits[split]).map(x=>[x,x]),group)}</select></label></div>
    ${errorChart(curves,at_three.fixed,k)}<div class="plotlegend">${['learned','gain','random','passive','fixed'].map(s=>`<span>${key(s)}${labels[s]}</span>`).join('')}</div></figure>
    <section class="bench-results"><div class="section-head"><h2>Three-test results</h2><span class="tiny">Lower error is better</span></div>
    <table><thead><tr><th>Strategy</th><th>Mean error · units</th><th>One rule / runs</th></tr></thead><tbody>${['learned','gain','fixed','random'].map(s=>`<tr class="${s==='learned'?'highlight':''}"><th scope="row">${labels[s]}</th><td title="${at_three[s].error}">${fmt(at_three[s].error,6)}</td><td>${at_three[s].unique} / ${at_three[s].runs}</td></tr>`).join('')}</tbody></table>
    <p class="under">One rule means only one catalog rule fits the observations. Random counts world–seed pairs (${data.seeds} seeds per world).</p>
    <details><summary>Error at every test budget</summary><div class="tablewrap"><table><thead><tr><th>Strategy / tests</th>${budgets.map(i=>'<th>'+i+'</th>').join('')}</tr></thead><tbody>${curvesShown.map(s=>`<tr><th>${labels[s]}</th>${curves[s].map(v=>`<td title="${v}">${v.toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
    <details><summary>Retrospective check</summary><p class="under">Selecting the best fixed plan using this split’s own answers gives ${fmt(retro.error,6)} units of error and ${retro.unique}/${retro.runs} worlds with one rule. This hindsight result is not the training-selected baseline.</p></details></section></div>
    <aside class="controls"><div class="kicker">Matched budget / 03 tests</div><h2>Plan or adapt?</h2>
    <p class="sub">The fixed plan commits to three tests. The trained chooser uses each observation to decide what to try next.</p>
    <button class="solid full" id="branch">Replay fixed vs. adaptive →</button>
    <div class="line"></div><h3>Reading the plot</h3><p class="sub">The diamond marks the fixed plan at test three. Open rings mark information gain where it overlaps the chooser.</p>
    <p class="sub">All strategies use the same predictor over the same catalog. Only the choice of tests changes.</p>
    <div class="line"></div><h3>Other episodes</h3><button class="examplebtn" id="win">Where the chooser wins ↗</button>
    <button class="examplebtn" id="struggle">Where random gets lucky ↗</button></aside></div>`;
  for(const id of ['split','family'])document.getElementById(id).onchange=e=>{
    if(id==='split')split=e.target.value;else group=e.target.value;
    benchmark(data,replay);document.getElementById(id).focus({preventScroll:true})
  };
  for(const example of ['win','struggle'])document.getElementById(example).onclick=()=>replay(data.examples[split][example].id);
  document.querySelector('#branch').onclick=()=>replay(data.examples[split].branch[group].id,'compare');
}
