import * as THREE from 'three';
import { fishSpecies, baitsData, rodsData, upgradesData } from './data.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const sceneRoot = $('scene');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x9bb7b5, 0.00155);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.08, 1400);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.14;
sceneRoot.appendChild(renderer.domElement);
const clock = new THREE.Clock();
const mat = (color, roughness = .78, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const boatRoot = new THREE.Group(); scene.add(boatRoot);
const world = new THREE.Group(); boatRoot.add(world);
const ambient = new THREE.HemisphereLight(0xc5e0dc, 0x243b36, 1.5); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffdfaa, 3.2); sun.position.set(-80, 110, 50); sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-34; sun.shadow.camera.right=34; sun.shadow.camera.top=34; sun.shadow.camera.bottom=-34; sun.shadow.bias=-.0004; scene.add(sun);
const fill = new THREE.DirectionalLight(0x8dbdc7,1.05); fill.position.set(65,20,-90); scene.add(fill);
function standardBox(parent,name,size,position,material,rotation=[0,0,0]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function cylinder(parent,radiusTop,radiusBottom,height,position,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function tube(parent,points,radius,material){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const m=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*5),radius,6,false),material);m.castShadow=true;parent.add(m);return m}

// Layered, animated Gerstner-like ocean surface.
const waterGeo=new THREE.PlaneGeometry(1500,1500,220,220); waterGeo.rotateX(-Math.PI/2);
const waterMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uStorm:{value:0},uSun:{value:new THREE.Vector3(-.55,.72,.42).normalize()},uDeep:{value:new THREE.Color('#073b4b')},uShallow:{value:new THREE.Color('#4b9b91')},uSky:{value:new THREE.Color('#a9c5c0')}},vertexShader:`
varying vec3 vWorld; varying vec3 vNormal; varying float vWave; uniform float uTime;
void main(){vec3 p=position;float t=uTime;float h=0.0;vec3 n=vec3(0.0,1.0,0.0);
float a=sin(p.x*.095+p.z*.055+t*.58)*.42;float b=sin(p.x*.22-p.z*.16+t*.92)*.13;float c=sin(p.x*.55+p.z*.37+t*1.65)*.035;
h=a+b+c;p.y+=h;
float dx=.42*.095*cos(p.x*.095+p.z*.055+t*.58)+.13*.22*cos(p.x*.22-p.z*.16+t*.92)+.035*.55*cos(p.x*.55+p.z*.37+t*1.65);
float dz=.42*.055*cos(p.x*.095+p.z*.055+t*.58)-.13*.16*cos(p.x*.22-p.z*.16+t*.92)+.035*.37*cos(p.x*.55+p.z*.37+t*1.65);
n=normalize(vec3(-dx,1.0,-dz));vec4 w=modelMatrix*vec4(p,1.0);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*n);vWave=h;gl_Position=projectionMatrix*viewMatrix*w;}`,
fragmentShader:`varying vec3 vWorld;varying vec3 vNormal;varying float vWave;uniform float uTime;uniform vec3 uSun;uniform vec3 uDeep;uniform vec3 uShallow;uniform vec3 uSky;
void main(){vec3 N=normalize(vNormal);vec3 V=normalize(cameraPosition-vWorld);float fres=pow(1.0-max(dot(N,V),0.0),4.0);float crest=smoothstep(.22,.48,vWave);float depth=smoothstep(-.55,.45,vWave);vec3 col=mix(uDeep,uShallow,depth*.72);col=mix(col,uSky,fres*.78);col=mix(col,vec3(.76,.87,.82),crest*.37);
float glitter=pow(max(dot(reflect(-normalize(uSun),N),V),0.0),100.0);float sparkle=step(.992,sin(vWorld.x*83.1+vWorld.z*47.7+uTime*2.7)*.5+.5)*glitter;
float foam=smoothstep(.38,.57,vWave)*.19;float caustic=(sin(vWorld.x*.48+uTime*.7)*sin(vWorld.z*.41-uTime*.58))*.035;
col+=vec3(1.0,.87,.62)*sparkle*.85;col+=vec3(.74,.91,.85)*(foam+max(caustic,0.0));float fog=smoothstep(80.0,460.0,length(vWorld.xz-cameraPosition.xz));col=mix(col,uSky,fog*.72);gl_FragColor=vec4(col,.9);}`,
side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false});
const water=new THREE.Mesh(waterGeo,waterMat); water.position.y=-1.85; water.receiveShadow=true;scene.add(water);

