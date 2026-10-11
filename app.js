import * as THREE from 'https://esm.sh/three@0.160.1';
import {OrbitControls} from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(37,1,.05,200);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
$('viewer').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=3.3;orbit.maxDistance=13;
scene.add(new THREE.HemisphereLight(0xffffff,0x50555d,2.8));
for(const [color,power,x,y,z] of [[0xffffff,3.6,-5,9,8],[0xe3efff,2.2,7,4,-7],[0xffffff,1.4,2,8,5]]){const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l)}
const loader=new GLTFLoader();
const config={wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0};
let body,stockWheelParts=[],stockBrakeParts=[],ssrSource=null;
const wheelGroups=[];
let mountedWheel=null;
const lipMaterial=new THREE.MeshStandardMaterial({color:0xe6e7e9,metalness:.93,roughness:.13});
const rimMaterial=new THREE.MeshStandardMaterial({color:0xa4a8ac,metalness:.84,roughness:.22});
const boltMaterial=new THREE.MeshStandardMaterial({color:0xd4d5d6,metalness:.82,roughness:.25});
const faceMaterial=new THREE.MeshStandardMaterial({color:config.face,metalness:.68,roughness:.29});
const tireMaterial=new THREE.MeshStandardMaterial({color:0x111316,roughness:.92});
const carRoot=new THREE.Group();scene.add(carRoot);
const bodyRoot=new THREE.Group();carRoot.add(bodyRoot);
const wheelRoot=new THREE.Group();carRoot.add(wheelRoot);
const WHEEL_X=.745, FRONT_Z=-1.35, REAR_Z=1.35, WHEEL_Y=.30, RADIUS=.305;
// Wheel models are component collections, not four installed wheel assemblies.
// Assemble and orient the parts into a single wheel before duplicating at each hub.
function createSSRWheel(type){
 const g=new THREE.Group();
 if(!ssrSource)return g;
 ssrSource.updateMatrixWorld(true);
 const parts=[];
 ssrSource.traverse(obj=>{
  if(!obj.isMesh)return;
  const n=obj.name.toLowerCase();
  if(type==='mk1'&& !n.includes('mk1'))return;
  if(type==='mk2'&& !n.includes('mk2')&&!n.includes('lip.002'))return;
  if(type==='mk3'&& !n.includes('mk3')&&!n.includes('lip.004'))return;
  // Skip other wheel styles that happen to mention this variant in unrelated names.
  if(type==='mk1'&&(n.includes('mk2')||n.includes('mk3')))return;
  parts.push(obj);
 });
 const centerZ=type==='mk1'?3.5:type==='mk3'?-3.5:0;
 for(const obj of parts){
  const name=obj.name.toLowerCase();
  const mesh=new THREE.Mesh(obj.geometry.clone(),faceMaterial);
  mesh.geometry.applyMatrix4(obj.matrixWorld);
  mesh.geometry.translate(0,0,-centerZ);
  const isLip=name.includes('lip')&&!name.includes('starshark');
  const isBolt=name.includes('bolt');
  const isChrome=name.includes('chrome');
  const isSilver=name.includes('silver');
  const isFace=name.includes('spokes')||name.includes('starshark');
  if(isLip)mesh.material=isChrome?lipMaterial:rimMaterial;
  else if(isBolt)mesh.material=boltMaterial;
  else if(isFace)mesh.material=isSilver?faceMaterial:faceMaterial;
  // MK2 and MK3 centre meshes were authored on the Z axis, while their lips are on X.
  if(type!=='mk1'&&isFace){
    mesh.geometry.rotateY(Math.PI/2);
    mesh.geometry.scale(1,1.63,1.63);
    mesh.geometry.translate(.65,0,0);
  }
  g.add(mesh);
 }
 // Original SSR lip is 3.5 units across; scale to ~0.61 m overall.
 g.scale.setScalar((RADIUS*2)/3.5);
 return g;
}
function makeWheelAssembly(x,z,front){
 const pivot=new THREE.Group();
 pivot.position.set(x,WHEEL_Y,z);
 wheelRoot.add(pivot);
 const turn=new THREE.Group();pivot.add(turn);
 // Wheel geometry axle along X; place the outward-facing side away from the body.
 if(x<0)turn.rotation.y=Math.PI;
 const tire=new THREE.Mesh(new THREE.TorusGeometry(RADIUS+.052,.063,13,48),tireMaterial);
 tire.rotation.y=Math.PI/2;turn.add(tire);
 const ssr=new THREE.Group();turn.add(ssr);
 const wheel={pivot,turn,ssr,x,z,front};
 wheelGroups.push(wheel);return wheel;
}
for(const z of [FRONT_Z,REAR_Z])for(const x of [-WHEEL_X,WHEEL_X])makeWheelAssembly(x,z,z===FRONT_Z);
function updateWheels(){
 if(mountedWheel!==config.wheel){
  for(const wheel of wheelGroups){
   wheel.ssr.clear();
   if(config.wheel!=='stock')wheel.ssr.add(createSSRWheel(config.wheel));
  }
  mountedWheel=config.wheel;
 }
 for(const wheel of wheelGroups){
  // Camber is rotation around vehicle longitudinal Z axis, mirrored left/right.
  // Negative degrees lean the tops inward on both sides.
  const angle=THREE.MathUtils.degToRad(wheel.front?config.front:config.rear);
  wheel.pivot.rotation.z=(wheel.x>0?-1:1)*angle;
  wheel.pivot.position.y=WHEEL_Y;
  wheel.turn.visible=config.wheel!=='stock';
 }
 for(const p of stockWheelParts)p.visible=config.wheel==='stock';
 // Keep factory tire geometry when stock; use replacement tires for SSR.
 for(const wheel of wheelGroups)wheel.turn.visible=config.wheel!=='stock';
}
function update(){
 faceMaterial.color.set(config.face);
 bodyRoot.position.y=-config.ride/1000;
 // Wheels remain at their original height, producing visible body-to-wheel lowering.
 // Body only is moved to preserve the floating-car setup.
 updateWheels();
 $('rideOut').textContent=`−${config.ride} mm`;
 $('frontOut').textContent=`${Number(config.front).toFixed(1)}°`;
 $('rearOut').textContent=`${Number(config.rear).toFixed(1)}°`;
}
for(const id of ['wheel','face','ride','front','rear'])$(id).addEventListener('input',e=>{config[id]=['ride','front','rear'].includes(id)?Number(e.target.value):e.target.value;update()});
$('reset').onclick=()=>{Object.assign(config,{wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0});for(const id of ['wheel','face','ride','front','rear'])$(id).value=config[id];update()};
function panel(open){$('panel').classList.toggle('hidden',!open);document.body.classList.toggle('panel-open',open);$('toggle').setAttribute('aria-expanded',String(open))}
$('toggle').onclick=()=>panel(true);$('close').onclick=()=>panel(false);panel(innerWidth>640);
async function load(){
 try{
  const [car,ssr]=await Promise.all([loader.loadAsync('./silvia-s13.glb'),loader.loadAsync('./ssr_collection.glb')]);
  ssrSource=ssr.scene;
  body=car.scene;
  body.traverse(part=>{
   if(!part.isMesh)return;
   const materials=Array.isArray(part.material)?part.material:[part.material];
   const names=materials.map(m=>(m?.name||'').toLowerCase());
   const paint=m=>{
    if(!m||!['body_paint','body_paint2'].includes(m.name))return m;
    const copy=m.clone();copy.color.set('#e9e7df');copy.metalness=.27;copy.roughness=.25;return copy;
   };
   part.material=Array.isArray(part.material)?part.material.map(paint):paint(part.material);
   if(names.some(n=>n.startsWith('wheel_')))stockWheelParts.push(part);
   if(names.some(n=>n.startsWith('brake_')))stockBrakeParts.push(part);
  });
  // Original model is ~4.5m long; retain native scale so SSR rims match hub spacing.
  bodyRoot.add(body);
  // The original car wheels are a combined four-wheel mesh. Hide its factory rims
  // when SSR is selected, but keep other car geometry untouched.
  const b=new THREE.Box3().setFromObject(bodyRoot),c=b.getCenter(new THREE.Vector3());
  carRoot.position.set(-c.x,-c.y,-c.z);
  camera.position.set(5.1,2.4,6.2);orbit.target.set(0,0,0);orbit.update();
  update();$('loading').remove();
 }catch(e){console.error(e);$('loading').textContent='Model failed to load — check both GLB files are uploaded.'}
}
load();
function resize(){const el=$('viewer'),w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(resize).observe($('viewer'));resize();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera)});
