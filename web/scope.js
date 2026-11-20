export const fmt=(n,d=1)=>Number(n.toFixed(d)).toString();
export const xy=p=>'('+p.map(x=>fmt(x)).join(', ')+')';
export function field(trial){
  const p=trial.scene[0], [x,y]=trial.film.at(-1)[0];
  return [(x-p.x-2*p.vx)/2,(y-p.y-2*p.vy)/2];
}
export function scopeMarkup(title){
  return `<figure class="chamber"><figcaption><span class="instrument-name"><i aria-hidden="true">01</i> Motion chamber</span><span class="figure-state">${title}</span></figcaption>
  <div class="scope"><div class="axes"><span>x → east &nbsp; y ↓ south</span><span>Distance / units</span></div>
  <canvas class="stage" role="img" aria-label="Probe A and reference probes B and C in the motion chamber"></canvas>
  <div class="legend"><span class="probe a">A · Selected</span><span class="probe b">B</span><span class="probe c">C</span><span class="key opening" hidden>Opening path</span><span class="key endpoint">Endpoint</span></div></div>
  <div class="scopeFoot"><button class="iconbtn" id="play">Pause</button><input id="scrub" type="range" min="0" max="2" value="0" step=".01" aria-label="Simulation time"><output id="time">0.00 / 2 s</output></div></figure>`;
}
let cleanup;
export function stop(){cleanup?.();cleanup=null}
export function animate(trial,base){
  stop();
  const canvas=document.querySelector('.stage'),ctx=canvas.getContext('2d');
  const scrub=document.querySelector('#scrub'),play=document.querySelector('#play'),clock=document.querySelector('#time');
  const colors=getComputedStyle(canvas), color=n=>colors.getPropertyValue('--'+n).trim();
  const ink=color('scope'),paper=color('chamber'),grid=color('grid'),hues=['a','b','c'].map(color);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=motion.matches,t=paused?2:0,last=null,raf=0;
  const end=trial.film.at(-1), points=[...base.film,...trial.film].flat();
  const xmin=Math.min(24,...points.map(p=>p[0]-6)),xmax=Math.max(160,...points.map(p=>p[0]+6));
  const ymin=Math.min(22,...points.map(p=>p[1]-6)),ymax=Math.max(106,...points.map(p=>p[1]+6));
  canvas.setAttribute('aria-label','Measured endpoints: '+end.map((p,j)=>'ABC'[j]+' '+xy(p)).join('; '));
  document.querySelector('.opening').hidden=trial===base;
  function button(){play.textContent=paused?'▷ Play':'Ⅱ Pause';}
  function paint(){
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;
    if(!w||!h)return;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const scale=Math.min((w-62)/(xmax-xmin),(h-44)/(ymax-ymin));
    const X=x=>w/2+(x-(xmin+xmax)/2)*scale,Y=y=>h/2+(y-(ymin+ymax)/2)*scale;
    function line(x,y,u,v,c,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.strokeStyle=c;ctx.lineWidth=width;ctx.stroke()}
    ctx.font='10px "Geist Mono",monospace';ctx.fillStyle=ink;
    const range=(origin,extent)=>Array.from({length:Math.ceil(extent/scale/20)+1},(_,i)=>(Math.ceil(-origin/(20*scale))+i)*20);
    for(const n of range(X(0),w)){const x=X(n);line(x,0,x,h,grid,.8);if(n%40===0&&x>20&&x<w-19)ctx.fillText(n,x+3,h-6)}
    for(const n of range(Y(0),h)){const y=Y(n);line(0,y,w,y,grid,.8);if(n%40===0&&y>15&&y<h-10)ctx.fillText(n,4,y-4)}
    function path(points,c,width,dash=[]){
      ctx.beginPath();ctx.setLineDash(dash);
      points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](X(x),Y(y)));
      ctx.strokeStyle=c;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([]);
    }
    const phase=Math.min(t,2),f=phase*10,i=Math.min(19,Math.floor(f)),z=f-i;
    if(trial!==base)path(base.film.map(row=>row[0]),ink,1.7,[6,5]);
    for(const j of [1,2,0]){
      const frames=trial.film.map(row=>row[j]),[sx,sy]=frames[0];
      const pos=frames[i].map((v,k)=>v+(frames[i+1][k]-v)*z);
      const x=X(pos[0]),y=Y(pos[1]),r=j?4.5:6;
      path(frames,hues[j],j?1.2:1.6,[1.8,3]);
      path([...frames.slice(0,i+1),pos],hues[j],j?1.5:2.3);
      ctx.beginPath();ctx.arc(X(sx),Y(sy),2.5,0,Math.PI*2);ctx.fillStyle=paper;ctx.fill();ctx.strokeStyle=hues[j];ctx.stroke();
      if(!j){
        const ex=X(end[j][0]),ey=Y(end[j][1]);
        ctx.beginPath();ctx.arc(ex,ey,7.5,0,Math.PI*2);ctx.strokeStyle=hues[j];ctx.lineWidth=1.4;ctx.stroke();
        for(const sign of [-1,1]){line(ex+5*sign,ey,ex+11*sign,ey,hues[j]);line(ex,ey+5*sign,ex,ey+11*sign,hues[j])}
      }
      ctx.beginPath();if(!j)ctx.arc(x,y,r,0,Math.PI*2);
      else if(j===1){ctx.moveTo(x,y-r-1);ctx.lineTo(x+r+1,y);ctx.lineTo(x,y+r+1);ctx.lineTo(x-r-1,y);ctx.closePath()}
      else ctx.rect(x-r,y-r,2*r,2*r);
      ctx.fillStyle=j===2?paper:hues[j];ctx.fill();ctx.strokeStyle=hues[j];ctx.lineWidth=1.6;ctx.stroke();
      ctx.fillStyle=hues[j];ctx.font='600 12px "Geist Mono", monospace';ctx.fillText('ABC'[j],x+r+5,y-r-3);
    }
    scrub.value=phase.toFixed(2);clock.textContent=phase.toFixed(2)+' / 2 s';
  }
  function frame(now){t=(t+Math.max(0,Math.min(.1,(now-(last??now))/1000)))%2.6;last=now;paint();raf=requestAnimationFrame(frame)}
  function sync(){cancelAnimationFrame(raf);last=null;button();paint();if(!paused)raf=requestAnimationFrame(frame)}
  play.onclick=()=>{if(paused&&t>=2)t=0;paused=!paused;sync()};
  scrub.oninput=()=>{paused=true;t=Number(scrub.value);sync()};
  const reduce=()=>{if(motion.matches){paused=true;sync()}};
  const resizer=new ResizeObserver(paint);resizer.observe(canvas);motion.addEventListener('change',reduce);
  cleanup=()=>{cancelAnimationFrame(raf);resizer.disconnect();motion.removeEventListener('change',reduce)};
  sync();
}