// Industrial trawler: scarred hull, working deck and piled gear.
const rust=mat('#713f31',.86), hullPaint=mat('#1e4345',.55,.28), deckMat=mat('#59615b',.86,.28), steel=mat('#737b74',.5,.72), darkSteel=mat('#303b39',.68,.64), wood=mat('#66523d'), crateMat=mat('#74634b'), ropeMat=mat('#b18f5d'), glass=new THREE.MeshPhysicalMaterial({color:'#78a3a0',roughness:.18,metalness:.2,transparent:true,opacity:.38});
// Low, tapered hull stays below the working deck so the opening view remains unobstructed.
const hullPositions=[],hullIndices=[];
const hullStations=[{z:5.1,w:1.55,d:1.1},{z:3.8,w:3.15,d:2.05},{z:1,w:3.72,d:2.5},{z:-8.8,w:3.72,d:2.5},{z:-11.5,w:2.3,d:1.75},{z:-12.1,w:.12,d:.18}];
for(const {z,w,d} of hullStations)hullPositions.push(-w,-.04,z,-w*.82,-d*.48,z,0,-d,z,w*.82,-d*.48,z,w,-.04,z);
for(let i=0;i<hullStations.length-1;i++)for(let j=0;j<4;j++){const a=i*5+j,b=a+5;hullIndices.push(a,b,a+1,b,b+1,a+1)}
const hullGeo=new THREE.BufferGeometry();hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(hullPositions,3));hullGeo.setIndex(hullIndices);hullGeo.computeVertexNormals();
const hull=new THREE.Mesh(hullGeo,hullPaint);hull.castShadow=true;hull.receiveShadow=true;world.add(hull);
standardBox(world,'steel deck',[7.6,.38,16], [0,0,-3.1],deckMat);
for(let i=0;i<18;i++)standardBox(world,'deck seam',[7.45,.012,.025],[0,.197,4.55-i*.88],mat(i%3?'#3f4b47':'#81755d',.9),[0,0,0]);
// hull strakes, rust streaks and rivets
for(let side of [-1,1]){for(let z=-10;z<4;z+=.8){cylinder(world,.045,.045,.045,[side*3.59,-.34,z],steel,8).rotation.x=Math.PI/2;}for(let i=0;i<11;i++){standardBox(world,'oxidized plate',[.08,.55,.42],[side*(3.52+(i%3)*.035),-.63,-9+i*.95],rust,[0,0,(i%2?.1:-.12)]);}}
// Raised bow bulwarks and safety rail, intentionally leave walk-through stern opening.
for(let side of [-1,1]){standardBox(world,'bulwark',[.18,.88,11],[side*3.58,.48,-4.7],hullPaint);for(let z=-10.3;z<1.6;z+=1.35)cylinder(world,.065,.065,1.35,[side*3.54,1.05,z],steel,10);tube(world,[[side*3.54,1.7,-11.2],[side*3.54,1.7,-5],[side*3.54,1.7,1.4]],.055,steel);tube(world,[[side*3.54,.92,-11.2],[side*3.54,.92,1.4]],.045,steel);}
// Wheelhouse and weathered windows.
standardBox(world,'wheelhouse lower',[5.1,2.05,4.2],[0,1.28,-8.25],mat('#42534f',.68,.26));
standardBox(world,'wheelhouse roof',[5.8,.22,4.8],[0,2.48,-8.25],darkSteel);
standardBox(world,'front glazing',[4.5,1.15,.08],[0,1.72,-6.12],glass);
for(let x=-2.2;x<=2.21;x+=1.1)standardBox(world,'window frame',[.075,1.3,.13],[x,1.72,-6.08],steel);
for(let side of [-1,1]){standardBox(world,'side windows',[.08,.9,2.9],[side*2.56,1.7,-8.25],glass);standardBox(world,'window trim',[.11,.1,3.0],[side*2.6,2.2,-8.25],steel);}
standardBox(world,'roof lip',[6.1,.12,5.1],[0,2.62,-8.25],rust);
cylinder(world,.09,.09,2.4,[-1.45,3.7,-8.6],steel);tube(world,[[-1.45,4.9,-8.6],[-1.25,5.15,-8.6],[-1.05,4.9,-8.6]],.025,steel);

// Net winch, trawl gear, work lights and deck clutter.
standardBox(world,'winch base',[2.2,.35,1.3],[1.35,.38,-2.1],darkSteel);
for(let x of [.7,2]){cylinder(world,.62,.62,.86,[x,.94,-2.1],steel,24).rotation.z=Math.PI/2;cylinder(world,.16,.16,1.08,[x,.94,-2.1],darkSteel,20).rotation.z=Math.PI/2;}
for(let i=0;i<5;i++)tube(world,[[.5,.95,-2.1],[1,.55,-1.7-i*.08],[2.25,.55,-1.55-i*.08]],.025,ropeMat);
// Coiled trawl net.
const net=new THREE.Group();net.position.set(-2.2,.26,-3.3);world.add(net);
for(let i=0;i<4;i++){const tor=new THREE.Mesh(new THREE.TorusGeometry(.45+i*.08,.025,5,32),ropeMat);tor.rotation.x=Math.PI/2;tor.position.y=i*.065;net.add(tor)}
for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(net,[[Math.cos(a)*.35,0,Math.sin(a)*.35],[Math.cos(a)*.72,.24,Math.sin(a)*.72]],.012,steel)}
// Crates and barrels are blockers for walking.
for(const [x,z] of [[-2.45,1.8],[2.35,.1],[-2.2,-1.1]]){const box=standardBox(world,'fish crate',[1.1,.85,1],[x,.62,z],crateMat);standardBox(world,'crate band',[1.12,.09,1.04],[x,.7,z],darkSteel);standardBox(world,'crate lid',[1.13,.09,1.04],[x,1.08,z],wood)}
for(const [x,z] of [[2.3,-4.9],[-2.5,-5.7]]){cylinder(world,.38,.38,.93,[x,.67,z],rust,18);for(let y of [.35,.58,.9,1.04]){const tor=new THREE.Mesh(new THREE.TorusGeometry(.385,.035,6,20),steel);tor.rotation.x=Math.PI/2;tor.position.set(x,y,z);world.add(tor)}}
// Buoys and rope coils.
for(const [x,z,color] of [[-3.1,-.2,'#d27a4d'],[3.08,-7.2,'#d8bd76'],[-2.8,-9.6,'#a85e49']]){const buoy=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),mat(color,.55));buoy.scale.set(1,.75,.9);buoy.position.set(x,.47,z);buoy.castShadow=true;world.add(buoy);cylinder(world,.055,.055,.24,[x,.72,z],steel,10)}
for(let i=0;i<4;i++){const tor=new THREE.Mesh(new THREE.TorusGeometry(.3,.045,6,22),ropeMat);tor.rotation.x=Math.PI/2;tor.position.set(1.7,.3,2.5+i*.35);world.add(tor)}
// Rack with rods and functional first-person rod model.
standardBox(world,'rod rack',[2.1,.12,.32],[-2.35,.55,2.9],darkSteel);
const rackRodMat=mat('#292e2c',.48,.55);
for(let i=0;i<3;i++){tube(world,[[-3.05,.72+i*.07,2.85],[-2.6,1.7+i*.07,2.85],[-2.27,2.45+i*.07,2.85]],.035,rackRodMat);cylinder(world,.08,.08,.32,[-2.92,.82+i*.07,2.85],rust,12).rotation.z=Math.PI/2;}
// Bait table and cooler.
standardBox(world,'bait station',[1.5,.75,.95],[2.25,.58,3.5],wood);standardBox(world,'bait tray',[1.35,.12,.8],[2.25,1.02,3.5],steel);
standardBox(world,'fish cooler',[1.45,.95,1.2],[-.65,.68,3.8],mat('#627670',.47,.26));standardBox(world,'cooler lid',[1.52,.13,1.26],[-.65,1.2,3.8],steel);standardBox(world,'cooler latch',[.16,.22,.11],[-.65,1.02,3.13],darkSteel);

