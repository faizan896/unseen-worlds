export const fmt=(n,d=1)=>Number(n.toFixed(d)).toString();
export const xy=p=>'('+p.map(x=>fmt(x)).join(', ')+')';
export function field(trial){
  const p=trial.scene[0], [x,y]=trial.film.at(-1)[0];
  return [(x-p.x-2*p.vx)/2,(y-p.y-2*p.vy)/2];
}
export function scopeMarkup(title){return `<section class="panel"><div class="panelhead"><h3 class="sectiontitle"><span class="scopeIcon"></span>Observation chamber</h3><span class="pill">${title}</span></div><div class="scope"><div class="dial"><span>Fig. 01 / Motion plane</span><span>+X East · +Y South</span></div><canvas class="stage" aria-label="Two-second motion of three colored probes"></canvas><div class="legend"><span>A · Test probe</span><span>B · Reference</span><span>C · Reference</span></div></div><div class="scopeFoot"><button class="iconbtn" id="play">Pause</button><input id="scrub" type="range" min="0" max="2" value="0" step=".01" aria-label="Simulation time"><output id="time">0.00 / 2 s</output></div></section>`}
let raf=0;
export function stop(){cancelAnimationFrame(raf)}
export function animate(trial,base){
  stop();const canvas=document.querySelector('.stage'),ctx=canvas.getContext('2d');
  const scrub=document.querySelector('#scrub'),play=document.querySelector('#play');
  const colors=n=>getComputedStyle(canvas).getPropertyValue('--'+n).trim();
  const ink=colors('scope'),grid=colors('grid'),hues=['a','b','c'].map(colors);
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
    const scale=Math.min((w-35)/215,(h-20)/125), ox=(w-215*scale)/2+5,oy=(h-125*scale)/2+6;
    const X=x=>ox+x*scale,Y=y=>oy+y*scale;
    function line(x,y,u,v,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);ctx.stroke()}
    const xmin=Math.floor(-ox/scale/10)*10, xmax=(w-ox)/scale, ymin=Math.floor(-oy/scale/10)*10,ymax=(h-oy)/scale;
    ctx.font='9px monospace';ctx.fillStyle=ink;
    for(let n=xmin;n<=xmax;n+=10){ctx.globalAlpha=n%50===0?.76:.32;line(X(n),0,X(n),h,grid);if(n>=0&&n%50===0)ctx.fillText(n,X(n)+3,h-4)}
    for(let n=ymin;n<=ymax;n+=10){ctx.globalAlpha=n%50===0?.76:.32;line(0,Y(n),w,Y(n),grid);if(n>=0&&n%50===0&&Y(n)>12)ctx.fillText(n,3,Y(n)-3)}
    ctx.globalAlpha=1;
    function path(frames,j,color,width,dashes=[]){ctx.beginPath();ctx.setLineDash(dashes);frames.forEach((row,k)=>{let [x,y]=row[j];ctx[k?'lineTo':'moveTo'](X(x),Y(y))});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();ctx.setLineDash([])}
    if(trial!==base)path(base.film,0,ink,1,[4,4]);
    for(let j=0;j<3;j++){
      let [x,y]=trial.film[i][j], [ex,ey]=trial.film[i+1][j];
      x=X(x+(ex-x)*z);y=Y(y+(ey-y)*z);
      let [x0,y0]=trial.film[0][j];x0=X(x0);y0=Y(y0);
      ctx.globalAlpha=.6;path(trial.film,j,hues[j],1,[2,4]);line(x0-3,y0,x0+3,y0,hues[j]);line(x0,y0-3,x0,y0+3,hues[j]);
      ctx.globalAlpha=1;path(trial.film.slice(0,i+1),j,hues[j],1.7);
      ctx.strokeStyle=hues[j];ctx.fillStyle=hues[j];ctx.beginPath();ctx.arc(x,y,11,0,2*Math.PI);ctx.globalAlpha=.35;ctx.stroke();ctx.globalAlpha=1;
      ctx.save();ctx.translate(x,y);if(j===1)ctx.rotate(Math.PI/4);if(j)ctx.fillRect(-4,-4,8,8);else{ctx.beginPath();ctx.arc(0,0,5.5,0,2*Math.PI);ctx.fill()}ctx.restore();
      ctx.font='bold 11px monospace';ctx.fillText('ABC'[j],x+12,y-8)
    }
    scrub.value=phase.toFixed(2);document.querySelector('#time').textContent=phase.toFixed(2)+' / 2 s';raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
}
