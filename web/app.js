import {animate,stop,scopeMarkup,fmt,xy,field} from './scope.js';
import {benchmark} from './benchmark.js';
import {compare} from './comparison.js';
const $=s=>document.querySelector(s),app=$('#app');
const props={x:'Position x',y:'Position y',vx:'Velocity x',vy:'Velocity y',q:'Charge',mass:'Mass'};
const num=n=>String(n).padStart(2,'0');
let base,log=[],phase='lab',showing=0,mode='lab',knowledge,taskset,multipliers=[],score,episodes={},policy='learned',step=0,busy=false;
let comparisonFilm='learned';
async function api(path,params={}){const r=await fetch('api/'+path+'?'+new URLSearchParams({...(base?{world:base.world}:{}),...params}));if(!r.ok)throw Error('The lab could not load that request. Check the world link or try again.');return r.json()}
function notice(msg){const n=$('#notice');n.textContent=msg;n.className='noticeOn';clearTimeout(notice.timer);notice.timer=setTimeout(()=>{n.className='';n.textContent=''},3600)}
function guarded(fn){return async(...args)=>{if(busy)return;busy=true;try{await fn(...args)}catch(e){notice(e.message)}finally{busy=false}}}
function hero(section,title,sub,button=''){return `<section class="hero"><div><div class="eyebrow">${section}</div><h1>${title}</h1></div><div class="intro"><p>${sub}</p>${button}</div></section>`}
function nav(){for(const [id,v] of [['navLab','lab'],['navBench','bench']])$('#'+id).classList.toggle('selected',v===mode)}
function urlFor(replay=false){const u=new URL(location.href);u.searchParams.set('world',base.world);for(const k of ['replay','step'])u.searchParams.delete(k);if(replay){u.searchParams.set('replay',policy);u.searchParams.set('step',step)}return u}
async function openWorld(id){
  const data=await api('open',id?{world:id}:{});
  base=data;log=[];phase='lab';showing=0;mode='lab';score=null;episodes={};taskset=null;step=0;multipliers=[];
  history.replaceState({},'',urlFor());nav()
}
function newBtn(){return '<button class="textbtn" id="newWorld">Try a different world ↗</button>'}
function newHook(){$('#newWorld').onclick=guarded(async()=>{if(phase==='lab'&&log.length&&!confirm('Start another world and discard your notebook?'))return;await openWorld('new');render()})}
function used(){return log.map(r=>r.action)}
function meter(n){return `<div class="budget"><span>Experiments used</span><span class="meter" aria-hidden="true">${Array.from({length:base.budget},(_,i)=>`<i class="${i<n?'used':''}"></i>`).join('')}</span><span class="value">${n}/${base.budget}</span></div>`}
function journal(){
  return `<section class="journal"><div class="space"><h2>Observation log</h2><span class="tiny">Probe A · measurements</span></div>${[base,...log].map((r,i)=>`<div class="journalrow"><span class="idx">${num(i)}</span><b>${i?base.actions[r.action][0]:'Opening scene'}</b><span class="value">${xy(r.film.at(-1)[0])}<br><small class="muted">field ${xy(field(r))} u/s²</small></span><button class="textbtn" data-see="${i}" aria-label="View observation ${i}">${i===showing?'Viewing':'View'}</button></div>`).join('')}</section>`
}
function apparatus(trial){return `<details class="panel card block"><summary>Release conditions · all probes</summary><div class="tablewrap"><table><thead><tr><th>Probe</th><th>Position</th><th>Velocity</th><th>Mass</th><th>Charge</th></tr></thead><tbody>${trial.scene.map((p,i)=>`<tr><th>${'ABC'[i]}</th><td>${xy([p.x,p.y])}</td><td>${xy([p.vx,p.vy])}</td><td>${p.mass}</td><td>${p.q}</td></tr>`).join('')}</tbody></table></div></details>`}
function lab(){
  const trial=showing?log[showing-1]:base, spent=log.length, end=spent===base.budget;
  const avail=base.actions.map((a,i)=>[a,i]).filter(([,i])=>!used().includes(i));
  app.innerHTML=hero('Interactive research','Find the hidden law.','Three objects move under the same invisible force. Change their starting conditions, then see if you—or a small model—can predict where they land.',newBtn())+
    `<div class="workbench instrument">${scopeMarkup(showing?'Trial '+num(showing):'Opening scene')}
    <aside class="controls intervention"><h2>Your experiment</h2><p class="sub">Change one property of probe A. The other two probes stay untouched.</p>
    <label class="ctrlLabel" for="action">Starting condition</label><select id="action" ${end?'disabled':''}>${avail.map(([[l],i])=>`<option value="${i}">${l}</option>`).join('')}</select>
    <div class="actionRead" id="actionRead"></div><button class="solid full" id="run" ${end?'disabled':''}>${end?'No tests remaining':'Run experiment'}<span aria-hidden="true">→</span></button>
    ${meter(spent)}<div class="forecastLink"><p>${end?'All five tests are recorded.':'Think you know the rule?'}</p><button class="textbtn" id="predict">Make forecasts →</button></div></aside></div>
    <div class="workbench notebook">${journal()}<div>${apparatus(trial)}</div></div>`;
  const read=()=>{const [,k,v]=base.actions[Number($('#action').value)];$('#actionRead').innerHTML=`<span>${props[k]}</span><b>${base.scene[0][k]} → ${v}</b>`};read();$('#action').onchange=read;
  $('#run').onclick=guarded(async()=>{const a=Number($('#action').value),trial=await api('run',{action:a,history:used().join(',')});log.push({...trial,action:a});showing=log.length;render()});
  $('#predict').onclick=guarded(async()=>{taskset=await api('tasks');if(!multipliers.length)multipliers=taskset.tasks.map(()=>1);phase='forecast';render();window.scrollTo(0,0)});
  document.querySelectorAll('[data-see]').forEach(b=>b.onclick=()=>{showing=Number(b.dataset.see);render()});newHook();animate(trial,base)
}
function point(p,k){return [p.x+2*p.vx+2*taskset.opening_field[0]*k,p.y+2*p.vy+2*taskset.opening_field[1]*k]}
function predictedTrack(p,k){
  const at=(t,v)=>[p.vx*t+.5*taskset.opening_field[0]*v*t*t,p.vy*t+.5*taskset.opening_field[1]*v*t*t];
  const times=Array.from({length:21},(_,i)=>i/10);
  const bounds=times.flatMap(t=>[-2.4,1.5].map(v=>at(t,v)));
  const xs=bounds.map(q=>q[0]),ys=bounds.map(q=>q[1]);
  const mid=a=>(Math.max(...a)+Math.min(...a))/2;
  const scale=Math.min(280/Math.max(1,Math.max(...xs)-Math.min(...xs)),70/Math.max(1,Math.max(...ys)-Math.min(...ys)));
  const path=times.map(t=>at(t,k)).map(([x,y])=>[160+(x-mid(xs))*scale,50+(y-mid(ys))*scale]);
  return `<path d="M${path.map(q=>q.join(' ')).join(' L')}" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${path[0][0]}" cy="${path[0][1]}" r="4" fill="var(--faint)" stroke="var(--scope)"/><circle cx="${path.at(-1)[0]}" cy="${path.at(-1)[1]}" r="5" fill="var(--accent)"/>`;
}
function forecast(){
  app.innerHTML=hero('Your predictions','Where will they land?','These four launches are new. Adjust the acceleration in each one to draw your predicted path. The filled dot is your endpoint after two seconds.','<button id="back" class="textbtn">← Back to chamber</button>')+
  `<p class="note">Measured opening acceleration: <b class="mono">${xy(taskset.opening_field)} units/s²</b>. A multiplier of 1 keeps that field; 0 means the probe coasts at its starting velocity.</p><div class="grid2">${taskset.tasks.map((p,i)=>`<section class="panel forecast-panel"><div class="tiny tasknum">Unseen setup / ${num(i+1)}</div><h2>Forecast ${num(i+1)}</h2><div class="settings">${Object.entries(p).map(([k,v])=>`<span><small>${props[k]}</small>${v}</span>`).join('')}</div><label for="m${i}" class="row"><b>Field multiplier</b><output id="v${i}"></output></label><input type="range" min="-2.4" max="1.5" step=".05" id="m${i}" value="${multipliers[i]}"><div class="space small"><span>Predicted endpoint</span><output class="mono" id="p${i}"></output></div></section>`).join('')}</div><div class="submitrow"><button id="submit" class="solid">Submit forecasts & reveal →</button></div>`;
  taskset.tasks.forEach((p,i)=>{
    const plot=document.createElementNS('http://www.w3.org/2000/svg','svg');
    plot.setAttribute('class','forecast-plot');plot.setAttribute('viewBox','0 0 320 100');plot.setAttribute('aria-hidden','true');
    $('#m'+i).closest('section').querySelector('.settings').after(plot);
    const refresh=()=>{$('#v'+i).textContent=fmt(multipliers[i],2)+'×';$('#p'+i).textContent=xy(point(p,multipliers[i]));plot.innerHTML=predictedTrack(p,multipliers[i])};
    $('#m'+i).oninput=e=>{multipliers[i]=Number(e.target.value);refresh()};refresh()
  });
  $('#back').onclick=()=>{phase='lab';render()};
  $('#submit').onclick=guarded(async()=>{score=await api('score',{history:used().join(','),points:JSON.stringify(taskset.tasks.map((p,i)=>point(p,multipliers[i])))});phase='reveal';render();window.scrollTo(0,0)})
}
function reveal(){
  const a=score.witness;
  app.innerHTML=hero('The reveal','Inside the '+score.family.toLowerCase()+' world.','Your forecasts are locked in. Compare the real rule with one that looked identical in the opening.',newBtn())+
  `<div class="workbench"><section class="panel card"><div class="kicker">Simulator ground truth</div><h2>${score.law.name}</h2><p>${score.law.explanation}</p><div class="line"></div><h3>Why the opening hid the difference</h3><p>All probes started with positive charge, unit mass, and no active switches. “${score.twin}” produces exactly the same opening film.</p><p class="note"><b>${used().includes(a)?'Your separating test':'A test that would separate them'}: ${base.actions[a][0]}.</b> Probe A lands at ${xy(score.actual)} here, versus ${xy(score.other)} in the twin.</p></section>
  <aside class="panel controls"><div class="kicker">Your forecast error</div><div class="largeNum">${fmt(score.error,2)} <small>units</small></div><p class="sub">Mean endpoint distance across four forecasts. Lower is better.</p><div class="line"></div><p class="small">${log.length} experiments used · ${score.remaining} compatible ${score.remaining===1?'law':'laws'} after your evidence.</p><br><button class="orange full" id="watch">Replay the trained chooser →</button></aside></div>
  <section class="panel card block"><h2>Endpoint check</h2><div class="tablewrap"><table><thead><tr><th>Setup</th><th>Your forecast</th><th>Simulator endpoint</th><th>Distance</th></tr></thead><tbody>${score.truth.map((pt,i)=>{let p=point(taskset.tasks[i],multipliers[i]);return `<tr><th>${num(i+1)}</th><td>${xy(p)}</td><td>${xy(pt)}</td><td>${fmt(Math.hypot(pt[0]-p[0],pt[1]-p[1]),2)}</td></tr>`}).join('')}</tbody></table></div></section>`;
  newHook();$('#watch').onclick=guarded(()=>enterReplay('learned'))
}
async function enterReplay(p,n=0){policy=p;if(!episodes[p])episodes[p]=await api('replay',{policy:p});step=Math.max(0,Math.min(base.budget,Math.trunc(Number(n)||0)));phase='replay';mode='lab';render();window.scrollTo(0,0)}
function replay(){
  const rec=episodes[policy],entry=rec.steps[step-1],trial=entry?rec.trials[step-1]:base;
  const btn=(s,l)=>`<button class="outline ${policy===s?'selected':''}" id="${s}" aria-pressed="${policy===s}">${l}</button>`;
  app.innerHTML=hero(rec.family+' world · Recorded episode',policy==='learned'?'The model’s run.':'A random run.','Replay the same world one decision at a time. The evaluator shows which rules are inconsistent with each measurement.',newBtn())+
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
function render(){stop();nav();if(mode==='bench')return benchmark(knowledge,guarded(async (id,p)=>{await openWorld(id);if(p==='compare')await enterComparison();else await enterReplay('learned')}));({lab,forecast,reveal,replay,comparison})[phase]()}
$('#guide').onclick=()=>$('#manual').showModal();
$('#toTop').onclick=()=>window.scrollTo(0,0);
$('#navLab').onclick=()=>{if(base){mode='lab';render()}};
$('#navBench').onclick=guarded(async()=>{knowledge??=await api('benchmark');mode='bench';render()});
const q=new URLSearchParams(location.search);
try{await openWorld(q.get('world'));if(q.get('replay')==='compare')await enterComparison(q.get('step'));else if(['learned','random'].includes(q.get('replay')))await enterReplay(q.get('replay'),q.get('step'));else render()}
catch(e){app.innerHTML='<p class="note">This world link is unavailable. <a href="./">Open the laboratory</a></p>';notice(e.message)}
