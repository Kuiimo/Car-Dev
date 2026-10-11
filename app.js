import * as THREE from 'https://esm.sh/three@0.160.1';
import { OrbitControls } from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const holder = document.getElementById('viewer');
const status = document.getElementById('loading');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(37, 1, .05, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.setClearColor(0x000000, 0);
holder.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.enablePan = false;
controls.minPolarAngle = .05;
controls.maxPolarAngle = Math.PI - .05;
scene.add(new THREE.HemisphereLight(0xffffff, 0x555960, 2.7));
const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(-5, 9, 8); scene.add(key);
const fill = new THREE.DirectionalLight(0xdce8ff, 2.1); fill.position.set(7, 4, -7); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.6); rim.position.set(2, 8, 5); scene.add(rim);

new GLTFLoader().load('./silvia-s13.glb', gltf => {
  const car = gltf.scene;
  car.traverse(part => {
    if (!part.isMesh) return;
    const pearl = material => {
      if (!material || !['body_paint', 'body_paint2'].includes(material.name)) return material;
      const copy = material.clone();
      copy.color.set('#e9e7df');
      copy.metalness = .27;
      copy.roughness = .25;
      return copy;
    };
    part.material = Array.isArray(part.material) ? part.material.map(pearl) : pearl(part.material);
  });
  const bounds = new THREE.Box3().setFromObject(car);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const longest = Math.max(size.x, size.z);
  if (!Number.isFinite(longest) || longest <= 0) throw new Error('Invalid 3D geometry');
  const scale = 4.55 / longest;
  car.scale.setScalar(scale);
  // Centre the car in open space, with no ground or shadow beneath it.
  car.position.set(-centre.x * scale, -centre.y * scale, -centre.z * scale);
  scene.add(car);
  const radius = 4.55;
  controls.target.set(0, 0, 0);
  camera.position.set(radius * 1.05, radius * .48, radius * 1.25);
  controls.minDistance = radius * .7;
  controls.maxDistance = radius * 3.3;
  controls.update();
  status?.remove();
}, event => {
  if (status && event.total) status.textContent = `Loading 3D model… ${Math.round(event.loaded / event.total * 100)}%`;
}, error => {
  console.error(error);
  if (status) status.textContent = 'Could not load silvia-s13.glb';
});
function resize(){
  const w=Math.max(holder.clientWidth,1), h=Math.max(holder.clientHeight,1);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(holder);
resize();
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera)});