const rodGroup=new THREE.Group();camera.add(rodGroup);rodGroup.position.set(.48,-.43,-.72);rodGroup.rotation.set(-.04,-.09,-.08);
const handMat=mat('#9b795e'), rodMat=new THREE.MeshStandardMaterial({color:'#272e2b',roughness:.36,metalness:.52});
const rodMesh=new THREE.Mesh(new THREE.CylinderGeometry(.025,.055,2.25,10),rodMat);rodMesh.rotation.x=-.19;rodMesh.rotation.z=-.42;rodMesh.position.set(-.11,.03,-.52);rodMesh.castShadow=true;rodGroup.add(rodMesh);
const reel=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.12,20),steel);reel.rotation.z=Math.PI/2;reel.position.set(-.12,-.15,-.13);rodGroup.add(reel);
const reelCore=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.16,16),darkSteel);reelCore.rotation.z=Math.PI/2;reelCore.position.copy(reel.position);rodGroup.add(reelCore);
const reelHandle=new THREE.Mesh(new THREE.BoxGeometry(.04,.31,.05),steel);reelHandle.position.set(-.25,-.28,-.12);rodGroup.add(reelHandle);
const grip=new THREE.Mesh(new THREE.CylinderGeometry(.08,.065,.37,10),handMat);grip.rotation.x=-.19;grip.rotation.z=-.42;grip.position.set(.02,-.1,.04);rodGroup.add(grip);
rodGroup.visible=false;

// Horizon sky gradient and low clouds.
const skyCanvas=document.createElement('canvas');skyCanvas.width=4;skyCanvas.height=256;const ctx=skyCanvas.getContext('2d');const grad=ctx.createLinearGradient(0,0,0,256);grad.addColorStop(0,'#2c6272');grad.addColorStop(.42,'#91b6b4');grad.addColorStop(.72,'#e7c7a2');grad.addColorStop(1,'#c7c9ae');ctx.fillStyle=grad;ctx.fillRect(0,0,4,256);
const skyTex=new THREE.CanvasTexture(skyCanvas);skyTex.colorSpace=THREE.SRGBColorSpace;
const sky=new THREE.Mesh(new THREE.SphereGeometry(900,32,24),new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,depthWrite:false}));scene.add(sky);
const clouds=new THREE.Group();scene.add(clouds);const cloudMat=new THREE.MeshBasicMaterial({color:'#e4e0ce',transparent:true,opacity:.22,depthWrite:false});
for(let i=0;i<24;i++){const g=new THREE.Group();const x=(Math.random()-.5)*450,z=-170-Math.random()*500,y=28+Math.random()*65;for(let j=0;j<4;j++){const c=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),cloudMat);c.scale.set(8+Math.random()*12,1.1+Math.random()*2,3+Math.random()*5);c.position.set((j-1.5)*7,Math.random()*1.5,Math.random()*3);g.add(c)}g.position.set(x,y,z);clouds.add(g)}
const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),new THREE.MeshBasicMaterial({color:'#f9dfae'}));sunDisc.position.set(-125,70,-300);scene.add(sunDisc);

function makeFish(species, scale=1){
  const group=new THREE.Group(), L=species.length, H=species.height;const color=new THREE.Color(species.color);
  const verts=[],normals=[],uv=[],indices=[],rings=18,sides=12;
  for(let i=0;i<=rings;i++){const t=i/rings, x=(t-.5)*L;const shape=Math.pow(Math.sin(Math.PI*t),.72)*(0.72+0.65*Math.exp(-Math.pow((t-.43)*4,2)));for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2;verts.push(x,Math.sin(a)*H*shape,Math.cos(a)*H*.56*shape);uv.push(t,j/sides);}}
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const bodyMat=new THREE.MeshStandardMaterial({color,roughness:.34,metalness:.18,emissive:species.glow||'#000000',emissiveIntensity:species.variant?.32:0,side:THREE.DoubleSide});
  const body=new THREE.Mesh(geo,bodyMat);body.castShadow=true;group.add(body);
  if(species.pattern%2===1){const stripeMat=new THREE.MeshStandardMaterial({color:color.clone().multiplyScalar(.52),roughness:.5,side:THREE.DoubleSide});for(let k=0;k<4;k++){const x=-L*.24+k*L*.14;const stripe=new THREE.Mesh(new THREE.BoxGeometry(.035,H*1.48,H*.88),stripeMat);stripe.position.x=x;group.add(stripe)}}
  const finMat=new THREE.MeshStandardMaterial({color:color.clone().multiplyScalar(.72),roughness:.48,side:THREE.DoubleSide,emissive:species.glow||'#000000',emissiveIntensity:species.variant?.22:0});
  function fin(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2]);g.computeVertexNormals();const m=new THREE.Mesh(g,finMat);m.material=finMat;group.add(m)}
  fin([[-L*.43,0,0],[-L*.5,H*.82,0],[-L*.62,0,0]]);fin([[-L*.43,0,0],[-L*.5,-H*.82,0],[-L*.62,0,0]]);
  fin([[-L*.1,H*.48,0],[-L*.03,H*1.15,0],[L*.16,H*.46,0]]);fin([[-L*.08,-H*.42,0],[L*.1,-H*.83,0],[L*.18,-H*.35,0]]);
  fin([[L*.04,0,H*.38],[L*.22,-H*.58,H*.58],[L*.19,H*.22,H*.43]]);
  // Tail fork contours differ across species.
  if(species.tail===1){fin([[-L*.45,0,0],[-L*.72,H*.55,0],[-L*.59,0,0]]);fin([[-L*.45,0,0],[-L*.72,-H*.55,0],[-L*.59,0,0]])}
  const eyeMat=new THREE.MeshStandardMaterial({color:'#fff4d9',roughness:.2}),pupilMat=new THREE.MeshBasicMaterial({color:'#111918'});
  for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(H*.115,10,8),eyeMat);e.position.set(L*.34,H*.14,s*H*.46);group.add(e);const p=new THREE.Mesh(new THREE.SphereGeometry(H*.06,8,6),pupilMat);p.position.set(L*.36,H*.14,s*H*.51);group.add(p)}
  group.scale.setScalar(scale);return group;
}
const fishShadows=[];
for(let i=0;i<11;i++){const sp=fishSpecies[(i*13)%100];const fish=makeFish(sp,.55+Math.random()*.55);fish.position.set((Math.random()-.5)*17,-1.05-Math.random()*2,-3-Math.random()*20);fish.rotation.y=Math.random()*6.28;fish.userData.homeX=fish.position.x;fish.userData.homeY=fish.position.y;fish.userData.baseZ=fish.position.z;fish.userData.phase=Math.random()*6.28;fishShadows.push(fish);scene.add(fish)}

