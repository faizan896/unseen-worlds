import {fmt,xy} from './scope.js';

const times=Array.from({length:21},(_,i)=>i/10);
export function projected(p,a,k,t=2){
  return [p.x+p.vx*t+a[0]*k*t*t/2,p.y+p.vy*t+a[1]*k*t*t/2];
}
export function forecastPlot(p,field,k,actual){
  const paths=[-2.4,1.5].flatMap(v=>times.map(t=>projected(p,field,v,t)));
  if(actual)paths.push(actual);
  const range=axis=>{const v=paths.map(q=>q[axis]);return [Math.min(...v),Math.max(...v)]};
  const [l,r]=range(0),[u,d]=range(1),w=560,h=218;
  const scale=Math.min((w-86)/Math.max(1,r-l),(h-56)/Math.max(1,d-u));
  const X=x=>w/2+(x-(l+r)/2)*scale,Y=y=>h/2+(y-(u+d)/2)*scale;
  const ticks=(origin,size)=>Array.from({length:Math.ceil(size/scale/10)+1},(_,i)=>(Math.ceil(-origin/scale/10)+i)*10);
  const ep=projected(p,field,k),ex=X(ep[0]),ey=Y(ep[1]);
  return `<svg class="prediction" viewBox="0 0 ${w} ${h}" role="img" aria-label="Predicted endpoint ${xy(ep)}${actual?', actual endpoint '+xy(actual):''}">
    ${ticks(X(0),w).map(v=>`<path class="graticule" d="M${X(v)} 0v${h}"/>${v%20===0&&X(v)>20&&X(v)<w-25?`<text x="${X(v)+3}" y="${h-5}">${v}</text>`:''}`).join('')}
    ${ticks(Y(0),h).map(v=>`<path class="graticule" d="M0 ${Y(v)}h${w}"/>${v%20===0&&Y(v)>16&&Y(v)<h-15?`<text x="5" y="${Y(v)-5}">${v}</text>`:''}`).join('')}
    <path d="M${times.map(t=>projected(p,field,k,t)).map(([x,y])=>X(x)+' '+Y(y)).join(' L')}" class="forecast-path"/>
    <circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" class="release-point"/>
    <circle cx="${ex}" cy="${ey}" r="4.5" class="forecast-point"/>
    ${actual?`<path class="actual-mark" d="M${X(actual[0])-8} ${Y(actual[1])}h16 M${X(actual[0])} ${Y(actual[1])-8}v16"/>`:''}</svg>`;
}
