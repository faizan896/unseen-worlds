import {projected,forecastPlot} from './forecast.js';
import {animate,stop,scopeMarkup,fmt,xy,field} from './scope.js';
import {benchmark} from './benchmark.js';
import {compare} from './comparison.js';
const $=s=>document.querySelector(s),app=$('#app');
const props={x:'Position x',y:'Position y',vx:'Velocity x',vy:'Velocity y',q:'Charge',mass:'Mass'};
const num=n=>String(n).padStart(2,'0');
let base,log=[],phase='lab',showing=0,mode='lab',knowledge,taskset,multipliers=[],score,episodes={},policy='learned',step=0,busy=false;
let comparisonFilm='learned',setup=0;
async function api(path,params={}){const r=await fetch('api/'+path+'?'+new URLSearchParams({...(base?{world:base.world}:{}),...params}));if(!r.ok)throw Error('The lab could not load that request. Check the world link or try again.');return r.json()}
function notice(msg){const n=$('#notice');n.textContent=msg;n.className='noticeOn';clearTimeout(notice.timer);notice.timer=setTimeout(()=>{n.className='';n.textContent=''},3600)}
function guarded(fn){return async(...args)=>{if(busy)return;busy=true;try{await fn(...args)}catch(e){notice(e.message)}finally{busy=false}}}
function hero(section,title,sub,button=''){
  return `<section class="hero"><div><div class="eyebrow">${section}</div><h1>${title}</h1><p>${sub}</p></div>${button?`<div class="hero-tools">${button}</div>`:''}</section>`
}
function nav(){for(const [id,v] of [['navLab','lab'],['navBench','bench']]){const b=$('#'+id);b.classList.toggle('selected',v===mode);if(v===mode)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
function urlFor(replay=false){const u=new URL(location.href);u.searchParams.set('world',base.world);for(const k of ['replay','step'])u.searchParams.delete(k);if(replay){u.searchParams.set('replay',policy);u.searchParams.set('step',step)}return u}
async function openWorld(id){
  const data=await api('open',id?{world:id}:{});
  base=data;log=[];phase='lab';showing=0;mode='lab';score=null;episodes={};taskset=null;setup=0;step=0;multipliers=[];
  history.replaceState({},'',urlFor());nav()
}
function newBtn(){return `<span class="world-id">World / ${base.world}</span><button class="textbtn" id="newWorld">New world ↗</button>`}
function newHook(){$('#newWorld').onclick=guarded(async()=>{if(phase==='lab'&&log.length&&!confirm('Start another world and discard your notebook?'))return;await openWorld('new');render()})}
function used(){return log.map(r=>r.action)}
function meter(n){return `<div class="budget"><span>Experiments used</span><span class="meter" aria-hidden="true">${Array.from({length:base.budget},(_,i)=>`<i class="${i<n?'used':''}"></i>`).join('')}</span><span class="value">${n}/${base.budget}</span></div>`}
function journal(){
  return `<section class="journal"><div class="section-head"><h2>Observation log</h2><span class="tiny">Probe A / notebook</span></div>
  <table><thead><tr><th>Test</th><th>Intervention</th><th>Endpoint (x, y)</th><th><span class="sr">Playback</span></th></tr></thead><tbody>${[base,...log].map((r,i)=>`<tr class="${i===showing?'current':''}"><td>${num(i)}</td><th scope="row">${i?base.actions[r.action][0]:'Opening'}</th><td>${xy(r.film.at(-1)[0])}</td><td><button class="textbtn" data-see="${i}" aria-label="Replay observation ${i}" aria-pressed="${i===showing}">↺ Replay</button></td></tr>`).join('')}</tbody></table></section>`;

}
function apparatus(trial){return `<details class="release"><summary>Release conditions · all probes</summary><p class="under">Measured acceleration of A: <span class="mono">${xy(field(trial))} units/s²</span></p><div class="tablewrap"><table><thead><tr><th>Probe</th><th>Position</th><th>Velocity</th><th>Mass</th><th>Charge</th></tr></thead><tbody>${trial.scene.map((p,i)=>`<tr><th>${'ABC'[i]}</th><td>${xy([p.x,p.y])}</td><td>${xy([p.vx,p.vy])}</td><td>${p.mass}</td><td>${p.q}</td></tr>`).join('')}</tbody></table></div></details>`}
function lab(){
  const trial=showing?log[showing-1]:base, spent=log.length, end=spent===base.budget;
  const avail=base.actions.map((a,i)=>[a,i]).filter(([,i])=>!used().includes(i));
  app.innerHTML=hero('Protocol 01 / Observation','Hidden rule experiment','Watch three probes move. Change one condition at a time to figure out the hidden rule.',newBtn())+
    `<div class="workbench instrument">${scopeMarkup(showing?'Test '+num(showing):'Opening run')}
    <aside class="controls intervention"><div class="kicker">Intervention / Probe A</div><h2>${end?'Trials complete':'Set up a test'}</h2><p class="sub">Each run starts from the opening conditions. B and C stay unchanged.</p>
    ${end?'':`<label class="ctrlLabel" for="action">Change one condition</label><select id="action">${avail.map(([[l],i])=>`<option value="${i}" ${!spent&&base.actions[i][1]==='mass'&&base.actions[i][2]===2?'selected':''}>${l}</option>`).join('')}</select><div class="actionRead" id="actionRead" aria-live="polite"></div>`}
    <button class="solid full" id="run" ${end?'disabled':''}>${end?'All tests recorded':'Run experiment'}<span aria-hidden="true">→</span></button>
    ${meter(spent)}<div class="forecastLink"><button class="${end?'solid':'outline'} full" id="predict">Make forecasts <span aria-hidden="true">→</span></button></div></aside></div>
    <div class="notebook">${journal()}${apparatus(trial)}</div>`;
  if(!end){
    const read=()=>{const [,k,v]=base.actions[Number($('#action').value)];$('#actionRead').innerHTML=`<span>${props[k]}</span><b>${base.scene[0][k]} → ${v}</b>`};read();$('#action').onchange=read;
  }
  $('#run').onclick=guarded(async()=>{const a=Number($('#action').value),trial=await api('run',{action:a,history:used().join(',')});log.push({...trial,action:a});showing=log.length;render()});
  $('#predict').onclick=guarded(async()=>{taskset=await api('tasks');if(!multipliers.length)multipliers=taskset.tasks.map(()=>1);phase='forecast';render();window.scrollTo(0,0)});
  document.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{showing=Number(b.dataset.see);render()});newHook();animate(trial,base)
}
function point(p,k){return projected(p,taskset.opening_field,k)}
function setupTabs(){
  return `<div class="setup-tabs" role="group" aria-label="Forecast setup">${taskset.tasks.map((_,i)=>`<button data-setup="${i}" aria-pressed="${i===setup}">Setup ${num(i+1)}</button>`).join('')}</div>`;
}
function setupHooks(){
  document.querySelectorAll('[data-setup]').forEach(b=>b.onclick=()=>{setup=Number(b.dataset.setup);render();$(`[data-setup="${setup}"]`).focus({preventScroll:true})});
}
function projection(actual){
  return `<figure class="chamber"><figcaption><span class="instrument-name"><i aria-hidden="true">02</i> Endpoint forecast</span><span class="figure-state">Setup ${num(setup+1)} / 04</span></figcaption>
    ${setupTabs()}<div class="scope"><div class="axes"><span>x → east &nbsp; y ↓ south</span><span>t = 2.00 s</span></div><div id="projection">${forecastPlot(taskset.tasks[setup],taskset.opening_field,multipliers[setup],actual)}</div>
    <div class="legend"><span class="key release-key">Release</span><span class="probe a">Predicted</span>${actual?'<span class="key actual">Actual</span>':''}</div></div></figure>`;
}
function forecast(){
  const p=taskset.tasks[setup];
  app.innerHTML=hero('Protocol 02 / Forecast','Predict the endpoints','For each new release, adjust the field to predict where the probe lands after two seconds.','<button id="back" class="textbtn">← Back to experiment</button>')+
    `<div class="workbench">${projection()}<aside class="controls"><div class="kicker">Prediction / ${num(setup+1)}</div><h2>Set the field</h2><p class="sub">1× keeps the opening acceleration. At 0× the probe coasts.</p>
    <label for="multiplier" class="row ctrlLabel"><span>Field multiplier</span><output id="mult"></output></label><input class="full" type="range" min="-2.4" max="1.5" step=".05" id="multiplier" value="${multipliers[setup]}">
    <div class="actionRead"><span>Predicted endpoint</span><output class="mono" id="pred"></output></div>
    ${setup<taskset.tasks.length-1?'<button class="outline full" id="nextSetup">Next setup →</button>':''}
    <button id="submit" class="solid full">Submit four forecasts →</button></aside></div>
    <section class="block"><h2>Release conditions</h2><div class="settings">${Object.entries(p).map(([k,v])=>`<span><small>${props[k]}</small>${v}</span>`).join('')}</div>
    <p class="under">Opening acceleration: <span class="mono">${xy(taskset.opening_field)} units/s²</span>.</p></section>`;
  const refresh=()=>{$('#mult').textContent=fmt(multipliers[setup],2)+'×';$('#pred').textContent=xy(point(p,multipliers[setup]));};
  refresh();$('#multiplier').oninput=e=>{multipliers[setup]=Number(e.target.value);refresh();$('#projection').innerHTML=forecastPlot(p,taskset.opening_field,multipliers[setup])};
  setupHooks();if($('#nextSetup'))$('#nextSetup').onclick=()=>{setup++;render();$('#multiplier').focus({preventScroll:true})};
  $('#back').onclick=()=>{phase='lab';render()};
  $('#submit').onclick=guarded(async()=>{score=await api('score',{history:used().join(','),points:JSON.stringify(taskset.tasks.map((p,i)=>point(p,multipliers[i])))});phase='reveal';setup=0;render();window.scrollTo(0,0)})
}
function reveal(){
  const a=score.witness,pred=point(taskset.tasks[setup],multipliers[setup]);
  app.innerHTML=hero('Protocol 03 / Results','Forecast results','Compare your predicted endpoints with the simulator, then inspect the rule behind the motion.',newBtn())+
    `<div class="workbench">${projection(score.truth[setup])}<aside class="controls"><div class="kicker">Mean endpoint error</div><div class="largeNum">${fmt(score.error,2)} <small>units</small></div>
    <p class="sub">Mean distance across four forecasts. Lower is better.</p><div class="line"></div>
    <div class="actionRead"><span>Predicted</span><b>${xy(pred)}</b></div><div class="actionRead"><span>Actual</span><b>${xy(score.truth[setup])}</b></div>
    <button class="solid full" id="watch">Replay the trained chooser →</button></aside></div>
    <section class="block"><div class="section-head"><h2>Endpoint check</h2><span class="tiny">${log.length} tests used</span></div><table><thead><tr><th>Setup</th><th>Predicted</th><th>Actual</th><th>Distance</th></tr></thead><tbody>${score.truth.map((pt,i)=>{const v=point(taskset.tasks[i],multipliers[i]);return `<tr><th>${num(i+1)}</th><td>${xy(v)}</td><td>${xy(pt)}</td><td>${fmt(Math.hypot(pt[0]-v[0],pt[1]-v[1]),2)}</td></tr>`}).join('')}</tbody></table></section>
    <section class="card block"><div class="kicker">${score.family} / Hidden rule</div><h2>${score.law.name}</h2><p>${score.law.explanation}</p><p>${score.remaining} compatible ${score.remaining===1?'rule remained':'rules remained'} after your tests.</p>
    <details><summary>Why the opening was ambiguous</summary><p>“${score.twin}” produces the same opening film. With “${base.actions[a][0]}”, A lands at ${xy(score.actual)} here and ${xy(score.other)} in the twin.</p></details></section>`;
  setupHooks();newHook();$('#watch').onclick=guarded(()=>enterReplay('learned'));
}
async function enterReplay(p,n=0){policy=p;if(!episodes[p])episodes[p]=await api('replay',{policy:p});step=Math.max(0,Math.min(base.budget,Math.trunc(Number(n)||0)));phase='replay';mode='lab';render();window.scrollTo(0,0)}
function replay(){
  const rec=episodes[policy],entry=rec.steps[step-1],trial=entry?rec.trials[step-1]:base;
  const btn=(s,l)=>`<button class="outline ${policy===s?'selected':''}" id="${s}" aria-pressed="${policy===s}">${l}</button>`;
  app.innerHTML=hero(rec.family+' world · Recorded episode',policy==='learned'?'Trained chooser replay':'Random policy replay','Replay the same world one decision at a time. The evaluator shows which rules are inconsistent with each measurement.',newBtn())+
  `<div class="tabs">${btn('learned','Trained chooser')}${btn('random','Random · seed 0')}<button class="textbtn" id="share">Copy replay link ↗</button>${score?'<button class="textbtn" id="my">Your results</button>':''}</div><div class="workbench block">${scopeMarkup(step?'Trial '+num(step):'Opening scene')}
  <aside class="panel controls"><div class="kicker">${policy==='learned'?'Trained policy':'Random policy'} / Playback</div><h2>${entry?base.actions[entry.action][0]:'Passive opening'}</h2><p class="sub">${entry?props[base.actions[entry.action][1]]+' on A: '+base.scene[0][base.actions[entry.action][1]]+' → '+base.actions[entry.action][2]+'.':'No experiments used yet.'}</p><div class="line"></div>${meter(step)}
  <div class="actionRead"><span>Observed endpoint</span><b>${xy(trial.film.at(-1)[0])}</b></div><div class="actionRead"><span>Measured field</span><b>${xy(field(trial))}</b></div>
  <div class="tiny">Shared predictor · forecast error</div><div class="largeNum">${fmt(rec.errors[step],2)} <small>units</small></div><div class="line"></div>
  <div class="replaynav"><button class="outline" id="prev" ${step===0?'disabled':''}>← Back</button><button class="solid" id="next" ${step===base.budget?'disabled':''}>Next test →</button></div></aside></div><section class="panel card block"><div class="kicker">Evaluator’s notebook</div><h2>${!entry?'Eight plausible laws':entry.after<entry.before?'An informative test':'No new evidence'}</h2><p>${!entry?'The opening rules out no mechanism in this family.':entry.after<entry.before?`This measurement reduced the compatible set from ${entry.before} to ${entry.after}.`:entry.before===1?'The law was already identified. This budget slot did not improve the forecast.':'Every remaining law predicted the same endpoint. This experiment spent budget without separating them.'}</p>
  ${entry?.excluded.length?`<details open><summary>Ruled out (${entry.excluded.length})</summary><ul>${entry.excluded.map(n=>'<li>'+n+'</li>').join('')}</ul></details>`:''}</section>`;
  for(const p of ['learned','random'])$('#'+p).onclick=guarded(()=>enterReplay(p,step));
  $('#prev').onclick=()=>{step--;render()};$('#next').onclick=()=>{step++;render()};if(score)$('#my').onclick=()=>{phase='reveal';history.replaceState({},'',urlFor());render()};
  $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(urlFor(true).href);notice('Replay link copied')}catch{prompt('Copy this replay link:',urlFor(true).href)}};
  newHook();animate(trial,base);history.replaceState({},'',urlFor(true))
}
async function enterComparison(n=0){
  [episodes.learned,episodes.fixed,knowledge]=await Promise.all([
    api('replay',{policy:'learned'}),api('replay',{policy:'fixed'}),knowledge||api('benchmark')]);
  policy='compare';mode='lab';phase='comparison';comparisonFilm='learned';
  step=Math.max(0,Math.min(episodes.fixed.steps.length,Math.trunc(Number(n)||0)));
  render();window.scrollTo(0,0)
}
function comparison(){
  const witness=Object.values(knowledge.examples).flatMap(e=>Object.values(e.branch)).find(w=>w.id===base.world);
  compare(base,episodes,step,comparisonFilm,witness,(n,film)=>{step=n;comparisonFilm=film;render()});
  history.replaceState({},'',urlFor(true))
}
function render(){
  const active=document.activeElement,wasInside=app.contains(active);
  stop();nav();
  if(mode==='bench')benchmark(knowledge,guarded(async(id,p)=>{await openWorld(id);if(p==='compare')await enterComparison();else await enterReplay('learned')}));
  else ({lab,forecast,reveal,replay,comparison})[phase]();
  if(wasInside){
    let target=active.id&&document.getElementById(active.id);
    if(active.dataset.see!==undefined)target=app.querySelector(`[data-see="${active.dataset.see}"]`);
    if(target?.disabled)target=active.id==='run'?$('#predict'):$('#prev:not(:disabled)')||$('#next:not(:disabled)');
    if(!target){target=app.querySelector('h1');target.tabIndex=-1}
    target.focus({preventScroll:true});
  }
}
$('#guide').onclick=()=>$('#manual').showModal();
$('#toTop').onclick=()=>window.scrollTo(0,0);
$('#navLab').onclick=()=>{if(base){mode='lab';render()}};
$('#navBench').onclick=guarded(async()=>{knowledge??=await api('benchmark');mode='bench';render()});
const q=new URLSearchParams(location.search);
try{await openWorld(q.get('world'));if(q.get('replay')==='compare')await enterComparison(q.get('step'));else if(['learned','random'].includes(q.get('replay')))await enterReplay(q.get('replay'),q.get('step'));else render()}
catch(e){app.innerHTML='<p class="note">This world link is unavailable. <a href="./">Open the laboratory</a></p>';notice(e.message)}