// State and interaction.
const state={coins:248,baitIndex:0,baitCounts:{minnow:8,shrimp:4,squid:3,glowworm:2,crab:1},rod:null,rodType:'deckhand',ownedRods:['deckhand'],upgrades:[],inventory:[],known:new Set(),phase:'idle',charge:0,bobber:null,castTarget:new THREE.Vector3(0,-1.6,-14),castStart:0,castDuration:0,biteAt:0,biteDeadline:0,hooked:null,tension:.32,fishProgress:0,fishObject:null,catchTimer:0,walk:new THREE.Vector3(),velocity:new THREE.Vector3(),yaw:.72,pitch:-.03,headBob:0,walking:false,hours:14.5,boatPhase:0,toastTimer:0};
try{const saved=JSON.parse(localStorage.getItem('deepwater-save')||'null');if(saved){const coins=Number(saved.coins);state.coins=Number.isFinite(coins)?Math.max(0,coins):248;state.baitCounts={...state.baitCounts,...(saved.baitCounts||{})};state.ownedRods=Array.isArray(saved.ownedRods)&&saved.ownedRods.length?saved.ownedRods:['deckhand'];state.rodType=state.ownedRods.includes(saved.rodType)?saved.rodType:'deckhand';state.rod=!!saved.rod;state.upgrades=Array.isArray(saved.upgrades)?saved.upgrades:[];state.inventory=Array.isArray(saved.inventory)?saved.inventory.slice(0,24):[];state.known=new Set(Array.isArray(saved.known)?saved.known:[]);state.hours=Number.isFinite(saved.hours)?saved.hours:14.5}}catch{localStorage.removeItem('deepwater-save')}
if(state.rod){rodGroup.visible=true;$('hint').style.opacity='0';}
let activePointers=new Map(),lookPointer=null,joystickPointer=null,joyVector=new THREE.Vector2(),mouseLook=false,lastLook=new THREE.Vector2();
const lineGeometry=new THREE.BufferGeometry();const linePositions=new Float32Array(20*3);lineGeometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3));const fishingLine=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:'#d8cda8',transparent:true,opacity:.85}));fishingLine.frustumCulled=false;scene.add(fishingLine);fishingLine.visible=false;
const bobber=new THREE.Group();const bobBody=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),new THREE.MeshStandardMaterial({color:'#e4b85e',roughness:.35,emissive:'#5c3511',emissiveIntensity:.3}));bobber.add(bobBody);const bobTop=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),mat('#f2e7cb',.4));bobTop.position.y=.095;bobber.add(bobTop);scene.add(bobber);bobber.visible=false;
const rippleGroup=new THREE.Group();scene.add(rippleGroup);const rippleMat=new THREE.MeshBasicMaterial({color:'#d7e8d8',transparent:true,opacity:.58,side:THREE.DoubleSide});
function makeRipple(){const r=new THREE.Mesh(new THREE.RingGeometry(.12,.17,36),rippleMat.clone());r.rotation.x=-Math.PI/2;r.position.copy(bobber.position);r.position.y=-1.79;r.userData.life=0;rippleGroup.add(r);return r}
const splashGroup=new THREE.Group();scene.add(splashGroup);const splashMat=new THREE.MeshBasicMaterial({color:'#d9eee1',transparent:true,opacity:.8});
function splash(at){for(let i=0;i<14;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(.035+Math.random()*.025,6,5),splashMat.clone());d.position.copy(at);d.userData.vel=new THREE.Vector3((Math.random()-.5)*2,1+Math.random()*2,(Math.random()-.5)*2);d.userData.life=1;splashGroup.add(d)}}
let rippleClock=0;
function notify(text){$('notice-text').textContent=text;$('notification').classList.add('show');state.toastTimer=2.7}
function saveGame(){try{localStorage.setItem('deepwater-save',JSON.stringify({coins:state.coins,baitCounts:state.baitCounts,ownedRods:state.ownedRods,rodType:state.rodType,rod:!!state.rod,upgrades:state.upgrades,inventory:state.inventory,known:[...state.known],hours:state.hours}))}catch{}}
function updateHud(){ $('coins').textContent=state.coins;$('bait-name').textContent=baitsData[state.baitIndex].name;$('bait-count').textContent=`× ${state.baitCounts[baitsData[state.baitIndex].id]||0}`;$('bag-count').textContent=`${state.inventory.length} / 24`;$('book-count').textContent=`${String(state.known.size).padStart(2,'0')} / 200`;saveGame(); }
function setPhase(phase){state.phase=phase;$('charge-wrap').classList.toggle('visible',phase==='charging');$('tension-wrap').classList.toggle('visible',phase==='fight');if(phase==='idle'){$('cast-label').textContent='CAST';$('cast-sub').textContent='HOLD TO POWER';$('cast-glyph').textContent='⌁'}if(phase==='waiting'||phase==='casting'){$('cast-label').textContent='WAIT';$('cast-sub').textContent='WATCH THE BOBBER';$('cast-glyph').textContent='◌'}if(phase==='bite'){$('cast-label').textContent='HOOK!';$('cast-sub').textContent='TAP QUICKLY';$('cast-glyph').textContent='!'}if(phase==='fight'){$('cast-label').textContent='REEL';$('cast-sub').textContent='HOLD TO REEL';$('cast-glyph').textContent='↻'}if(phase==='landed'){$('cast-label').textContent='CAST';$('cast-sub').textContent='HOLD TO POWER';$('cast-glyph').textContent='⌁'}}
function currentBait(){return baitsData[state.baitIndex]}
function selectFish(){const bait=currentBait();const hour=state.hours%24;let pool=fishSpecies.filter(f=>!f.variant&&Math.abs(f.depth-38)<75);if(bait.tags.includes('deep'))pool=pool.filter(f=>f.depth>45);if(bait.tags.includes('bottom'))pool=pool.filter(f=>f.depth>25);if(bait.tags.includes('small'))pool=pool.filter(f=>f.maxSize<75);if(hour>19||hour<5)pool=pool.filter(f=>f.speciesIndex%3!==0);const specialChance=state.upgrades.includes('sonar')?.16:.055;const special=Math.random()<specialChance;let fish;if(special)fish=fishSpecies.filter(f=>f.variant)[Math.floor(Math.random()*100)];else fish=pool[Math.floor(Math.random()*pool.length)]||fishSpecies[0];return fish}
function lineTip(){camera.updateMatrixWorld();return new THREE.Vector3(.29,-.13,-1.9).applyMatrix4(camera.matrixWorld)}
function startCast(){if(!state.rod){notify('Pick up a rod from the rack first.');return}if(state.phase==='bite'){hookFish();return}if(state.phase==='fight'){state.reelHeld=true;return}if(state.phase!=='idle'&&state.phase!=='landed')return;const count=state.baitCounts[currentBait().id]||0;if(!count){notify('You are out of this bait. Select another.');return}state.baitCounts[currentBait().id]--;updateHud();state.charge=0;setPhase('charging')}
function stopCast(){if(state.phase==='charging'){state.castPower=Math.max(.15,state.charge);state.castStart=performance.now()/1000;state.castDuration=1.02+state.castPower*.65;const dir=new THREE.Vector3(Math.sin(state.yaw),0,-Math.cos(state.yaw));const origin=new THREE.Vector3(player.x,0,player.z);const distance=8+state.castPower*15;state.castTarget.set(origin.x+dir.x*distance,-1.72,origin.z+dir.z*distance);state.castStartPoint=lineTip();bobber.visible=true;bobber.position.copy(state.castStartPoint);splashGroup.clear();setPhase('casting');state.rodGroupBend=0;return}if(state.phase==='fight')state.reelHeld=false}
function hookFish(){state.hooked=state.pendingFish||selectFish();state.fishProgress=0;state.fightElapsed=0;state.tension=.28;state.reelHeld=false;state.fishObject=makeFish(state.hooked,Math.min(1.2,.52+state.hooked.length*.24));state.fishObject.position.copy(bobber.position);scene.add(state.fishObject);setPhase('fight');notify(`${state.hooked.name} is on! Keep the line steady.`);if(navigator.vibrate)navigator.vibrate([45,25,70])}
function createCatch(){const f=state.hooked;const size=f.minSize+Math.random()*(f.maxSize-f.minSize);const weight=f.minWeight+Math.random()*(f.maxWeight-f.minWeight);const catchData={...f,size:+size.toFixed(1),weight:+weight.toFixed(2),price:Math.round(f.price*(.76+size/f.maxSize*.45))};state.inventory.unshift(catchData);state.known.add(f.id);state.coins+=Math.floor(catchData.price*.15);$('catch-name').textContent=f.name;$('catch-rarity').textContent=`${f.rarity.toUpperCase()} CATCH`;$('catch-rarity').style.color=f.rarityColor;$('catch-size').textContent=`${catchData.size} cm`;$('catch-weight').textContent=`${catchData.weight} kg`;$('catch-price').textContent=`${catchData.price} CR`;$('catch-image').style.color=f.rarityColor;$('catch-image').textContent=f.variant?'✧':'✦';$('catch-card').classList.add('show');state.catchTimer=3.2;state.coins+=0;updateHud();setPhase('landed');if(f.rarity==='Legendary'||f.variant){notify('A once-in-a-tide catch!');if(navigator.vibrate)navigator.vibrate([80,30,140,30,220])}setTimeout(()=>{if(state.phase==='landed'){$('catch-card').classList.remove('show');state.hooked=null;state.fishObject?.parent?.remove(state.fishObject);state.fishObject=null;bobber.visible=false;fishingLine.visible=false;setPhase('idle')}},3200)}
function openPanel(type){const back=$('modal-backdrop'),content=$('modal-content');content.innerHTML='';back.classList.add('open');if(type==='shop'){
 $('modal-kicker').textContent='CAPTAIN’S LOCKER';$('modal-title').textContent='Tackle shop';const list=document.createElement('div');list.className='modal-list';
 for(const bait of baitsData){const row=document.createElement('div');row.className='shop-row';row.innerHTML=`<div class="shop-symbol">${bait.icon}</div><div class="shop-info"><b>${bait.name}</b><small>${bait.desc} · ${state.baitCounts[bait.id]||0} in hold</small></div><button class="shop-buy">${bait.price} CR · BUY</button>`;row.querySelector('button').onclick=()=>{if(state.coins>=bait.price){state.coins-=bait.price;state.baitCounts[bait.id]=(state.baitCounts[bait.id]||0)+5;notify(`5 × ${bait.name} added to your hold.`);updateHud();openPanel('shop')}else notify('Not enough credits.')};list.append(row)}
 for(const item of [...rodsData.slice(1),...upgradesData]){const isRod=rodsData.some(r=>r.id===item.id),owned=isRod?state.ownedRods.includes(item.id):state.upgrades.includes(item.id),equipped=isRod&&state.rodType===item.id;const row=document.createElement('div');row.className='shop-row';row.innerHTML=`<div class="shop-symbol">${item.id==='reel'?'◉':'⌁'}</div><div class="shop-info"><b>${item.name}</b><small>${item.desc}</small></div><button class="shop-buy" ${equipped?'disabled':''}>${equipped?'EQUIPPED':owned?'EQUIP':`${item.price} CR · BUY`}</button>`;row.querySelector('button').onclick=()=>{if(owned&&isRod){state.rodType=item.id;if(state.rod)rodGroup.visible=true;notify(`${item.name} equipped.`);updateHud();openPanel('shop');return}if(state.coins>=item.price){state.coins-=item.price;if(isRod){state.ownedRods.push(item.id);state.rodType=item.id;if(state.rod)rodGroup.visible=true}else state.upgrades.push(item.id);notify(`${item.name} purchased${isRod?' and equipped':''}.`);updateHud();openPanel('shop')}else notify('Not enough credits.')};list.append(row)}content.append(list);
 }else if(type==='inventory'){$('modal-kicker').textContent='YOUR HOLD';$('modal-title').textContent='Catch inventory';content.innerHTML=state.inventory.length?'<div class="modal-list"></div>':'<div class="modal-empty">Your hold is empty.<br>Cast out beyond the rail and see what the deep brings back.</div>';const list=content.querySelector('.modal-list');if(list)for(const f of state.inventory){const row=document.createElement('div');row.className='fish-row';row.innerHTML=`<span>✦</span><b style="color:${f.rarityColor}">${f.name}</b><small>${f.size} cm · ${f.weight} kg · ${f.price} CR</small>`;list.append(row)}}else{$('modal-kicker').textContent='FIELD NOTES';$('modal-title').textContent='The deepwater guide';const discovered=fishSpecies.filter(f=>state.known.has(f.id));content.innerHTML=discovered.length?'<div class="modal-list"></div>':'<div class="modal-empty">200 fish move through these waters.<br>Catch one to add its field notes here.</div>';const list=content.querySelector('.modal-list');if(list)for(const f of discovered){const row=document.createElement('div');row.className='fish-row';row.innerHTML=`<span>✦</span><b style="color:${f.rarityColor}">${f.name}</b><small>${f.rarity} · ${f.depth} m</small>`;list.append(row)}}}
