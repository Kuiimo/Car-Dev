import * as THREE from 'https://esm.sh/three@0.160.1';
import {OrbitControls} from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(38,1,.05,100);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
$('viewer').appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);
orbit.enableDamping=true;orbit.enablePan=false;orbit.minDistance=3;orbit.maxDistance=12;
scene.add(new THREE.HemisphereLight(0xffffff,0x4c545e,2.8));
for(const [color,power,x,y,z] of [[0xffffff,3.2,-5,9,8],[0xdcecff,2.1,7,4,-7]]){
 const light=new THREE.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
}
const config={wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0,lip:'off'};
const root=new THREE.Group();root.rotation.x=-Math.PI/2;scene.add(root);
let lipObject=null;
const bodyRoot=new THREE.Group();root.add(bodyRoot);
const wheelRoot=new THREE.Group();root.add(wheelRoot);
const wheelSets=[];
const HUB_X=.735, HUB_Z=.300, HUB_FRONT=-1.236, HUB_REAR=1.244;
const lipMaterial=new THREE.MeshStandardMaterial({color:0xe6e8eb,metalness:.95,roughness:.14});
const innerMaterial=new THREE.MeshStandardMaterial({color:0xb9bec4,metalness:.75,roughness:.27});
const boltMaterial=new THREE.MeshStandardMaterial({color:0xd3d7dc,metalness:.9,roughness:.21});
const faceMaterial=new THREE.MeshStandardMaterial({color:config.face,metalness:.76,roughness:.28});
const tireMaterial=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.94});
const loader=new GLTFLoader();
let ssrScene;

for(const y of [HUB_FRONT,HUB_REAR])for(const x of [-HUB_X,HUB_X]){
 const pivot=new THREE.Group();pivot.position.set(x,y,HUB_Z);wheelRoot.add(pivot);
 const factory=new THREE.Group(),aftermarket=new THREE.Group();pivot.add(factory,aftermarket);
 wheelSets.push({x,y,pivot,factory,aftermarket,front:y===HUB_FRONT});
}

// The car GLB combines all four wheels into each mesh. Divide each wheel mesh
// into four individual geometries by triangle location so camber can rotate
// each corner independently. Brake discs follow their corresponding hub too.
function extractCorners(mesh,body){
 mesh.updateMatrixWorld(true);body.updateMatrixWorld(true);
 const transform=new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(mesh.matrixWorld);
 const geometry=mesh.geometry.clone();geometry.applyMatrix4(transform);
 const pos=geometry.getAttribute('position');
 const index=geometry.getIndex();const n=index?index.count:pos.count;
 const buckets=wheelSets.map(()=>[]);
 for(let i=0;i<n;i+=3){
  const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;
  const x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
  const y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3;
  const corner=wheelSets.findIndex(w=>(w.x>0)===(x>0)&&(w.y>0)===(y>0));
  if(corner>=0)buckets[corner].push(a,b,c);
 }
 buckets.forEach((triangles,i)=>{
  if(!triangles.length)return;
  const g=geometry.clone();g.setIndex(triangles);
  const w=wheelSets[i];g.translate(-w.x,-w.y,-HUB_Z);
  const part=new THREE.Mesh(g,mesh.material);
  part.name=mesh.name;w.factory.add(part);
 });
 geometry.dispose();mesh.visible=false;
}

