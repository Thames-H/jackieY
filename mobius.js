import * as THREE from './assets/vendor/three.module.js';

const host = document.querySelector('.visual');
const canvas = document.querySelector('#mobius');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true});
} catch {
  // Keep the decorative SVG visible when WebGL is unavailable.
}
if (renderer) init();

function init() {
  gsap.registerPlugin(ScrollTrigger);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0xf5f1e9, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
  camera.position.z = 7.8;
  const ring = new THREE.Group();
  const orientation = new THREE.Group();
  orientation.rotation.set(.78, -.24, -.38);
  orientation.add(ring);
  scene.add(orientation);
  ring.scale.setScalar(.82);
  const ink = 0x676d4b;
  const state = {action:.18, vision:0, language:0};
  const scroll = {progress:0};
  let phase = 0, rotation = 0, last = 0, dirty = true, lastSignature = '';
  // One half-twist. A 4π path returns an off-centre strand to its starting point.
  function point(u, v) {
    return new THREE.Vector3((1.65+v*Math.cos(u/2))*Math.cos(u),
      (1.65+v*Math.cos(u/2))*Math.sin(u), v*Math.sin(u/2));
  }
  const strands = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({color:ink, transparent:true, opacity:.45});
  for(let j=0;j<18;j++) {
    const pts=[];
    for(let i=0;i<=480;i++) pts.push(point(i/480*Math.PI*4, .52*j/17));
    strands.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMaterial));
  }
  ring.add(strands);
  const gridPts=[];
  for(let j=0;j<88;j++) {
    const u=j/88*Math.PI*2;
    gridPts.push(point(u,-.52),point(u,.52));
  }
  const scanMaterial=new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:0});
  ring.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gridPts),scanMaterial));
  const nodePts=[];
  for(let j=0;j<48;j++) nodePts.push(point(j/48*Math.PI*4,.38));
  const nodeMaterial=new THREE.PointsMaterial({color:ink,size:.055,transparent:true,opacity:0});
  ring.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(nodePts),nodeMaterial));
  const linkPts=[];
  for(let j=0;j<48;j++) {linkPts.push(nodePts[j],nodePts[(j+1)%48]);if(j%3===0)linkPts.push(nodePts[j],nodePts[(j+5)%48]);}
  const linkMaterial=new THREE.LineBasicMaterial({color:ink,transparent:true,opacity:0});
  ring.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linkPts),linkMaterial));
  const trailGeometry=new THREE.BufferGeometry();
  const trailPositions=new Float32Array(90*3);
  trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3));
  const trailMaterial=new THREE.LineBasicMaterial({color:0x969545,transparent:true,opacity:.8});
  const trail=new THREE.Line(trailGeometry,trailMaterial);
  trail.frustumCulled=false;
  ring.add(trail);
  const bead=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),new THREE.MeshBasicMaterial({color:ink}));
  ring.add(bead);

  const stages={
    home:{action:.18,vision:0,language:0},
    about:{action:.25,vision:0,language:0},
    action:{action:1,vision:0,language:0},
    vision:{action:.15,vision:1,language:0},
    language:{action:0,vision:.15,language:1},
    contact:{action:.3,vision:0,language:0}
  };
  let current='home';
  function chooseStage() {
    const focus=innerHeight*.46;
    const chapters=[...document.querySelectorAll('.chapter[data-stage]')];
    const chapter=chapters.find(el=>{const r=el.getBoundingClientRect();return r.top<=focus&&r.bottom>focus;}) || (scrollY<100?chapters[0]:chapters.at(-1));
    const next=chapter.dataset.stage;
    if(next===current)return;
    current=next;
    const values=stages[next];
    host.dataset.stage=next;
    if(!preference.matches) gsap.to(state,{...values,duration:.9,ease:'power2.inOut',overwrite:true});
    dirty=true;
  }
  host.dataset.stage='home';
  ScrollTrigger.create({trigger:'main',start:'top top',end:'bottom bottom',onUpdate:chooseStage,onRefresh:chooseStage});
  gsap.to(scroll,{progress:1,ease:'none',scrollTrigger:{trigger:'main',start:'top top',end:'bottom bottom',scrub:.65}});
  function resize(){
    const {width,height}=host.getBoundingClientRect();
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.position.z=camera.aspect<.8?10:7.8;
    camera.updateProjectionMatrix();dirty=true;
  }
  new ResizeObserver(resize).observe(host);
  preference.addEventListener('change',()=>{
    gsap.killTweensOf(state);
    const values=stages[preference.matches?'home':current];
    Object.assign(state,values);phase=0;rotation=0;dirty=true;
  });
  document.addEventListener('visibilitychange',()=>{last=0;dirty=true;});
  resize();chooseStage();host.classList.add('ready');
  function frame(t){
    requestAnimationFrame(frame);
    if(document.hidden){last=0;return;}
    const moving=!preference.matches;
    const dt=last?Math.min((t-last)/1000,.05):0;last=t;
    if(moving){phase+=dt*.22;rotation+=dt*.035;}
    const signature=[state.action,state.vision,state.language].join(',');
    if(!moving&&!dirty&&signature===lastSignature)return;
    lastSignature=signature;dirty=false;
    // A single local axis preserves the silhouette; chapter transitions only
    // change the surface details. Scroll adds a continuous, reversible turn.
    ring.rotation.z=preference.matches?0:rotation+scroll.progress*1.1;
    scanMaterial.opacity=state.vision*.34;
    nodeMaterial.opacity=state.language*.9;
    linkMaterial.opacity=state.language*.36;
    trailMaterial.opacity=state.action*.95;
    bead.visible=state.action>.1;
    for(let i=0;i<90;i++)point(phase-i*.009,.30).toArray(trailPositions,i*3);
    trailGeometry.attributes.position.needsUpdate=true;
    bead.position.copy(point(phase,.30));
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
}
