import {animate,scopeMarkup,fmt,xy} from './scope.js';

const names={learned:'Trained chooser',fixed:'Fixed plan'};
const past={
  'Reverse charge':'reversed the charge','Increase mass':'tried a heavier mass','Reduce mass':'tried a lighter mass',
  'Move east':'moved the probe east','Move north':'moved the probe north','Launch east':'launched the probe east',
  'Launch west':'launched the probe west','Launch south':'launched the probe south'
};
export function compare(base,episodes,step,watch,witness,onChange){
  const policies=Object.keys(names),action=i=>base.actions[i][0],total=episodes.fixed.steps.length;
  const trial=step?episodes[watch].trials[step-1]:base;
  const row=(title,fn)=>`<tr><th scope="row">${title}</th>${policies.map(p=>`<td>${fn(episodes[p],episodes[p].steps[step-1])}</td>`).join('')}</tr>`;
  const tested=policies.map(p=>step?action(episodes[p].steps[step-1].action):'');
  const differs=tested[0]!==tested[1];
  const evidence=witness&&step>=1?`<details class="evidence"><summary>Matched-world evidence</summary><p>After “${action(witness.first)}”, A landed at ${xy(witness.endpoint)} here. The chooser followed with “${action(witness.next)}”. With the same opening but a landing at ${xy(witness.alternate_endpoint)}, it chose “${action(witness.alternate_next)}”.</p>
    <a href="?world=${witness.alternate}&replay=learned&step=2">Inspect that world ↗</a></details>`:'';
  const sentence=!step?'Neither policy has run a test yet.':differs?`The chooser ${past[tested[0]]}. The fixed plan ${past[tested[1]]}.`:`Both policies ${past[tested[0]]}.`;
  document.querySelector('#app').innerHTML=`<section class="hero"><div><div class="eyebrow">Paired replay / ${episodes.fixed.family}</div><h1>Fixed vs. adaptive</h1><p>Two policies, one world. Step through their tests together and compare what each observation reveals.</p></div><span class="world-id">World / ${base.world}</span></section>
    <div class="workbench paired"><div>${scopeMarkup(step?names[watch]+' · '+step+'/'+total:'Shared opening')}
    <div class="playback-choice"><label for="watch">Chamber playback</label><select id="watch">${policies.map(p=>`<option value="${p}" ${watch===p?'selected':''}>${names[p]}</option>`).join('')}</select></div></div>
    <section class="controls comparison-data"><div class="step-title"><h2>Test ${step} of ${total}</h2><span class="step-track" aria-hidden="true">${Array.from({length:total},(_,i)=>`<i class="${i<step?'on':''}"></i>`).join('')}</span></div>
    <table><thead><tr><th><span class="sr">Measurement</span></th><th scope="col">Trained chooser</th><th scope="col">Fixed plan</th></tr></thead><tbody>
      ${row('Test',(_,e)=>e?action(e.action):'Opening')}
      ${row('Endpoint',(_,e)=>xy(e?e.endpoint:base.film.at(-1)[0]))}
      ${row('Rules left',rec=>`<b>${rec.counts[step]}</b>`)}
      ${row('Mean error',rec=>fmt(rec.errors[step],4)+' u')}</tbody></table>
    <div class="fork-note"><div class="kicker">${differs?'Different tests':step?'Same test':'Before testing'}</div><p>${sentence}</p></div>
    <div class="replaynav"><button class="outline" id="prev" ${!step?'disabled':''}>← Back</button><button class="solid" id="next" ${step===total?'disabled':''}>Next test →</button></div>${evidence}</section></div>
    <section class="block survivors"><div class="section-head"><h2>Rules still in play</h2><span class="tiny">After ${step} of ${total} tests</span></div>${!step?'<p class="sub">The opening fits all eight rules in this family.</p>':
      `<div class="survivor-grid">${policies.map(p=>`<section><h3>${names[p]} <span class="rule-count">${episodes[p].counts[step]}</span></h3><ul>${episodes[p].steps[step-1].remaining.map(r=>`<li>${r}</li>`).join('')}</ul></section>`).join('')}</div>`}</section>`;
  document.querySelector('#watch').onchange=e=>onChange(step,e.target.value);
  document.querySelector('#next').onclick=()=>onChange(step+1,watch);
  document.querySelector('#prev').onclick=()=>onChange(step-1,watch);
  animate(trial,base);
}