// All SSR rims in the supplied collection are authored around the X axle.
// MK2/MK3 decorative centres use a Z axle and are rotated to match the lips.
// A wheel is assembled at its own origin before placement at each actual hub.
function makeSSR(type,side){
 const wheel=new THREE.Group();
 const matching=[];
 ssrScene.updateMatrixWorld(true);
 ssrScene.traverse(o=>{
  if(!o.isMesh)return;
  const name=o.name.toLowerCase();
  const exactLip=name.startsWith(`${type} lip`);
  const exactCenter=type==='mk1'?name.startsWith('mk1 spokes'):name.startsWith(`starshark lip.${type==='mk2'?'002':'004'}`);
  if(exactLip||exactCenter)matching.push({o,name,center:exactCenter});
 });
 for(const {o,name,center} of matching){
  const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  // Meshes in the collection are already at local wheel origins (their scene
  // transforms contain the offsets between displayed sample wheels).
  const bounds=new THREE.Box3().setFromBufferAttribute(g.getAttribute('position'));
  const middle=bounds.getCenter(new THREE.Vector3());
  g.translate(-middle.x,-middle.y,-middle.z);
  if(center&&type!=='mk1'){
   g.rotateY(Math.PI/2);
   g.scale(1,1.92,1.92);
  }else if(center&&type==='mk1')g.scale(1,1.32,1.32);
  // Scale lip diameter from 3.5 source units to 0.60 m and limit dish depth.
  g.scale(.095,.172,.172);
  if(center)g.translate(side*.055,0,0);
  let material=faceMaterial;
  if(name.includes('bolts'))material=boltMaterial;
  else if(name.includes('chrome'))material=lipMaterial;
  else if(name.includes('lip')&&!center)material=innerMaterial;
  // Keep only the actual face colourable; lips and bolts are untouched.
  const part=new THREE.Mesh(g,material);
  wheel.add(part);
 }
 // Original parts face outwards on +X. Flip only the left-hand wheels.
 if(side<0)wheel.rotation.y=Math.PI;
 const tire=new THREE.Mesh(new THREE.TorusGeometry(.252,.050,16,64),tireMaterial);
 tire.rotation.y=Math.PI/2;wheel.add(tire);
 return wheel;
}
function applySetup(){
 faceMaterial.color.set(config.face);
 bodyRoot.position.z=-config.ride/1000;
 if(lipObject)lipObject.visible=config.lip==='on';
 for(const w of wheelSets){
  const angle=THREE.MathUtils.degToRad(w.front?config.front:config.rear);
  // Negative camber means tops inward, on both sides.
  w.pivot.rotation.y=Math.sign(w.x)*angle;
  w.factory.visible=config.wheel==='stock';
  w.aftermarket.visible=config.wheel!=='stock';
  while(w.aftermarket.children.length){
   const child=w.aftermarket.children[0];w.aftermarket.remove(child);
   child.traverse(obj=>{if(obj.geometry)obj.geometry.dispose()});
  }
  if(config.wheel!=='stock'&&ssrScene)w.aftermarket.add(makeSSR(config.wheel,Math.sign(w.x)));
 }
 $('rideOut').textContent=`−${config.ride} mm`;
 $('frontOut').textContent=`${Number(config.front).toFixed(1)}°`;
 $('rearOut').textContent=`${Number(config.rear).toFixed(1)}°`;
}
for(const id of ['wheel','face','ride','front','rear','lip'])$(id).addEventListener('input',e=>{
 config[id]=['ride','front','rear'].includes(id)?Number(e.target.value):e.target.value;
 applySetup();
});
$('reset').onclick=()=>{
 Object.assign(config,{wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0,lip:'off'});
 for(const id of ['wheel','face','ride','front','rear','lip'])$(id).value=config[id];applySetup();
};
function panel(open){$('panel').classList.toggle('hidden',!open);document.body.classList.toggle('panel-open',open);$('toggle').setAttribute('aria-expanded',String(open))}
$('toggle').onclick=()=>panel(true);$('close').onclick=()=>panel(false);panel(innerWidth>640);

async function load(){
 try{
  const [car,ssr,lip]=await Promise.all([loader.loadAsync('./silvia-s13.glb'),loader.loadAsync('./ssr_collection.glb'),loader.loadAsync('./180sx-front-lip.glb')]);
  lipObject=lip.scene;
  // Lip GLB was exported in a Y-up coordinate frame. Convert into car's Z-up frame.
  lipObject.rotation.x=Math.PI/2;
  // The lip's front-to-back axis in the source asset maps to the car's longitudinal Y.
  lipObject.position.set(0,-.06,0);
  bodyRoot.add(lipObject);
  ssrScene=ssr.scene;
  const body=car.scene;body.updateMatrixWorld(true);
  const wheels=[];
  body.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   const names=mats.map(m=>(m?.name||'').toLowerCase());
   if(names.some(n=>n.startsWith('wheel_')||n.startsWith('brake_'))){wheels.push(mesh);return}
   const paint=m=>{
    if(!m||!['body_paint','body_paint2'].includes(m.name))return m;
    const copy=m.clone();copy.color.set('#eae8df');copy.metalness=.3;copy.roughness=.26;return copy;
   };
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(paint):paint(mesh.material);
  });
  for(const mesh of wheels)extractCorners(mesh,body);
  bodyRoot.add(body);
  // Centre on body dimensions, not wheel bounds. Both body and wheel groups
  // receive the same root transform and remain correctly aligned.
  const box=new THREE.Box3().setFromObject(body);
  const center=box.getCenter(new THREE.Vector3());
  // Centre the source model before applying its Z-up to Y-up conversion.
  root.position.set(-center.x,center.z,-center.y);
  camera.position.set(5.2,2.6,6.4);orbit.target.set(0,0,0);orbit.update();
  applySetup();$('loading').remove();
 }catch(err){console.error(err);$('loading').textContent='Could not load model files. Check the GLBs are in the same folder.'}
}
load();
function resize(){const el=$('viewer'),w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(resize).observe($('viewer'));resize();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera)});
