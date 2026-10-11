import * as THREE from 'https://esm.sh/three@0.160.1';
import {OrbitControls} from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';

// Bespoke, lightweight PS13-inspired model: smooth lofted bodywork, angular glasshouse,
// separate lights, trim, arch detailing, multi-piece wheels. This is NOT a scanned CAD model.
const mount=document.getElementById('viewer');
const scene=new THREE.Scene();scene.background=new THREE.Color('#f3f1eb');
const camera=new THREE.PerspectiveCamera(33,1,.1,100);camera.position.set(-8.4,3.5,7.6);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.appendChild(renderer.domElement);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.055;orbit.target.set(0,.87,0);orbit.minDistance=5.2;orbit.maxDistance=15;orbit.minPolarAngle=.13;orbit.maxPolarAngle=Math.PI*.49;orbit.enablePan=false;orbit.update();
scene.add(new THREE.HemisphereLight(0xffffff,0x90938c,2.7));
const sunlight=new THREE.DirectionalLight(0xffffff,3.5);sunlight.position.set(-4,9,7);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);sunlight.shadow.camera.left=-7;sunlight.shadow.camera.right=7;sunlight.shadow.camera.top=7;sunlight.shadow.camera.bottom=-7;sunlight.shadow.bias=-.0002;scene.add(sunlight);
const fill=new THREE.DirectionalLight(0xc3d2e5,1.4);fill.position.set(4,4,-6);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#f3f1eb',roughness:.88}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=-.025;scene.add(floor);
const contact=new THREE.Mesh(new THREE.CircleGeometry(3.2,80),new THREE.MeshBasicMaterial({color:'#6e6b62',transparent:true,opacity:.085,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.set(1,.47,1);contact.position.y=-.015;scene.add(contact);
const car=new THREE.Group();scene.add(car);
const material=(color,metalness=.1,roughness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide});
const pearl=material('#e7e6dc',.38,.22),paintShade=material('#d7d9d2',.34,.28),black=material('#15191b',.2,.57),softBlack=material('#24292c',.25,.56),rubber=material('#191a1c',.03,.9),silver=material('#b5b9ba',.86,.23),glass=material('#253b44',.36,.17),glassHighlight=material('#41565c',.38,.18),red=material('#a71b23',.18,.26),amber=material('#e39c47',.12,.26),lamp=material('#cbd7d6',.27,.19),interior=material('#22282a',.04,.9);
function mesh(g,m,parent=car){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function block(x,y,z,w,h,d,m,parent=car){const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);return o}
function poly(points,m,parent=car){const geom=new THREE.BufferGeometry(),verts=[];for(let i=1;i<points.length-1;i++)verts.push(...points[0],...points[i],...points[i+1]);geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geom.computeVertexNormals();return mesh(geom,m,parent)}
function quad(a,b,c,d,m,parent=car){return poly([a,b,c,d],m,parent)}
function strip(points,m,parent=car){for(let i=0;i<points.length-1;i++)quad(...points[i],...points[i+1],m,parent)}
function tube(points,r,m,parent=car){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*6),r,6,false),m,parent)}
function panelOutline(points,r=.008,m=softBlack){tube([...points,points[0]],r,m)}
function loft(rings,m){const v=[],indices=[];for(const ring of rings)for(const pt of ring)v.push(...pt);const n=rings[0].length;for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;indices.push(a,b,c,b,d,c)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,m)}
// X axis runs from nose (-X) to tail (+X). Real PS13 length/width proportions approximated.
// Upper body is contoured with multiple cross sections, rather than a box.
const sections=[[-2.29,.66,.76,.89],[-2.15,.72,.84,1.01],[-1.83,.75,.88,1.06],[-1.45,.76,.9,1.065],[-.95,.76,.91,1.06],[-.25,.77,.92,1.07],[.65,.76,.91,1.065],[1.35,.75,.9,1.05],[1.94,.74,.87,1.03],[2.23,.69,.81,.94],[2.31,.62,.77,.86]];
const rings=sections.map(([x,half,shoulder,top])=>[[x,.47,-half*.97],[x,.45,-half],[x,.56,-shoulder],[x,.85,-shoulder],[x,top,-shoulder*.92],[x,top,-shoulder*.55],[x,top,0],[x,top,shoulder*.55],[x,top,shoulder*.92],[x,.85,shoulder],[x,.56,shoulder],[x,.45,half],[x,.47,half*.97]]);
loft(rings,pearl);
// Wheel arches: dark wheel well surrounds, recessed beneath the smooth outer body.
for(const x of [-1.38,1.39])for(const side of [-1,1]){
 const z=side*.89;const arch=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;arch.push([x-.45*Math.cos(a),.40+.46*Math.sin(a),z+side*.024])}tube(arch,.027,paintShade);
}
// Coupe greenhouse: a low roof with distinct A/B/C pillars and a sloping rear window.
const roofSections=[[-1.04,1.055,.77],[-.52,1.48,.70],[-.31,1.58,.69],[.46,1.58,.68],[.66,1.49,.70],[1.24,1.06,.79]];
loft(roofSections.map(([x,y,z])=>[[x,y,-z],[x,y+.025,-z*.86],[x,y+.055,0],[x,y+.025,z*.86],[x,y,z]]),pearl);
// Transparent-looking windscreen and rear screen with proper sloped planes.
quad([-1.008,1.078,-.716],[-.493,1.49,-.665],[-.493,1.49,.665],[-1.008,1.078,.716],glass);
quad([.672,1.487,-.655],[1.203,1.077,-.743],[1.203,1.077,.743],[.672,1.487,.655],glass);
// Subtle reflective windshield band
quad([-.67,1.352,-.65],[-.60,1.413,-.65],[-.60,1.413,.65],[-.67,1.352,.65],glassHighlight);
for(const s of [-1,1]){
 const z=s;
 // side windows shaped into a true PS13 coupe profile
 const front=[[-.91,1.079,.807*z],[-.474,1.49,.711*z],[-.079,1.50,.712*z],[-.079,1.08,.817*z]];
 const rear=[[.002,1.50,.712*z],[.446,1.50,.713*z],[1.126,1.08,.816*z],[.002,1.08,.817*z]];
 poly(front,glass);poly(rear,glass);
 panelOutline(front,.010,black);panelOutline(rear,.010,black);
 // body line below glass, belt line and door cut
 tube([[-1.01,1.058,.836*z],[-.22,1.062,.869*z],[.65,1.06,.879*z],[1.52,1.044,.862*z]],.009,paintShade);
 tube([[.62,1.052,.89*z],[.67,.84,.91*z],[.69,.53,.91*z]],.008,paintShade);
 tube([[-.96,.57,.904*z],[-.10,.565,.94*z],[.71,.55,.927*z],[1.84,.54,.88*z]],.008,paintShade);
 // door handle and mirror
 block(.46,1.005,.91*z,.19,.025,.045,softBlack);
 const mirror=mesh(new THREE.SphereGeometry(1,16,12),pearl);mirror.position.set(-.83,1.12,.98*z);mirror.scale.set(.17,.09,.11);
 block(-.83,1.075,.89*z,.07,.05,.19,black);
 // triangular quarter-window rear side panel
 poly([[.58,1.44,.73*z],[.98,1.15,.80*z],[.71,1.16,.81*z]],glassHighlight);
 // side repeater
 block(-1.77,.84,.912*z,.115,.038,.023,amber);
}
// Sculpted front fascia, recessed rectangular fixed headlights (not 180SX popups)
block(-2.314,.805,0,.025,.28,1.52,pearl);
for(const s of [-1,1]){
 block(-2.331,.865,.47*s,.022,.135,.58,black);
 block(-2.345,.872,.47*s,.016,.106,.53,lamp);
 block(-2.353,.87,.73*s,.019,.10,.095,amber);
 block(-2.326,.665,.70*s,.023,.085,.16,amber);
 // bumper corner vents
 block(-2.345,.555,.64*s,.02,.095,.29,black);
}
block(-2.352,.793,0,.024,.07,.31,black);
block(-2.349,.532,0,.025,.065,.76,black);
block(-2.349,.635,0,.028,.10,.46,pearl);
block(-2.365,.637,0,.018,.078,.31,material('#e3e3dd',.4,.2));
// Front bumper lower lip and fog cutouts
block(-2.30,.452,0,.17,.055,1.73,paintShade);
// Rear tail lights are broad red bars with amber corners, distinct from front lamps.
block(2.321,.817,0,.024,.235,1.66,black);
for(const s of [-1,1]){
 block(2.342,.824,.47*s,.018,.195,.62,red);
 block(2.352,.829,.75*s,.018,.17,.09,amber);
 block(2.36,.78,.32*s,.015,.035,.35,material('#c3c5be',.4,.2));
}
block(2.343,.825,0,.018,.185,.29,softBlack);
block(2.35,.59,0,.04,.17,1.64,pearl);
block(2.376,.61,0,.022,.085,.38,material('#deded8',.45,.3));
block(2.355,.47,0,.14,.06,1.7,paintShade);
// Stock low-profile boot lip
block(2.02,1.034,0,.30,.047,1.61,pearl);
// Exhaust
const exhaust=mesh(new THREE.CylinderGeometry(.052,.052,.18,24),silver);exhaust.rotation.z=Math.PI/2;exhaust.position.set(2.40,.37,-.52);
// Wheel assemblies: cylindrical tyres, inset barrel, brake disc, 6-spoke factory-style alloys.
for(const x of [-1.38,1.39])for(const s of [-1,1]){
 const y=.385,z=s*.91;
 const tyre=mesh(new THREE.TorusGeometry(.333,.105,16,40),rubber);tyre.position.set(x,y,z);tyre.rotation.y=0;
 // torus lies in XY plane; wheel axle along Z
 const sidewall=mesh(new THREE.CylinderGeometry(.331,.331,.20,40),rubber);sidewall.rotation.x=Math.PI/2;sidewall.position.set(x,y,z);
 const brake=mesh(new THREE.CylinderGeometry(.247,.247,.215,40),softBlack);brake.rotation.x=Math.PI/2;brake.position.set(x,y,z+s*.02);
 const rim=mesh(new THREE.CylinderGeometry(.251,.251,.218,40),silver);rim.rotation.x=Math.PI/2;rim.position.set(x,y,z+s*.055);
 const inset=mesh(new THREE.CylinderGeometry(.218,.218,.22,40),black);inset.rotation.x=Math.PI/2;inset.position.set(x,y,z+s*.07);
 const spokeMaterial=material('#b7bcb9',.82,.25);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3;const spoke=block(x+Math.cos(a)*.116,y+Math.sin(a)*.116,z+s*.185,.205,.067,.03,spokeMaterial);spoke.rotation.z=a;
 }
 const hub=mesh(new THREE.CylinderGeometry(.061,.061,.245,20),silver);hub.rotation.x=Math.PI/2;hub.position.set(x,y,z+s*.07);
 const outer=mesh(new THREE.TorusGeometry(.246,.019,10,40),silver);outer.position.set(x,y,z+s*.185);
}
function resize(){const w=mount.clientWidth,h=mount.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);if(w<650){camera.position.set(-10.8,4.2,9.3);orbit.target.set(0,.9,0);orbit.update()}}
new ResizeObserver(resize).observe(mount);resize();
// Gentle showroom rotation until visitor interacts.
let touched=false;orbit.addEventListener('start',()=>{touched=true});
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);if(!touched)car.rotation.y+=dt*.11;orbit.update();renderer.render(scene,camera)});
document.getElementById('loading')?.remove();