$('modal-close').onclick=()=>$('modal-backdrop').classList.remove('open');$('modal-backdrop').addEventListener('pointerdown',e=>{if(e.target===$('modal-backdrop'))$('modal-backdrop').classList.remove('open')});document.querySelectorAll('.icon-button').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.panel)));
$('bait-button').addEventListener('click',()=>{state.baitIndex=(state.baitIndex+1)%baitsData.length;updateHud();notify(`${currentBait().name} selected.`)});
$('pickup-button').addEventListener('click',()=>pickUpRod());
function pickUpRod(){if(!state.rod){state.rod=true;if(!state.ownedRods.includes(state.rodType))state.rodType='deckhand';rodGroup.visible=true;$('hint').style.opacity='0';saveGame();notify(`${rodsData.find(r=>r.id===state.rodType)?.name||'Deckhand 20'} equipped. Find a clear patch of rail and cast.`)}else if(state.phase==='idle'){notify('Rod is ready. Hold CAST to set your power.')}}
$('cast-button').addEventListener('pointerdown',e=>{e.preventDefault();$('cast-button').classList.add('active');if(state.phase==='fight'){state.reelHeld=true;return}startCast()});$('cast-button').addEventListener('pointerup',e=>{e.preventDefault();$('cast-button').classList.remove('active');stopCast()});$('cast-button').addEventListener('pointercancel',stopCast);$('cast-button').addEventListener('contextmenu',e=>e.preventDefault());

