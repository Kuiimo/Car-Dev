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
const config={wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0,frontET:20,rearET:20,lip:'off'};
const root=new THREE.Group();scene.add(root);
let lipObject=null;
const bodyRoot=new THREE.Group();root.add(bodyRoot);
const wheelRoot=new THREE.Group();root.add(wheelRoot);
const wheelSets=[];
const factoryTireParts=[];
const HUB_X=.735, HUB_Y=.300, HUB_FRONT=-1.236, HUB_REAR=1.244;
const lipMaterial=new THREE.MeshStandardMaterial({color:0xe6e8eb,metalness:.95,roughness:.14});
const innerMaterial=new THREE.MeshStandardMaterial({color:0xb9bec4,metalness:.75,roughness:.27});
const boltMaterial=new THREE.MeshStandardMaterial({color:0xd3d7dc,metalness:.9,roughness:.21});
const faceMaterial=new THREE.MeshStandardMaterial({color:config.face,metalness:.76,roughness:.28});
const tireMaterial=new THREE.MeshStandardMaterial({color:0x111215,roughness:.97,metalness:0,side:THREE.DoubleSide});
const tireSidewall=new THREE.MeshStandardMaterial({color:0x151619,roughness:.95,side:THREE.DoubleSide});
const lipAeroMaterial=new THREE.MeshStandardMaterial({color:0x24262a,roughness:.78,side:THREE.DoubleSide});
let fittedLip=null;
// A tyre built as a true annulus, not a flat disc or a mesh taken from the GLB.
function makeTyre(){
 // Revolved, CLOSED cross-section. Axis of the wheel is X; the tyre has real
 // tread thickness, shoulders and sidewalls, with a hole for the wheel face.
 const wheel=new THREE.Group();
 const half=.112,inner=.224,outer=.326;
 const profile=[
  new THREE.Vector2(inner,-half),new THREE.Vector2(.265,-half),
  new THREE.Vector2(.300,-half+.007),new THREE.Vector2(.317,-half+.025),
  new THREE.Vector2(outer,-half+.042),new THREE.Vector2(outer,half-.042),
  new THREE.Vector2(.317,half-.025),new THREE.Vector2(.300,half-.007),
  new THREE.Vector2(.265,half),new THREE.Vector2(inner,half),
  new THREE.Vector2(inner,-half)
 ];
 const geom=new THREE.LatheGeometry(profile,96);
 // Lathe's revolution axis is Y; the Silvia's wheel axle is X.
 geom.rotateZ(-Math.PI/2);
 const tyre=new THREE.Mesh(geom,tireMaterial);wheel.add(tyre);
 // Narrow sidewall relief rings, still with a clear centre.
 for(const side of [-1,1]){
  const detail=new THREE.Mesh(new THREE.TorusGeometry(.278,.0035,8,96),tireSidewall);
  detail.rotation.y=Math.PI/2;detail.position.x=side*.114;wheel.add(detail);
 }
 return wheel;
}
// The front of this specific Silvia GLB is +Z. The previous lip was at -Z
// (the rear bumper), hence the loop shown under the exhaust in the screenshot.
function makeFittedLip(){
 const g=new THREE.Group();
 const points=[[-.81,1.95],[-.81,2.09],[-.68,2.22],[-.43,2.265],[0,2.28],[.43,2.265],[.68,2.22],[.81,2.09],[.81,1.95]];
 // A thin, continuous apron under the bumper, not a round tube.
 const verts=[],uv=[],indices=[];
 for(let i=0;i<points.length;i++){
  const [x,z]=points[i];
  for(const [y,shift] of [[.245,0],[.164,.014],[.150,.053]]){
   verts.push(x,y,z+shift);uv.push(i/(points.length-1),y);
  }
 }
 for(let i=0;i<points.length-1;i++)for(let j=0;j<2;j++){
  const a=i*3+j,b=a+3;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 g.add(new THREE.Mesh(geo,lipAeroMaterial));
 return g;
}
const loader=new GLTFLoader();
let xr4Scene;

for(const z of [HUB_FRONT,HUB_REAR])for(const x of [-HUB_X,HUB_X]){
 const pivot=new THREE.Group();pivot.position.set(x,HUB_Y,z);wheelRoot.add(pivot);
 const factory=new THREE.Group(),aftermarket=new THREE.Group();pivot.add(factory,aftermarket);
 wheelSets.push({x,z,pivot,factory,aftermarket,front:z===HUB_FRONT});
}

// The car GLB combines all four wheels into each mesh. Divide each wheel mesh
// into four individual geometries by triangle location so camber can rotate
// each corner independently. Brake discs follow their corresponding hub too.
function extractCorners(mesh,body){
 mesh.updateMatrixWorld(true);body.updateMatrixWorld(true);
 const transform=new THREE.Matrix4().copy(body.matrixWorld).invert().multiply(mesh.matrixWorld);
 const geometry=mesh.geometry.clone();geometry.applyMatrix4(transform);
 // Expand to independent triangles so each corner has self-contained geometry.
 const nonIndexed=geometry.index?geometry.toNonIndexed():geometry;
 const pos=nonIndexed.getAttribute('position');
 const corners=wheelSets.map(()=>[]);
 for(let i=0;i<pos.count;i+=3){
  const x=(pos.getX(i)+pos.getX(i+1)+pos.getX(i+2))/3;
  const z=(pos.getZ(i)+pos.getZ(i+1)+pos.getZ(i+2))/3;
  const k=wheelSets.findIndex(w=>(w.x>0)===(x>0)&&(w.z>0)===(z>0));
  if(k>=0)corners[k].push(i,i+1,i+2);
 }
 for(let k=0;k<4;k++){
  if(!corners[k].length)continue;
  const w=wheelSets[k];const g=nonIndexed.clone();g.setIndex(corners[k]);
  g.translate(-w.x,-HUB_Y,-w.z);
  const part=new THREE.Mesh(g,mesh.material);
  part.name=mesh.material?.name||mesh.name;
  if(part.name.toLowerCase().includes("wheel_tire"))factoryTireParts.push(part);
  // Tires, rims and brake components are all moved with their own hub.
  w.factory.add(part);
 }
 geometry.dispose();if(nonIndexed!==geometry)nonIndexed.dispose();mesh.visible=false;
}

// All SSR rims in the supplied collection are authored around the X axle.
// MK2/MK3 decorative centres use a Z axle and are rotated to match the lips.
// A wheel is assembled at its own origin before placement at each actual hub.
// XR4 parts are independently centred, and their two different source axes
// are normalised to the car's X wheel axle before placing on each hub.
function makeSSR(type,side){
 const wheel=new THREE.Group();
 xr4Scene.updateMatrixWorld(true);
 xr4Scene.traverse(o=>{
  if(!o.isMesh)return;
  const n=o.name.toLowerCase();
  const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);
  const bounds=new THREE.Box3().setFromBufferAttribute(g.getAttribute('position'));
  const c=bounds.getCenter(new THREE.Vector3());g.translate(-c.x,-c.y,-c.z);
  // Lip and bolts are built around Z; spokes/lugs around X.
  if(n.includes('xr4 lip'))g.rotateY(Math.PI/2);
  // Scale the 2.65-unit rim diameter to 0.54m.
  g.scale(.205,.205,.205);
  // Keep lip at outer side; face just behind the outer rim edge.
  if(n.includes('spokes')||n.includes('lugs'))g.translate(side*.04,0,0);
  const material=n.includes('chrome')?lipMaterial:n.includes('bolts')?boltMaterial:
    n.includes('spokes')?faceMaterial:innerMaterial;
  wheel.add(new THREE.Mesh(g,material));
 });
 if(side<0)wheel.rotation.y=Math.PI;
 return wheel;
}
function applySetup(){
 faceMaterial.color.set(config.face);
 bodyRoot.position.y=-config.ride/1000;
 if(fittedLip)fittedLip.visible=config.lip==='on';
 for(const w of wheelSets){
  const angle=THREE.MathUtils.degToRad(w.front?config.front:config.rear);
  // Negative camber means tops inward, on both sides.
  w.pivot.rotation.z=-Math.sign(w.x)*angle;
  // ET is positive inward. Keep the factory +20 reference at its current hub position.
  // Apply offset to the entire corner assembly so camber still pivots about its hub.
  const et=w.front?config.frontET:config.rearET;
  w.pivot.position.x=w.x+Math.sign(w.x)*(20-et)/1000;
  w.factory.visible=config.wheel==='stock';
  for(const part of w.factory.children){
   const n=part.name.toLowerCase();
   // All original tyre meshes are hidden. Only original factory rims remain in stock mode.
   part.visible=config.wheel==='stock'&&!n.includes('wheel_tire');
  }
  w.aftermarket.visible=true;
  while(w.aftermarket.children.length){
   const child=w.aftermarket.children[0];w.aftermarket.remove(child);
   child.traverse(obj=>{if(obj.geometry)obj.geometry.dispose()});
  }
  if(config.wheel!=='stock'&&xr4Scene)w.aftermarket.add(makeSSR(config.wheel,Math.sign(w.x)));
  // Every setup uses our own tyre geometry, including factory wheels.
  w.aftermarket.add(makeTyre());
 }
 $('rideOut').textContent=`−${config.ride} mm`;
 $('frontOut').textContent=`${Number(config.front).toFixed(1)}°`;
 $('rearOut').textContent=`${Number(config.rear).toFixed(1)}°`;
 $('frontETOut').textContent=`ET ${config.frontET>=0?'+':''}${config.frontET}`;
 $('rearETOut').textContent=`ET ${config.rearET>=0?'+':''}${config.rearET}`;
}
for(const id of ['wheel','face','ride','front','rear','frontET','rearET','lip'])$(id).addEventListener('input',e=>{
 config[id]=['ride','front','rear','frontET','rearET'].includes(id)?Number(e.target.value):e.target.value;
 applySetup();
});
$('reset').onclick=()=>{
 Object.assign(config,{wheel:'stock',face:'#c0c4c8',ride:0,front:0,rear:0,frontET:20,rearET:20,lip:'off'});
 for(const id of ['wheel','face','ride','front','rear','frontET','rearET','lip'])$(id).value=config[id];applySetup();
};
function panel(open){$('panel').classList.toggle('hidden',!open);document.body.classList.toggle('panel-open',open);$('toggle').setAttribute('aria-expanded',String(open))}
$('toggle').onclick=()=>panel(true);$('close').onclick=()=>panel(false);panel(innerWidth>640);

async function load(){
 try{
  const [car,ssr]=await Promise.all([loader.loadAsync('./silvia-s13.glb'),loader.loadAsync('./ssr_longchamp_xr4.glb')]);
  fittedLip=makeFittedLip();bodyRoot.add(fittedLip);
  xr4Scene=ssr.scene;
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
  root.position.set(-center.x,-center.y,-center.z);
  camera.position.set(5.2,2.6,6.4);orbit.target.set(0,0,0);orbit.update();
  applySetup();$('loading').remove();
 }catch(err){console.error(err);$('loading').textContent='Could not load model files. Check the GLBs are in the same folder.'}
}
load();
function resize(){const el=$('viewer'),w=Math.max(1,el.clientWidth),h=Math.max(1,el.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
new ResizeObserver(resize).observe($('viewer'));resize();
renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera)});
