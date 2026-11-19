const $=s=>document.querySelector(s);
const api=async(path,params={})=>(await fetch('/api/'+path+'?'+new URLSearchParams(params))).json();
const base=await api('open'); let frames=base.film, used=0;
const ctx=$('canvas').getContext('2d');
function tick(t){ctx.clearRect(0,0,500,300);for(const [x,y] of frames[Math.floor(t/100)%21]){ctx.beginPath();ctx.arc(x*2,y*2,6,0,7);ctx.fill()}requestAnimationFrame(tick)}requestAnimationFrame(tick);
base.actions.forEach(([label],i)=>$('#actions').add(new Option(label,i)));
$('#run').onclick=async()=>{frames=(await api('run',{action:$('#actions').value})).film;$('#budget').textContent=++used+' / '+base.budget;if(used>=base.budget)$('#run').disabled=true};
$('#predict').onclick=async()=>{const tasks=await api('tasks');$('#tasks').replaceChildren();tasks.forEach(p=>{let label=document.createElement('label');label.textContent=JSON.stringify(p)+' → x,y ';let input=document.createElement('input');input.required=true;label.append(input);$('#tasks').append(label,document.createElement('br'))});let b=document.createElement('button');b.textContent='Submit forecasts';$('#tasks').append(b)};
$('#tasks').onsubmit=async e=>{e.preventDefault();let points=[...document.querySelectorAll('input')].map(i=>i.value.split(',').map(Number));let result=await api('score',{points:JSON.stringify(points)});$('output').textContent=result.law+' · error '+result.error};