// Mobile: independent pointer IDs let the left thumb walk while the right thumb looks.
const joystickZone=$('joystick-zone'), knob=$('joystick-knob');
joystickZone.addEventListener('pointerdown',e=>{e.preventDefault();joystickPointer=e.pointerId;try{joystickZone.setPointerCapture(e.pointerId)}catch{}updateJoystick(e)});
joystickZone.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)updateJoystick(e)});
function updateJoystick(e){const r=joystickZone.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=39,len=Math.hypot(dx,dy),scale=len>max?max/len:1;joyVector.set(dx*scale/max,-dy*scale/max);knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`}
function releaseJoystick(e){if(e.pointerId===joystickPointer){joystickPointer=null;joyVector.set(0,0);knob.style.transform='translate(0,0)'}}joystickZone.addEventListener('pointerup',releaseJoystick);joystickZone.addEventListener('pointercancel',releaseJoystick);
function isUiTarget(el){return !!el.closest('button,.joystick-zone,.game-modal,.modal-backdrop')}
window.addEventListener('pointerdown',e=>{if(isUiTarget(e.target)||e.pointerType==='touch'&&e.clientX<innerWidth*.42)return;lookPointer=e.pointerId;lastLook.set(e.clientX,e.clientY);if(e.pointerType==='mouse')mouseLook=true},{passive:true});
window.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lastLook.x,dy=e.clientY-lastLook.y;lastLook.set(e.clientX,e.clientY);state.yaw-=dx*.0032;state.pitch=Math.max(-.72,Math.min(.72,state.pitch-dy*.0027))},{passive:true});
window.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer){lookPointer=null;mouseLook=false}});window.addEventListener('pointercancel',e=>{if(e.pointerId===lookPointer)lookPointer=null});
const keys=new Set();window.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')pickUpRod();if(e.code==='Space'){e.preventDefault();if(!e.repeat)startCast()}if(e.code==='KeyR'&&state.phase==='fight')state.reelHeld=true;if(e.code==='Escape')$('modal-backdrop').classList.remove('open')});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')stopCast();if(e.code==='KeyR'&&state.phase==='fight')state.reelHeld=false});
window.addEventListener('blur',()=>{keys.clear();joyVector.set(0,0);if(state.phase==='charging')stopCast();state.reelHeld=false});

const player={x:0,z:3.2};const blockers=[{x:0,z:-8.2,rx:2.8,rz:2.5},{x:-2.45,z:1.8,rx:.75,rz:.7},{x:2.35,z:.1,rx:.75,rz:.7},{x:-2.2,z:-1.1,rx:.75,rz:.7},{x:2.3,z:-4.9,rx:.55,rz:.55},{x:-2.5,z:-5.7,rx:.55,rz:.55}];
function movementInput(){let x=joyVector.x,z=joyVector.y;if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;if(keys.has('KeyW')||keys.has('ArrowUp'))z+=1;if(keys.has('KeyS')||keys.has('ArrowDown'))z-=1;const l=Math.hypot(x,z);if(l>1){x/=l;z/=l}return new THREE.Vector2(x,z)}
function movePlayer(dt){const input=movementInput();const forward=new THREE.Vector3(Math.sin(state.yaw),0,-Math.cos(state.yaw));const right=new THREE.Vector3(Math.cos(state.yaw),0,Math.sin(state.yaw));const desired=forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x)).multiplyScalar(3.1);state.velocity.lerp(desired,1-Math.exp(-dt*5.2));player.x+=state.velocity.x*dt;player.z+=state.velocity.z*dt;player.x=THREE.MathUtils.clamp(player.x,-3.05,3.05);player.z=THREE.MathUtils.clamp(player.z,-10.65,5.25);
 for(const b of blockers){const dx=player.x-b.x,dz=player.z-b.z;if(Math.abs(dx)<b.rx+.32&&Math.abs(dz)<b.rz+.32){const ox=(b.rx+.32)-Math.abs(dx),oz=(b.rz+.32)-Math.abs(dz);if(ox<oz)player.x=b.x+Math.sign(dx||1)*(b.rx+.32);else player.z=b.z+Math.sign(dz||1)*(b.rz+.32)}}
 state.walking=input.lengthSq()>.02;state.headBob+=dt*(state.walking?10:2.1);
}
function updateCamera(){const sway=state.walking?Math.sin(state.headBob)*.035:0;const local=new THREE.Vector3(player.x,1.72+sway+Math.sin(state.boatPhase)*.07,player.z);camera.position.copy(boatRoot.localToWorld(local));const localDir=new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch),Math.sin(state.pitch),-Math.cos(state.yaw)*Math.cos(state.pitch));localDir.applyQuaternion(boatRoot.quaternion);camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position,camera.position.clone().add(localDir),new THREE.Vector3(0,1,0)));camera.updateMatrixWorld();}
let weather='CLEAR';let weatherTimer=80;let rain=[];for(let i=0;i<95;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.012,.34,.012),new THREE.MeshBasicMaterial({color:'#d6e5df',transparent:true,opacity:.28}));m.visible=false;scene.add(m);rain.push(m)}
function updateWeather(dt){weatherTimer-=dt;if(weatherTimer<=0){weatherTimer=95+Math.random()*100;weather=['CLEAR','CLOUDY','MIST','DRIZZLE','STORM'][Math.floor(Math.random()*5)];notify(weather==='CLEAR'?'The cloud bank is clearing.':weather==='MIST'?'A low fog is rolling in.':weather==='DRIZZLE'?'Fine rain on the water.':weather==='STORM'?'A squall is moving across the water.':'Cloud cover on the horizon.')}const wet=weather==='DRIZZLE'||weather==='STORM';for(const r of rain){r.visible=wet;if(wet){r.position.set(camera.position.x+(Math.random()-.5)*18,camera.position.y+2+Math.random()*5,camera.position.z-3-Math.random()*12);r.rotation.z=-.16}}if(weather==='MIST')scene.fog.density=.0024;else if(weather==='DRIZZLE')scene.fog.density=.00185;else if(weather==='STORM')scene.fog.density=.0022;else scene.fog.density=.00125;$('weather-label').textContent=`${weather} · ${String(Math.floor(state.hours)).padStart(2,'0')}:${String(Math.floor(state.hours%1*60)).padStart(2,'0')}`;}
function updateFishing(dt,time){if(state.phase==='charging'){state.charge=Math.min(1,state.charge+dt*.52*(state.rodType==='mariner'?1.08:1));$('charge-fill').style.width=`${state.charge*100}%`;$('charge-value').textContent=`${Math.round(state.charge*100)}%`;}
 if(state.phase==='casting'){const t=Math.min(1,(time-state.castStart)/state.castDuration);const start=state.castStartPoint;bobber.position.set(THREE.MathUtils.lerp(start.x,state.castTarget.x,t),THREE.MathUtils.lerp(start.y,state.castTarget.y,t)+Math.sin(t*Math.PI)*(2.2+state.castPower*2.7),THREE.MathUtils.lerp(start.z,state.castTarget.z,t));if(t>=1){bobber.position.copy(state.castTarget);splash(bobber.position.clone().add(new THREE.Vector3(0,.15,0)));state.phase='waiting';state.biteAt=time+4+Math.random()*7;state.pendingFish=selectFish();setPhase('waiting');notify('A clean cast. Watch the float.')}}
 if(state.phase==='waiting'){bobber.position.y=-1.67+Math.sin(time*2.3)*.035+Math.sin(time*5.7)*.018;if(time>state.biteAt){state.pendingFish=selectFish();state.biteAt=time+100;state.biteDeadline=time+2.8;state.biteStart=time;setPhase('bite');notify('BITE! Tap the cast button to set the hook!');if(navigator.vibrate)navigator.vibrate([60,35,90])}}
 if(state.phase==='bite'){bobber.position.y=-1.75+Math.sin(time*18)*.15;if(time>state.biteDeadline){setPhase('waiting');state.biteAt=time+6+Math.random()*6;notify('It slipped the hook. Keep watching.')}}
 if(state.phase==='fight'&&state.fishObject){const f=state.hooked;state.fightElapsed+=dt;const strength=f.strength*(state.upgrades.includes('line')?.7:1);const pull=Math.max(0,Math.sin(time*2.5+f.speciesIndex)*.5+.25);if(state.reelHeld){state.tension+=dt*(.31+strength*.12+pull*.25);state.fishProgress+=dt*(.12+(.2/strength))*(state.rodType==='mariner'?1.13:1)}else{state.tension-=dt*(.22+(state.upgrades.includes('reel')?.12:0));state.fishProgress-=dt*.012}state.tension+=Math.sin(time*1.35+f.speciesIndex)*dt*.12;state.tension=THREE.MathUtils.clamp(state.tension,.12,1.08);state.fishProgress=THREE.MathUtils.clamp(state.fishProgress,0,1.03);$('tension-fill').style.width=`${state.tension*100}%`;$('tension-value').textContent=`${Math.round(state.tension*100)}%`;
 if(state.tension>1){notify('SNAP! The fish broke your line.');if(state.fishObject)scene.remove(state.fishObject);state.fishObject=null;state.hooked=null;bobber.visible=false;fishingLine.visible=false;setPhase('idle');return}
 const p=state.fishProgress;const dx=Math.sin(time*1.8+f.speciesIndex)*(.45+strength*.35),dz=Math.cos(time*2.2+f.speciesIndex)*(.4+strength*.4);const targetX=THREE.MathUtils.lerp(state.castTarget.x,player.x+Math.sin(state.yaw)*1.8,p)+dx*(1-p);const targetZ=THREE.MathUtils.lerp(state.castTarget.z,player.z-1.6,p)+dz*(1-p);bobber.position.x=targetX;bobber.position.z=targetZ;bobber.position.y=-1.69+Math.sin(time*5)*.045;
 state.fishObject.position.set(targetX+Math.sin(time*4+f.speciesIndex)*.34,-2.5+Math.sin(time*3.1)*.18,targetZ-.65);state.fishObject.rotation.y=Math.atan2(dx,-1)+Math.sin(time*2)*.18;state.fishObject.rotation.z=Math.sin(time*7)*.12;state.fishObject.rotation.x=Math.sin(time*4)*.08;
 if(f.maxSize>80&&Math.sin(time*1.8)>.985&&p<.78){state.fishObject.position.y=-.7+Math.sin(time*8)*.9;splash(state.fishObject.position.clone());if(navigator.vibrate)navigator.vibrate(30)}
 if(p>=1){const fp=state.fishObject;fp.position.copy(camera.position).add(new THREE.Vector3(.05,-.3,-1.7).applyQuaternion(camera.quaternion));fp.scale.multiplyScalar(1.05);fp.rotation.set(.16,-.25,Math.sin(time*6)*.12);createCatch()}}
 // Rod flex and reel response.
 if(state.rod){rodGroup.rotation.z=-.08-(state.phase==='fight'?state.tension*.24:state.phase==='charging'?state.charge*.08:0);rodGroup.rotation.x=-.04-(state.phase==='fight'?state.tension*.17:0);reelHandle.rotation.z=state.reelHeld?time*12:Math.sin(time*2)*.12}
 // The live line is sampled every render frame, bowed under gravity and wind.
 const active=['casting','waiting','bite','fight'].includes(state.phase);fishingLine.visible=active&&bobber.visible;if(fishingLine.visible){const tip=lineTip();const end=state.fishObject&&state.phase==='fight'?state.fishObject.position.clone():bobber.position.clone();for(let i=0;i<20;i++){const t=i/19;const sag=Math.sin(Math.PI*t)*(.12+tip.distanceTo(end)*.025);linePositions[i*3]=THREE.MathUtils.lerp(tip.x,end.x,t);linePositions[i*3+1]=THREE.MathUtils.lerp(tip.y,end.y,t)-sag;linePositions[i*3+2]=THREE.MathUtils.lerp(tip.z,end.z,t)}lineGeometry.attributes.position.needsUpdate=true;lineGeometry.computeBoundingSphere()}
 if(bobber.visible){rippleClock+=dt;if(rippleClock>.72){makeRipple();rippleClock=0}}for(const r of rippleGroup.children){r.userData.life+=dt;r.scale.setScalar(1+r.userData.life*2.7);r.material.opacity=Math.max(0,.58-r.userData.life*.7);if(r.userData.life>1)rippleGroup.remove(r)}for(const d of splashGroup.children){d.userData.life-=dt;d.userData.vel.y-=dt*4.4;d.position.addScaledVector(d.userData.vel,dt);d.material.opacity=Math.max(0,d.userData.life);if(d.userData.life<=0)splashGroup.remove(d)}
}

// A small synthesized soundscape; audio is created only after the first user gesture.
let audioContext=null;
function playTone(frequency=440,duration=.12,type='sine',volume=.035){try{audioContext??=new AudioContext();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,audioContext.currentTime);gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration)}catch{}}

function updateEnvironment(dt,time){
  state.hours=(state.hours+dt*.022)%24;
  const h=state.hours;
  const daylight=THREE.MathUtils.clamp((Math.sin((h-6)/24*Math.PI*2)+.18)*1.25,0,1);
  const dusk=1-THREE.MathUtils.clamp(Math.abs(h-18)/5,0,1);
  const night=1-daylight;
  sun.intensity=.22+daylight*3.1;fill.intensity=.18+daylight*.88;ambient.intensity=.42+daylight*1.08;
  sun.color.setRGB(1,.66+.31*daylight,.48+.4*daylight);fill.color.set(night?0x536e91:0x8dbdc7);
  const skyDay=new THREE.Color('#a9c5c0'),skyNight=new THREE.Color('#172b45'),skyDusk=new THREE.Color('#d89b72');
  const skyColor=skyNight.clone().lerp(skyDay,daylight).lerp(skyDusk,dusk*.42);
  scene.fog.color.copy(skyColor);waterMat.uniforms.uSky.value.copy(skyColor);
  sunDisc.material.color.set(night?'#d8e2ed':'#f9dfae');sunDisc.position.y=8+daylight*100;sunDisc.scale.setScalar(weather==='STORM'?.7:1);
  boatRoot.position.y=Math.sin(time*.72)*.045+Math.sin(time*1.3)*.018;
  boatRoot.rotation.z=Math.sin(time*.48)*.012;boatRoot.rotation.x=Math.sin(time*.37+1)*.009;
  waterMat.uniforms.uTime.value=time;waterMat.uniforms.uStorm.value=weather==='STORM'?.85:weather==='DRIZZLE'?.35:0;
  cloudMat.opacity=weather==='CLEAR'?.14:weather==='CLOUDY'?.3:weather==='MIST'?.38:.5;
  clouds.position.x=Math.sin(time*.012)*10;
  for(const fish of fishShadows){fish.position.x=fish.userData.homeX+Math.sin(time*.35+fish.userData.phase)*1.7;fish.position.y=fish.userData.homeY+Math.sin(time*.8+fish.userData.phase)*.12;fish.position.z=fish.userData.baseZ+Math.cos(time*.28+fish.userData.phase)*1.6;fish.rotation.y+=dt*.04}
}

// Responsive renderer and first-person game loop.
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight)}
window.addEventListener('resize',resize,{passive:true});
window.addEventListener('beforeunload',saveGame);
let lastSave=0;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;movePlayer(dt);updateWeather(dt);updateEnvironment(dt,time);updateCamera();updateFishing(dt,time);renderer.render(scene,camera);if(time-lastSave>=15){saveGame();lastSave=time}if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)$('notification').classList.remove('show')}if(state.catchTimer>0)state.catchTimer-=dt}
updateHud();resize();updateCamera();notify('Step to the rack and pick up your rod to begin.');animate();
