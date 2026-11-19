import {animate,stop,scopeMarkup,fmt,xy,field} from './scope.js';
import {benchmark} from './benchmark.js';
const $=s=>document.querySelector(s),app=$('#app');
const props={x:'Position x',y:'Position y',vx:'Velocity x',vy:'Velocity y',q:'Charge',mass:'Mass'};
const num=n=>String(n).padStart(2,'0');
let base,log=[],phase='lab',showing=0,mode='lab',knowledge,taskset,multipliers=[],score,episodes={},policy='learned',step=0,busy=false;
async function api(path,params={}){const r=await fetch('api/'+path+'?'+new URLSearchParams({...(base?{world:base.world}:{}),...params}));if(!r.ok)throw Error('The lab could not load that request. Check the world link or try again.');return r.json()}
function notice(msg){const n=$('#notice');n.textContent=msg;n.className='noticeOn';clearTimeout(notice.timer);notice.timer=setTimeout(()=>{n.className='';n.textContent=''},3600)}
function guarded(fn){return async(...args)=>{if(busy)return;busy=true;try{await fn(...args)}catch(e){notice(e.message)}finally{busy=false}}}
function hero(kicker,title,sub,button=''){return `<section class="hero"><div class="kicker">${kicker}</div><h1>${title}</h1><div class="herofoot"><p>${sub}</p>${button}</div></section>`}
function nav(){for(const [id,v] of [['navLab','lab'],['navBench','bench']])$('#'+id).classList.toggle('selected',v===mode)}
function urlFor(replay=false){const u=new URL(location.href);u.searchParams.set('world',base.world);for(const k of ['replay','step'])u.searchParams.delete(k);if(replay){u.searchParams.set('replay',policy);u.searchParams.set('step',step)}return u}
async function openWorld(id){
  const data=await api('open',id?{world:id}:{});
  base=data;log=[];phase='lab';showing=0;mode='lab';score=null;episodes={};taskset=null;step=0;multipliers=[];
  history.replaceState({},'',urlFor());nav()
}
function newBtn(){return '<button class="textbtn" id="newWorld">New world ↻</button>'}
function newHook(){$('#newWorld').onclick=guarded(async()=>{if(phase==='lab'&&log.length&&!confirm('Start another world and discard your notebook?'))return;await openWorld('new');render()})}
function used(){return log.map(r=>r.action)}
function meter(n){return `<div class="space"><span class="tiny">Experiment budget</span><b class="value">${n} / ${base.budget}</b></div><div class="meter">${Array.from({length:base.budget},(_,i)=>`<i class="${i<n?'used':''}"></i>`).join('')}</div>`}
function journal(){
  return `<section class="journal"><div class="space"><h2>Observation log</h2><span class="tiny">Probe A · measurements</span></div>${[base,...log].map((r,i)=>`<div class="journalrow"><span class="idx">${num(i)}</span><b>${i?base.actions[r.action][0]:'Opening scene'}</b><span class="value">${xy(r.film.at(-1)[0])}<br><small class="muted">field ${xy(field(r))} u/s²</small></span><button class="textbtn" data-see="${i}" aria-label="View observation ${i}">${i===showing?'Viewing':'View'}</button></div>`).join('')}</section>`
}
function apparatus(trial){return `<details class="panel card block"><summary>Release conditions · all probes</summary><div class="tablewrap"><table><thead><tr><th>Probe</th><th>Position</th><th>Velocity</th><th>Mass</th><th>Charge</th></tr></thead><tbody>${trial.scene.map((p,i)=>`<tr><th>${'ABC'[i]}</th><td>${xy([p.x,p.y])}</td><td>${xy([p.vx,p.vy])}</td><td>${p.mass}</td><td>${p.q}</td></tr>`).join('')}</tbody></table></div></details>`}
function lab(){
  const trial=showing?log[showing-1]:base, spent=log.length, end=spent===base.budget;
  const avail=base.actions.map((a,i)=>[a,i]).filter(([,i])=>!used().includes(i));
  app.innerHTML=hero('Active inference laboratory / Study 001','The Unseen Worlds <i>Experiment</i>','Can you uncover a hidden law in five experiments? Observe the motion, change one condition, then predict what happens next.',newBtn())+
    `<div class="workbench"><div>${scopeMarkup(showing?'Trial '+num(showing):'Opening scene')}${journal()}${apparatus(trial)}</div>
    <aside class="panel controls"><div class="kicker">Operator console</div><h2>Design an experiment</h2><p class="sub">Change one release condition on probe A. Every trial starts from the same scene.</p><div class="line"></div>${meter(spent)}
    <label class="ctrlLabel" for="action">Intervention</label><select id="action" ${end?'disabled':''}>${avail.map(([[l],i])=>`<option value="${i}">${l}</option>`).join('')}</select>
    <div class="actionRead" id="actionRead"></div><button class="orange full" id="run" ${end?'disabled':''}>${end?'Budget spent':'Run experiment'}<span>→</span></button>
    <button class="outline full" id="predict">Make forecasts<span>↗</span></button>
    <div class="under">${end?'Forecast the unseen setups to reveal the law.':'You can forecast early. No experiment is required.'}</div></aside></div>`;
  const read=()=>{const [,k,v]=base.actions[Number($('#action').value)];$('#actionRead').innerHTML=`<span>${props[k]}</span><b>${base.scene[0][k]} → ${v}</b>`};read();$('#action').onchange=read;
  $('#run').onclick=guarded(async()=>{const a=Number($('#action').value),trial=await api('run',{action:a,history:used().join(',')});log.push({...trial,action:a});showing=log.length;render()});
  $('#predict').onclick=guarded(async()=>{taskset=await api('tasks');if(!multipliers.length)multipliers=taskset.tasks.map(()=>1);phase='forecast';render();window.scrollTo(0,0)});
  document.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{showing=Number(b.dataset.see);render()});newHook();animate(trial,base)
}
function point(p,k){return [p.x+2*p.vx+2*taskset.opening_field[0]*k,p.y+2*p.vy+2*taskset.opening_field[1]*k]}
function forecast(){
  app.innerHTML=hero('Blind assessment / Four unseen setups','Submit your <i>forecasts</i>','Predict the endpoint after two seconds. Set how strongly the opening field acts in each new release; a negative value reverses it.','<button id="back" class="textbtn">← Back to chamber</button>')+
  `<p class="note">Measured opening acceleration: <b class="mono">${xy(taskset.opening_field)} units/s²</b>. A multiplier of 1 keeps that field; 0 means the probe coasts at its starting velocity.</p><div class="grid2">${taskset.tasks.map((p,i)=>`<section class="panel forecast-panel"><div class="tiny tasknum">Unseen setup / ${num(i+1)}</div><h2>Forecast ${num(i+1)}</h2><div class="settings">${Object.entries(p).map(([k,v])=>`<span><small>${props[k]}</small>${v}</span>`).join('')}</div><label for="m${i}" class="row"><b>Field multiplier</b><output id="v${i}"></output></label><input type="range" min="-2.4" max="1.5" step=".05" id="m${i}" value="${multipliers[i]}"><div class="space small"><span>Predicted endpoint</span><output class="mono" id="p${i}"></output></div></section>`).join('')}</div><div class="submitrow"><button id="submit" class="solid">Submit forecasts & reveal →</button></div>`;
  taskset.tasks.forEach((p,i)=>{const refresh=()=>{$('#v'+i).textContent=fmt(multipliers[i],2)+'×';$('#p'+i).textContent=xy(point(p,multipliers[i]))};$('#m'+i).oninput=e=>{multipliers[i]=Number(e.target.value);refresh()};refresh()});
  $('#back').onclick=()=>{phase='lab';render()};
  $('#submit').onclick=guarded(async()=>{score=await api('score',{history:used().join(','),points:JSON.stringify(taskset.tasks.map((p,i)=>point(p,multipliers[i])))});phase='reveal';render();window.scrollTo(0,0)})
}
function reveal(){
  const a=score.witness;
  app.innerHTML=hero('World dossier / Rule revealed','Inside the <i>'+score.family.toLowerCase()+' world</i>',score.law.name,newBtn())+
  `<div class="workbench"><section class="panel card"><div class="kicker">Simulator ground truth</div><h2>${score.law.name}</h2><p>${score.law.explanation}</p><div class="line"></div><h3>Why the opening hid the difference</h3><p>All probes started with positive charge, unit mass, and no active switches. “${score.twin}” produces exactly the same opening film.</p><p class="note"><b>${used().includes(a)?'Your separating test':'A test that would separate them'}: ${base.actions[a][0]}.</b> Probe A lands at ${xy(score.actual)} here, versus ${xy(score.other)} in the twin.</p></section>
  <aside class="panel controls"><div class="kicker">Your forecast error</div><div class="largeNum">${fmt(score.error,2)} <small>units</small></div><p class="sub">Mean endpoint distance across four forecasts. Lower is better.</p><div class="line"></div><p class="small">${log.length} experiments used · ${score.remaining} compatible ${score.remaining===1?'law':'laws'} after your evidence.</p><br><button class="orange full" id="watch">Replay the trained chooser →</button></aside></div>
  <section class="panel card block"><h2>Endpoint check</h2><div class="tablewrap"><table><thead><tr><th>Setup</th><th>Your forecast</th><th>Simulator endpoint</th><th>Distance</th></tr></thead><tbody>${score.truth.map((pt,i)=>{let p=point(taskset.tasks[i],multipliers[i]);return `<tr><th>${num(i+1)}</th><td>${xy(p)}</td><td>${xy(pt)}</td><td>${fmt(Math.hypot(pt[0]-p[0],pt[1]-p[1]),2)}</td></tr>`}).join('')}</tbody></table></div></section>`;
  newHook();$('#watch').onclick=guarded(()=>enterReplay('learned'))
}
async function enterReplay(p,n=0){policy=p;if(!episodes[p])episodes[p]=await api('replay',{policy:p});step=Math.max(0,Math.min(base.budget,Math.trunc(Number(n)||0)));phase='replay';mode='lab';render();window.scrollTo(0,0)}
function replay(){
  const rec=episodes[policy],entry=rec.steps[step-1],trial=entry?rec.trials[step-1]:base;
  const btn=(s,l)=>`<button class="outline ${policy===s?'selected':''}" id="${s}" aria-pressed="${policy===s}">${l}</button>`;
  app.innerHTML=hero('Recorded benchmark episode / '+rec.family,'The experiment <i>replay</i>','Step through decisions on this exact world. Rule eliminations are evaluator deductions, not explanations generated by the chooser.',newBtn())+
  `<div class="tabs">${btn('learned','Trained chooser')}${btn('random','Random · seed 0')}<button class="textbtn" id="share">Copy replay link ↗</button>${score?'<button class="textbtn" id="my">Your results</button>':''}</div><div class="workbench block"><div>${scopeMarkup(step?'Trial '+num(step):'Opening scene')}<section class="panel card block"><div class="kicker">Evaluator’s notebook</div><h2>${!entry?'Eight plausible laws':entry.after<entry.before?'An informative test':'No new evidence'}</h2><p>${!entry?'The opening rules out no mechanism in this family.':entry.after<entry.before?`This measurement reduced the compatible set from ${entry.before} to ${entry.after}.`:entry.before===1?'The law was already identified. This budget slot did not improve the forecast.':'Every remaining law predicted the same endpoint. This experiment spent budget without separating them.'}</p>
  ${entry?.excluded.length?`<details open><summary>Ruled out (${entry.excluded.length})</summary><ul>${entry.excluded.map(n=>'<li>'+n+'</li>').join('')}</ul></details>`:''}</section></div>
  <aside class="panel controls"><div class="kicker">${policy==='learned'?'Trained policy':'Random policy'} / Playback</div><h2>${entry?base.actions[entry.action][0]:'Passive opening'}</h2><p class="sub">${entry?props[base.actions[entry.action][1]]+' on A: '+base.scene[0][base.actions[entry.action][1]]+' → '+base.actions[entry.action][2]+'.':'No experiments used yet.'}</p><div class="line"></div>${meter(step)}
  <div class="actionRead"><span>Observed endpoint</span><b>${xy(trial.film.at(-1)[0])}</b></div><div class="actionRead"><span>Measured field</span><b>${xy(field(trial))}</b></div>
  <div class="tiny">Shared predictor · forecast error</div><div class="largeNum">${fmt(rec.errors[step],2)} <small>units</small></div><div class="line"></div>
  <div class="replaynav"><button class="outline" id="prev" ${step===0?'disabled':''}>← Back</button><button class="solid" id="next" ${step===base.budget?'disabled':''}>Next step →</button></div></aside></div>`;
  for(const p of ['learned','random'])$('#'+p).onclick=guarded(()=>enterReplay(p,step));
  $('#prev').onclick=()=>{step--;render()};$('#next').onclick=()=>{step++;render()};if(score)$('#my').onclick=()=>{phase='reveal';history.replaceState({},'',urlFor());render()};
  $('#share').onclick=async()=>{try{await navigator.clipboard.writeText(urlFor(true).href);notice('Replay link copied')}catch{prompt('Copy this replay link:',urlFor(true).href)}};
  newHook();animate(trial,base);history.replaceState({},'',urlFor(true))
}
function render(){stop();nav();if(mode==='bench')return benchmark(knowledge,guarded(async id=>{await openWorld(id);await enterReplay('learned')}));({lab,forecast,reveal,replay})[phase]()}
$('#guide').onclick=()=>$('#manual').showModal();
$('#navLab').onclick=()=>{if(base){mode='lab';render()}};
$('#navBench').onclick=guarded(async()=>{knowledge??=await api('benchmark');mode='bench';render()});
const q=new URLSearchParams(location.search);
try{await openWorld(q.get('world'));if(['learned','random'].includes(q.get('replay')))await enterReplay(q.get('replay'),q.get('step'));else render()}
catch(e){app.innerHTML='<p class="note">This world link is unavailable. <a href="./">Open the laboratory</a></p>';notice(e.message)}
