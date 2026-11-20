export const fmt=(n,d=1)=>Number(n.toFixed(d)).toString();
export const xy=p=>'('+p.map(x=>fmt(x)).join(', ')+')';
export function field(trial){
  const p=trial.scene[0], [x,y]=trial.film.at(-1)[0];
  return [(x-p.x-2*p.vx)/2,(y-p.y-2*p.vy)/2];
}
export function scopeMarkup(title){return `<figure class="chamber"><figcaption><span>Motion chamber</span><span class="figure-state">${title}</span></figcaption><div class="scope"><div class="axes">x → east &nbsp; y ↓ south</div><canvas class="stage" aria-label="Two-second motion of probe A and references B and C"></canvas><div class="legend"><span>Probe A</span><span>Reference B</span><span>Reference C</span></div></div><div class="scopeFoot"><button class="iconbtn" id="play">Pause</button><input id="scrub" type="range" min="0" max="2" value="0" step=".01" aria-label="Simulation time"><output id="time">0.00 / 2 s</output></div></figure>`}
let raf=0;
export function stop(){cancelAnimationFrame(raf)}
export function animate(trial,base){
  stop();const canvas=document.querySelector('.stage'),ctx=canvas.getContext('2d');
  const scrub=document.querySelector('#scrub'),play=document.querySelector('#play');
  const colors=n=>getComputedStyle(canvas).getPropertyValue('--'+n).trim();
  const ink=colors('scope'),paper=colors('chamber'),grid=colors('grid'),hues=['a','b','c'].map(colors);
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,t=0,last=null;
  function button(){play.textContent=paused?'▶ Play':'Ⅱ Pause'}
  button();play.onclick=()=>{paused=!paused;button()};
  scrub.oninput=()=>{paused=true;t=Number(scrub.value);button()};
  function draw(now){
    const dt=Math.max(0,Math.min(.1,(now-(last??now))/1000));last=now;if(!paused)t=(t+dt)%2.55;
    const phase=Math.min(t,2),f=phase*10,i=Math.min(19,Math.floor(f)),z=f-i;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=devicePixelRatio||1;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(!w||!h){raf=requestAnimationFrame(draw);return}
    const scale=Math.min((w-30)/210,(h-20)/116), ox=w/2-105*scale,oy=h/2-68*scale;
    const X=x=>ox+x*scale,Y=y=>oy+y*scale;
    function line(x,y,u,v,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.stroke()}
    const xmin=Math.floor(-ox/scale/20)*20, xmax=(w-ox)/scale, ymin=Math.floor(-oy/scale/20)*20,ymax=(h-oy)/scale;
    ctx.font='10px ui-monospace, monospace';ctx.fillStyle=ink;
    for(let n=xmin;n<=xmax;n+=20){line(X(n),0,X(n),h,grid,.55);if(n>=0&&n%40===0)ctx.fillText(n,X(n)+4,h-4)}
    for(let n=ymin;n<=ymax;n+=20){line(0,Y(n),w,Y(n),grid,.55);if(n>=0&&n%40===0&&Y(n)>12)ctx.fillText(n,3,Y(n)-4)}
    ctx.globalAlpha=1;
    function path(frames,j,color,width,dashes=[]){ctx.beginPath();ctx.setLineDash(dashes);frames.forEach((row,k)=>{let [x,y]=row[j];ctx[k?'lineTo':'moveTo'](X(x),Y(y))});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([])}
    if(trial!==base)path(base.film,0,ink,1,[4,4]);
    for(let j=0;j<3;j++){
      let [x,y]=trial.film[i][j], [ex,ey]=trial.film[i+1][j];
      x=X(x+(ex-x)*z);y=Y(y+(ey-y)*z);
      let [x0,y0]=trial.film[0][j];x0=X(x0);y0=Y(y0);
      ctx.globalAlpha=.75;path(trial.film,j,hues[j],1.5,[2,4]);line(x0-4,y0,x0+4,y0,hues[j]);line(x0,y0-4,x0,y0+4,hues[j]);
      ctx.globalAlpha=1;path(trial.film.slice(0,i+1),j,hues[j],1.7);
      const radius=w<440?7:10;
      ctx.fillStyle=hues[j];ctx.save();ctx.translate(x,y);ctx.beginPath();
      if(j===0)ctx.arc(0,0,radius,0,2*Math.PI);
      else if(j===1){ctx.moveTo(0,-radius);ctx.lineTo(radius,0);ctx.lineTo(0,radius);ctx.lineTo(-radius,0);ctx.closePath()}
      else ctx.rect(-radius*.78,-radius*.78,radius*1.56,radius*1.56);
      ctx.fill();ctx.clip();for(let k=-radius*3;k<0;k+=3)line(k,-radius,k+2*radius,radius,paper,.85);ctx.restore();
      ctx.fillStyle=ink;ctx.font='600 12px ui-monospace, monospace';ctx.fillText('ABC'[j],x+radius+4,y-radius+1)
    }
    scrub.value=phase.toFixed(2);document.querySelector('#time').textContent=phase.toFixed(2)+' / 2 s';raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
}
