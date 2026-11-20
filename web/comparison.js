import {animate,scopeMarkup,fmt,xy} from './scope.js';

export function compare(base,episodes,step,watch,witness,onChange) {
  const names={learned:'Trained chooser',fixed:'Frozen triple'};
  const action=i=>base.actions[i][0], total=episodes.fixed.steps.length;
  const panel=p=>{
    const rec=episodes[p], item=rec.steps[step-1];
    return `<section class="card"><div class="kicker">${p==='fixed'?'Selected on train':'Adaptive policy'}</div><h2>${names[p]}</h2>
      <p>${p==='fixed'?'Committed plan: '+rec.steps.map(s=>action(s.action)).join(' → '):'Chooses one test at a time using observed motion.'}</p>
      <div class="actionRead"><span>Experiment</span><b>${item?action(item.action):'Opening only'}</b></div>
      <div class="actionRead"><span>Measured endpoint</span><b>${xy(item?item.endpoint:base.film.at(-1)[0])}</b></div>
      <div class="actionRead"><span>Mean forecast error</span><b>${fmt(rec.errors[step],4)} units</b></div>
      <h3>${rec.counts[step]} compatible ${rec.counts[step]===1?'rule':'rules'}</h3>
      ${item?`<ul>${item.remaining.map(n=>'<li>'+n+'</li>').join('')}</ul>`:'<p>The openings of all eight mechanisms are identical.</p>'}</section>`;
  };
  const fork=witness&&step>=1?`<section class="note"><strong>Why the second test changed</strong><p>After “${action(witness.first)}”, probe A landed at ${xy(witness.endpoint)} here; the chooser followed with “${action(witness.next)}”. In a world with the identical opening it landed at ${xy(witness.alternate_endpoint)}, and the same checkpoint chose “${action(witness.alternate_next)}”.</p><a href="?world=${witness.alternate}&replay=learned&step=2">Inspect the alternate observation →</a></section>`:'';
  const trial=step?episodes[watch].trials[step-1]:base;
  document.querySelector('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">${episodes.fixed.family} · Paired replay</div><h1>Plan or adapt?</h1></div><div class="intro"><p>Same world, three tests, one forecast engine. Step both policies together. Switch the chamber to watch either trajectory.</p></div></section>
  <div class="workbench">${scopeMarkup(step?names[watch]+' · '+step+'/3':'Shared opening')}
  <aside class="controls"><h2>Test ${step} of ${total}</h2><label class="ctrlLabel" for="watch">Chamber playback</label><select id="watch">${Object.entries(names).map(([p,n])=>`<option value="${p}" ${p===watch?'selected':''}>${n}</option>`).join('')}</select>
  <div class="line"></div><div class="replaynav"><button class="outline" id="prev" ${step===0?'disabled':''}>← Back</button><button class="solid" id="next" ${step===total?'disabled':''}>Next test →</button></div>${fork}</aside></div>
  <div class="grid2 block">${panel('learned')}${panel('fixed')}</div>`;
  document.querySelector('#watch').onchange=e=>onChange(step,e.target.value);
  document.querySelector('#next').onclick=()=>onChange(step+1,watch);
  document.querySelector('#prev').onclick=()=>onChange(step-1,watch);
  animate(trial,base);
}
