import * as THREE from 'https://esm.sh/three@0.160.1';
import {OrbitControls} from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.05,100);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.48;
document.querySelector('#stage').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3.2;controls.maxDistance=11;
controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI-.18;
controls.target.set(0,.57,0);camera.position.set(4.6,2.05,-5.9);controls.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x3c4550,3.0));
for(const [x,y,z,power] of [[-5,8,-4,3.5],[6,6,5,2.5],[0,9,7,1.7]]){const l=new THREE.DirectionalLight(0xffffff,power);l.position.set(x,y,z);scene.add(l)}
const root=new THREE.Group();scene.add(root);
const mat=(color,metalness=0,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
const pearl=mat('#e8e7e2',.3,.24), dark=mat('#181a1c',.07,.74),rubber=mat('#101114',0,.94),sidewall=mat('#17181b',0,.89),silver=mat('#b9bfc6',.76,.27),polished=mat('#e2e5e7',.94,.13),bolt=mat('#b7bdc1',.8,.25),seatCloth=mat('#292b30',0,.88),red=mat('#a51624',.1,.42);
function mesh(geometry,material,parent=root){const o=new THREE.Mesh(geometry,material);parent.add(o);return o}
function box(x,y,z,w,h,d,m,parent=root){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o}
function cyl(radius,depth,m,parent=root,segments=48){return mesh(new THREE.CylinderGeometry(radius,radius,depth,segments),m,parent)}
function tube(points,radius,m,parent=root,closed=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal');return mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*10),radius,10,closed),m,parent)}
function shapedStrip(points,topY,bottomY,m,parent=root){const verts=[];for(const [x,z] of points)verts.push(x,topY,z,x,bottomY,z);const indices=[];for(let i=0;i<points.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,m,parent)}
// New four-corner wheel assemblies: every tyre and rim is generated together and shares a single hub pivot.
// Dimensions: 15-inch rim (381 mm diameter), 195/55 R15 tyre (nominal OD 595.5 mm).
const tyreOuter=.298, tyreInner=.194, tyreHalf=.105;
function makeTyre(parent){
 const profile=[
 [tyreInner,-tyreHalf],[.221,-tyreHalf],[.254,-.101],[.282,-.09],
 [tyreOuter,-.065],[tyreOuter,.065],[.282,.09],[.254,.101],[.221,tyreHalf],[tyreInner,tyreHalf]
 ];
 const geometry=new THREE.LatheGeometry(profile.map(([r,a])=>new THREE.Vector2(r,a)),96);
 // Lathe axis Y -> axle X
 geometry.rotateZ(-Math.PI/2);
 mesh(geometry,rubber,parent);
 for(const s of [-1,1]){
  const side=new THREE.Mesh(new THREE.RingGeometry(tyreInner+.002,.272,80),sidewall);
  side.rotation.y=Math.PI/2;side.position.x=s*(tyreHalf-.001);parent.add(side);
  const shoulder=mesh(new THREE.TorusGeometry(.276,.012,10,88),rubber,parent);
  shoulder.rotation.y=Math.PI/2;shoulder.position.x=s*.089;
 }
}
function makeMK2(parent,side){
 // Outboard face of wheel points outward, regardless of car side.
 const wheel=new THREE.Group();wheel.rotation.y=side<0?Math.PI:0;parent.add(wheel);
 // Cylindrical barrel with open centre; no solid discs covering the face.
 const barrel=mesh(new THREE.CylinderGeometry(.1905,.1905,.184,72,1,true),dark,wheel);
 barrel.rotation.z=Math.PI/2;
 for(const a of [-.086,.086]){
  const rim=mesh(new THREE.TorusGeometry(.1905,.012,12,96),polished,wheel);
  rim.rotation.y=Math.PI/2;rim.position.x=a;
 }
 const lip=mesh(new THREE.TorusGeometry(.181,.009,10,96),polished,wheel);
 lip.rotation.y=Math.PI/2;lip.position.x=.094;
 // Four wide satin-silver MK2-style spokes with small recesses.
 for(let i=0;i<4;i++){
  const angle=Math.PI/4+i*Math.PI/2;
  const group=new THREE.Group();group.rotation.x=angle;wheel.add(group);
  const spoke=box(.097,0,.095,.022,.084,.148,silver,group);
  spoke.rotation.x=-.055;
  const recess=box(.111,0,.119,.002,.029,.072,dark,group);
  recess.rotation.x=-.055;
 }
 const hub=cyl(.055,.035,silver,wheel);hub.rotation.z=Math.PI/2;hub.position.x=.113;
 const cap=cyl(.027,.037,polished,wheel);cap.rotation.z=Math.PI/2;cap.position.x=.135;
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2;const lug=cyl(.009,.012,bolt,wheel,16);lug.rotation.z=Math.PI/2;lug.position.set(.135,Math.cos(a)*.049,Math.sin(a)*.049);
 }
 for(let i=0;i<24;i++){
  const a=i*Math.PI/12;const fastener=cyl(.0034,.008,bolt,wheel,8);fastener.rotation.z=Math.PI/2;fastener.position.set(.104,Math.cos(a)*.172,Math.sin(a)*.172);
 }
}
const hubs=[];
for(const front of [true,false])for(const side of [-1,1]){
 const hub=new THREE.Group();hub.position.set(side*.755,.298,front?-1.355:1.355);root.add(hub);
 const wheel=new THREE.Group();hub.add(wheel);
 makeTyre(wheel);makeMK2(wheel,side);
 // Low street stance with mild negative camber and near-flush ET, visually approximate.
 hub.rotation.z=side*(front?-.022:-.032);
 hubs.push(hub);
}
// Chuki-inspired side skirts, aligned to the shell's side sills.
for(const side of [-1,1]){
 const pts=[[-1.02,.195],[-.75,.17],[-.05,.16],[.75,.16],[1.08,.19]];
 const p=pts.map(([z,y])=>[side*.79,z]);
 shapedStrip(p,.235,.15,pearl);
 tube([[side*.80,.17,-1.05],[side*.83,.145,-.8],[side*.83,.145,.75],[side*.80,.17,1.08]],.016,pearl);
 // Nismo-style rear bumper corner pods, body-coloured with a dark lower edge.
 const pod=box(side*.77,.235,2.05,.16,.135,.29,pearl);
 pod.rotation.y=side*.14;
 tube([[side*.69,.16,1.90],[side*.83,.15,2.03],[side*.83,.15,2.19]],.017,dark);
}
// 180SX Pignose-inspired lower lip adapted to OEM Silvia bumper. Intentionally an interpretation,
// not a mechanically verified direct copy of a particular moulding.
const lipPts=[[-.82,-2.00],[-.85,-2.105],[-.77,-2.19],[-.50,-2.24],[0,-2.25],[.50,-2.24],[.77,-2.19],[.85,-2.105],[.82,-2.00]];
shapedStrip(lipPts,.215,.125,dark);
tube(lipPts.map(([x,z])=>[x,.128,z]),.012,dark);
// B-Wave / Pro Shop Wave-inspired rear wing, custom-made in the correct rear location.
for(const side of [-1,1]){
 const support=box(side*.48,.76,1.86,.065,.17,.13,dark);support.rotation.x=-.12;
 const endplate=box(side*.69,.88,1.98,.027,.11,.33,pearl);endplate.rotation.x=-.07;
}
const wing=box(0,.91,1.98,1.41,.056,.34,pearl);wing.rotation.x=-.07;
tube([[-.70,.89,2.14],[-.4,.89,2.15],[0,.89,2.16],[.4,.89,2.15],[.70,.89,2.14]],.016,dark);
// Dual polished exhaust tips, exiting rear LEFT. The Silvia's +Z end is the rear.
for(const x of [-.58,-.45]){
 const pipe=cyl(.031,.18,polished);pipe.rotation.x=Math.PI/2;pipe.position.set(x,.235,2.25);
 const darkBore=cyl(.024,.002,dark);darkBore.rotation.x=Math.PI/2;darkBore.position.set(x,.235,2.345);
 const inner=cyl(.018,.003,mat('#080909'));inner.rotation.x=Math.PI/2;inner.position.set(x,.235,2.348);
}
// Recaro SR3-inspired seats: sculpted bucket backs, contrasting cloth centre, red shoulder badges.
for(const side of [-1,1]){
 const chair=new THREE.Group();chair.position.set(side*.34,.42,-.16);root.add(chair);
 const back=box(0,.31,.12,.38,.62,.12,seatCloth,chair);back.rotation.x=-.13;
 const insert=box(0,.31,.053,.24,.42,.008,mat('#373a40'),chair);insert.rotation.x=-.13;
 box(0,.61,.043,.20,.035,.011,red,chair);
 const cushion=box(0,-.07,-.12,.38,.11,.45,seatCloth,chair);
 for(const s of [-1,1])box(s*.19,.26,.07,.085,.44,.15,seatCloth,chair);
}
// Accurate base shell supplied by the user; hide original wheels, brakes and exhaust so the new components cannot overlap.
new GLTFLoader().load('./silvia-shell.glb',gltf=>{
 const shell=gltf.scene;
 shell.traverse(obj=>{
  if(!obj.isMesh)return;
  const n=Array.isArray(obj.material)?obj.material.map(m=>m.name||'').join(' ').toLowerCase():(obj.material?.name||'').toLowerCase();
  if(/wheel_|brake_disc|exh_chrome/.test(n)){obj.visible=false;return;}
  if(n==='body_paint'||n==='body_paint2'){
   obj.material=pearl;
  }
 });
 root.add(shell);
 document.querySelector('#loading').remove();
},undefined,err=>{console.error(err);document.querySelector('#loading').textContent='Could not load Silvia shell. Check that silvia-shell.glb was uploaded.'});
function resize(){const el=document.querySelector('#stage');const w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(resize).observe(document.querySelector('#stage'));resize();
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
