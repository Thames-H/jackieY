(() => {
'use strict';
const canvas=document.querySelector('#mountain'),ctx=canvas.getContext('2d'),status=document.querySelector('#state'),motion=document.querySelector('#motion');
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches,lastScene='';
const unfoldButton=document.querySelector('#unfold');
const pose={yaw:-.30,pitch:.50,spread:0}, drift={angle:0}, scrollScene={progress:0};
const animate=(values,duration=.8)=>{gsap.to(pose,{...values,duration:reduced?0:duration,ease:'power3.out',overwrite:'auto'});};
const sway=gsap.to(drift,{angle:.075,duration:7,ease:'sine.inOut',repeat:-1,yoyo:true,paused:true});
let width=0,height=0,target=0,paused=reduced,drag=null,lastTap=null,timer=0,lastTime=0,active=true,particles=[],projected=[],quads=[],suppressClick=false,lastTouchTime=-1000;
const NX=128,NZ=64,vertices=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Smooth, overlapping ridges avoid the hard seams of intersecting cones.
function elevation(x,z){
 const ridgeZ=z+.13*Math.sin(x*2.5)-.12*x;
 const ridge=Math.exp(-ridgeZ*ridgeZ/ .21);
 const peaks=.88*Math.exp(-(((x+.35)/.49)**2))+.60*Math.exp(-(((x-.48)/.42)**2))+.26*Math.exp(-(((x+1.05)/.34)**2));
 const foothills=.18*Math.exp(-(x*x/1.2+z*z/.7));
 const detail=1+.045*Math.sin(x*13+z*8)+.012*Math.sin(x*27-z*12);
 const edge=Math.pow(Math.max(0,1-(x/1.7)**2),.7)*Math.pow(Math.max(0,1-(z/1.15)**2),.7);
 return (peaks*ridge*detail+foothills)*edge;
}
for(let j=0;j<=NZ;j++)for(let i=0;i<=NX;i++){let x=-1.7+3.4*i/NX,z=-1.15+2.3*j/NZ;vertices.push({x,z,h:elevation(x,z),j});}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);}
new ResizeObserver(resize).observe(canvas);
function project(v){
 // Scroll is additive: dragging, unfold and reset never fight the scroll tween.
 const progress=reduced?0:scrollScene.progress;
 const yaw=pose.yaw+drift.angle+progress*.42;
 const pitch=pose.pitch+progress*.24;
 const spread=pose.spread+(1-pose.spread)*progress*.72;
 const cz=Math.cos(yaw),sz=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const z=v.z*(1+spread*.18),y=v.h*(1-spread*.86);
 const x=v.x*cz+z*sz,depth=-v.x*sz+z*cz;
 const yy=y*cp-depth*sp,dd=depth*cp+y*sp;
 const mobile=width<=600;
 const scale=(mobile?width/3.7:Math.min(width/3.7,height/2.15))*(1-progress*.10);
 return{x:width*(mobile?.55:.66)+x*scale,y:height*(mobile?.80:.77)-yy*scale-progress*height*.06,d:dd};
}
// Pin only on roomy screens; touch layouts keep their normal document flow.
gsap.registerPlugin(ScrollTrigger);
const scrollMedia=gsap.matchMedia();
scrollMedia.add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 901px) and (min-height: 740px)'},context=>{
 if(!context.conditions.motion)return;
 const desktop=context.conditions.desktop;
 const timeline=gsap.timeline({scrollTrigger:{
  id:'landscape-scroll',trigger:'.hero',start:'top top',
  end:()=>desktop?'+='+Math.round(innerHeight*.65):'bottom top',
  pin:desktop,anticipatePin:1,scrub:.45,invalidateOnRefresh:true
 }});
 timeline.to(scrollScene,{progress:1,duration:1,ease:'none'},0);
 if(desktop)timeline.to('.identity',{yPercent:-12,opacity:.55,duration:1,ease:'none'},0);
 return()=>{scrollScene.progress=0;lastScene='';};
});
function message(){if(unfoldButton){unfoldButton.textContent=target?'Restore peaks':'Unfold terrain';unfoldButton.setAttribute('aria-pressed',String(Boolean(target)));}status.textContent=target?'Terrain unfolded · Double-click to restore peaks':'A landscape to explore';}
function unfold(){target=target?0:1;particles=[];animate({spread:target,pitch:target?.68:.50},1.5);message();}
function reset(){gsap.killTweensOf(pose);target=0;particles=[];animate({yaw:-.30,pitch:.50,spread:0},1.2);message();}
function release(x,y){if(!projected.length||reduced)return;let nearest=0,dist=Infinity;projected.forEach((p,i)=>{let d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;nearest=i;}});if(dist>6400)return;const j=Math.floor(nearest/(NX+1)),i=nearest%(NX+1);for(let n=-1;n<=1;n++)particles.push({row:clamp(j+n,0,NZ),i,dir:n===0?-1:1,age:0});if(particles.length>24)particles.splice(0,particles.length-24);status.textContent='Following the contours';}
function tap(x,y){const now=performance.now();if(lastTap&&now-lastTap.t<460&&Math.hypot(x-lastTap.x,y-lastTap.y)<25){clearTimeout(timer);lastTap=null;unfold();}else{lastTap={x,y,t:now};clearTimeout(timer);timer=setTimeout(()=>{release(x,y);lastTap=null;},460);}}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};gsap.killTweensOf(pose,'yaw,pitch');drag.yaw=pose.yaw;drag.pitch=pose.pitch;suppressClick=false;});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved ||= Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>5;if(drag.moved){clearTimeout(timer);lastTap=null;drag.yaw=clamp(drag.yaw+dx*.004,-.9,.65);drag.pitch=clamp(drag.pitch+dy*.003,.25,.8);animate({yaw:drag.yaw,pitch:drag.pitch},.24);}drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();suppressClick=drag.moved;if(e.pointerType==='touch')lastTouchTime=performance.now();if(!drag.moved&&e.pointerType==='touch')tap(e.clientX-r.left,e.clientY-r.top);drag=null;});
canvas.addEventListener('click',e=>{if(e.pointerType==='touch'||performance.now()-lastTouchTime<800||suppressClick)return;clearTimeout(timer);if(e.detail>1)return;const r=canvas.getBoundingClientRect();timer=setTimeout(()=>release(e.clientX-r.left,e.clientY-r.top),460);});
canvas.addEventListener('dblclick',e=>{e.preventDefault();clearTimeout(timer);lastTap=null;if(e.pointerType!=='touch'&&performance.now()-lastTouchTime>=800&&!suppressClick)unfold();});
canvas.addEventListener('pointercancel',()=>{drag=null;});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')animate({yaw:clamp(pose.yaw-.12,-.9,.65)});if(e.key==='ArrowRight')animate({yaw:clamp(pose.yaw+.12,-.9,.65)});if(e.key==='ArrowUp')animate({pitch:clamp(pose.pitch+.1,.25,.8)});if(e.key==='ArrowDown')animate({pitch:clamp(pose.pitch-.1,.25,.8)});if(e.key==='Enter')unfold();if(e.key==='Escape')reset();if(e.key===' '){const p=projected[Math.floor(NZ*.5)*(NX+1)+Math.floor(NX*.5)];if(p)release(p.x,p.y);}});
if(unfoldButton)unfoldButton.onclick=unfold;
document.querySelector('#reset').onclick=()=>{clearTimeout(timer);lastTap=null;reset();};
function motionLabel(){motion.textContent=paused?'Play':'Pause';motion.setAttribute('aria-pressed',String(paused));}motion.onclick=()=>{paused=!paused;motionLabel();syncMotion();};motionLabel();
function syncMotion(){sway.paused(paused||reduced||!active||document.hidden||!!drag);}
motionPreference.addEventListener('change',e=>{reduced=e.matches;paused=reduced;if(reduced){gsap.killTweensOf(pose);pose.spread=target;particles=[];}motionLabel();syncMotion();});
document.addEventListener('visibilitychange',syncMotion);
new IntersectionObserver(entries=>{active=entries[0].isIntersecting;syncMotion();}).observe(canvas);
function frame(t){requestAnimationFrame(frame);if(t-lastTime<16)return;const dt=Math.min((t-lastTime)/1000,.05);lastTime=t;syncMotion();if(!active||document.hidden)return;
 const scene=[width,height,pose.yaw,pose.pitch,pose.spread,drift.angle,scrollScene.progress,reduced,particles.length,paused].join(',');
 if(scene===lastScene&&(!particles.length||paused))return;
 lastScene=scene;
 ctx.clearRect(0,0,width,height);projected=vertices.map(project);quads=[];
 for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+2,d=a+NX+1;quads.push({a,b,c,d,depth:(projected[a].d+projected[c].d)*.5,j,i});}
 quads.sort((a,b)=>a.depth-b.depth);
 ctx.lineWidth=.65;ctx.lineJoin='round';
 for(const q of quads){const a=projected[q.a],b=projected[q.b],c=projected[q.c],d=projected[q.d];const edge=Math.min(1,Math.min(q.i,NX-q.i)/9,Math.min(q.j,NZ-q.j)/7);{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fillStyle='#F5F1E9';ctx.fill();}ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(79,81,62,${.13+edge*.52})`;ctx.stroke();}
 for(const p of particles){if(!paused)p.age+=dt;const index=p.i+p.dir*p.age*14;const k=clamp(Math.floor(index),0,NX-1),f=clamp(index-k,0,1);if(index<0||index>NX)continue;ctx.beginPath();for(let s=0;s<12;s++){const ix=clamp(index-p.dir*s*.42,0,NX),ii=Math.min(NX-1,Math.floor(ix)),ff=ix-ii;const a=projected[p.row*(NX+1)+ii],b=projected[p.row*(NX+1)+ii+1];const x=a.x+(b.x-a.x)*ff,y=a.y+(b.y-a.y)*ff;s?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='rgba(103,109,75,.65)';ctx.lineWidth=1.6;ctx.stroke();const a=projected[p.row*(NX+1)+k],b=projected[p.row*(NX+1)+k+1],x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f;ctx.fillStyle='#676D4B';ctx.beginPath();ctx.arc(x,y,2.7,0,Math.PI*2);ctx.fill();ctx.lineWidth=.65;}
 particles=particles.filter(p=>p.age<5);if(!particles.length&&status.textContent==='Following the contours')message();
}
requestAnimationFrame(frame);
})();
