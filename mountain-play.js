(() => {
'use strict';
const canvas=document.querySelector('#mountain'),ctx=canvas.getContext('2d'),status=document.querySelector('#state'),motion=document.querySelector('#motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=0,height=0,yaw=-.42,pitch=.48,vy=0,vp=0,spread=0,target=0,paused=reduced,drag=null,lastTap=null,timer=0,lastTime=0,active=true,particles=[],projected=[],quads=[],lastInteract=0,suppressClick=false,lastTouchTime=-1000;
const NX=94,NZ=68,vertices=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function elevation(x,z){
 const peaks=[[-.32,-.18,1.58,.86],[.60,.17,.80,.65],[-.91,.28,.49,.52],[.15,.66,.34,.55]];
 let h=0;
 for(const [px,pz,amp,radius] of peaks){const dx=x-px,dz=z-pz;const r=Math.hypot(dx,dz*1.18);const angle=Math.atan2(dz,dx);const ridge=1+.105*Math.sin(angle*5+1)+.05*Math.cos(angle*9);h=Math.max(h,amp*Math.pow(Math.max(0,1-r/(radius*ridge)),1.27));}
 const edge=Math.max(0,1-Math.pow(Math.abs(x)/1.7,4))*Math.max(0,1-Math.pow(Math.abs(z)/1.15,4));
 return h+edge*(.055+.032*Math.sin(x*12+z*7)*Math.sin(z*14-x*5)+.018*Math.cos(x*25+z*17));
}
for(let j=0;j<=NZ;j++)for(let i=0;i<=NX;i++){let x=-1.7+3.4*i/NX,z=-1.15+2.3*j/NZ;vertices.push({x,z,h:elevation(x,z),j});}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);}
new ResizeObserver(resize).observe(canvas);
function project(v){const cz=Math.cos(yaw),sz=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);const band=Math.floor(v.j/9)-3.5;const z=v.z+spread*band*.18,y=v.h+spread*band*.17;const x=v.x*cz+z*sz,depth=-v.x*sz+z*cz;const yy=y*cp-depth*sp,dd=depth*cp+y*sp;const scale=Math.max(width/3.6,height/2.55);return{x:width*.61+x*scale,y:height*.77-yy*scale,d:dd};}
function message(){status.textContent=target?'Layers unfolded · Double-click to reunite':'A landscape to explore';}
function unfold(){target=target?0:1;particles=[];vy=vp=0;message();lastInteract=performance.now();}
function reset(){yaw=-.42;pitch=.48;vy=vp=0;target=0;particles=[];message();}
function release(x,y){if(!projected.length)return;let nearest=0,dist=Infinity;projected.forEach((p,i)=>{let d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;nearest=i;}});if(dist>6400)return;const j=Math.floor(nearest/(NX+1)),i=nearest%(NX+1);for(let n=-1;n<=1;n++)particles.push({row:clamp(j+n,0,NZ),i,dir:n===0?-1:1,age:0});if(particles.length>24)particles.splice(0,particles.length-24);status.textContent='Following the contours';}
function tap(x,y){const now=performance.now();if(lastTap&&now-lastTap.t<460&&Math.hypot(x-lastTap.x,y-lastTap.y)<25){clearTimeout(timer);lastTap=null;unfold();}else{lastTap={x,y,t:now};clearTimeout(timer);timer=setTimeout(()=>{release(x,y);lastTap=null;},460);}}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};vy=vp=0;suppressClick=false;lastInteract=performance.now();});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5;if(drag.moved){clearTimeout(timer);lastTap=null;yaw+=dx*.008;pitch=clamp(pitch+dy*.005,-.45,1.25);vy=dx*.001;vp=dy*.0005;}drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();suppressClick=drag.moved;if(e.pointerType==='touch')lastTouchTime=performance.now();if(!drag.moved&&e.pointerType==='touch')tap(e.clientX-r.left,e.clientY-r.top);drag=null;lastInteract=performance.now();});
canvas.addEventListener('click',e=>{if(e.pointerType==='touch'||performance.now()-lastTouchTime<800||suppressClick)return;clearTimeout(timer);if(e.detail>1)return;const r=canvas.getBoundingClientRect();timer=setTimeout(()=>release(e.clientX-r.left,e.clientY-r.top),460);});
canvas.addEventListener('dblclick',e=>{e.preventDefault();clearTimeout(timer);lastTap=null;if(e.pointerType!=='touch'&&performance.now()-lastTouchTime>=800&&!suppressClick)unfold();});
canvas.addEventListener('pointercancel',()=>{drag=null;vy=vp=0;});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Escape'].includes(e.key))return;e.preventDefault();lastInteract=performance.now();if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch=clamp(pitch+.1,-.45,1.25);if(e.key==='ArrowDown')pitch=clamp(pitch-.1,-.45,1.25);if(e.key==='Enter')unfold();if(e.key==='Escape')reset();if(e.key===' '){const p=projected[Math.floor(NZ*.5)*(NX+1)+Math.floor(NX*.5)];if(p)release(p.x,p.y);}});
document.querySelector('#reset').onclick=()=>{clearTimeout(timer);lastTap=null;reset();};
function motionLabel(){motion.textContent=paused?'Play':'Pause';motion.setAttribute('aria-pressed',String(paused));}motion.onclick=()=>{paused=!paused;motionLabel();};motionLabel();
new IntersectionObserver(entries=>{active=entries[0].isIntersecting;}).observe(canvas);
function frame(t){requestAnimationFrame(frame);if(t-lastTime<32)return;const dt=Math.min((t-lastTime)/1000,.05);lastTime=t;if(!active||document.hidden)return;if(!drag){if(!reduced){yaw+=vy;pitch=clamp(pitch+vp,-.45,1.25);vy*=.91;vp*=.91;}if(!paused&&t-lastInteract>2500)yaw+=dt*.025;}
 spread+=(target-spread)*(reduced?1:.10);
 ctx.clearRect(0,0,width,height);projected=vertices.map(project);quads=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+2,d=a+NX+1;quads.push({a,b,c,d,depth:(projected[a].d+projected[c].d)*.5,j,i});}
 quads.sort((a,b)=>a.depth-b.depth);
 ctx.lineWidth=.65;ctx.lineJoin='round';
 for(const q of quads){const a=projected[q.a],b=projected[q.b],c=projected[q.c],d=projected[q.d];const edge=Math.min(1,Math.min(q.i,NX-q.i)/9,Math.min(q.j,NZ-q.j)/7);if(spread<.02||q.j%9!==8){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fillStyle='#F5F1E9';ctx.fill();}ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(79,81,62,${.13+edge*.52})`;ctx.stroke();}
 for(const p of particles){if(!paused)p.age+=dt;const index=p.i+p.dir*p.age*14;const k=clamp(Math.floor(index),0,NX-1),f=clamp(index-k,0,1);if(index<0||index>NX)continue;ctx.beginPath();for(let s=0;s<12;s++){const ix=clamp(index-p.dir*s*.42,0,NX),ii=Math.min(NX-1,Math.floor(ix)),ff=ix-ii;const a=projected[p.row*(NX+1)+ii],b=projected[p.row*(NX+1)+ii+1];const x=a.x+(b.x-a.x)*ff,y=a.y+(b.y-a.y)*ff;s?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='rgba(103,109,75,.65)';ctx.lineWidth=1.6;ctx.stroke();const a=projected[p.row*(NX+1)+k],b=projected[p.row*(NX+1)+k+1],x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;ctx.fillStyle='#676D4B';ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();ctx.lineWidth=.65;}
 particles=particles.filter(p=>p.age<5);if(!particles.length&&status.textContent==='Following the contours')message();
}
requestAnimationFrame(frame);
})();
