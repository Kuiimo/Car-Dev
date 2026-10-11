import * as THREE from 'https://esm.sh/three@0.160.1';
import { OrbitControls } from 'https://esm.sh/three@0.160.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.160.1/examples/jsm/loaders/GLTFLoader.js';

const holder = document.getElementById('viewer');
const status = document.getElementById('loading');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .05, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
holder.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .07;
controls.enablePan = false;
controls.minPolarAngle = .15;
controls.maxPolarAngle = Math.PI * .48;
scene.add(new THREE.HemisphereLight(0xffffff, 0xa3a3a3, 2.6));
const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-5, 9, 8); scene.add(key);
const fill = new THREE.DirectionalLight(0xe4ecff, 2); fill.position.set(7, 5, -7); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.5); rim.position.set(1, 7, 4); scene.add(rim);

new GLTFLoader().load('./silvia-s13.glb', (gltf) => {
  const car = gltf.scene;
  // The source file includes material assignments. Only the two body-paint
  // materials are recoloured; glass, rubber, lamps and trim stay original.
  car.traverse((part) => {
    if (!part.isMesh) return;
    part.castShadow = false;
    const changePaint = (material) => {
      if (!material) return material;
      if (material.name === 'body_paint' || material.name === 'body_paint2') {
        const copy = material.clone();
        copy.color.set('#e9e7df');
        copy.metalness = .27;
        copy.roughness = .25;
        return copy;
      }
      return material;
    };
    part.material = Array.isArray(part.material) ? part.material.map(changePaint) : changePaint(part.material);
  });
  // Normalize dimensions and place on floor without guessing source units.
  const bounds = new THREE.Box3().setFromObject(car);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const maxHorizontal = Math.max(size.x, size.z);
  if (!(maxHorizontal > 0)) throw new Error('The model has no usable geometry.');
  const scale = 4.55 / maxHorizontal;
  car.scale.setScalar(scale);
  car.position.set(-centre.x * scale, -bounds.min.y * scale, -centre.z * scale);
  scene.add(car);
  const finalBox = new THREE.Box3().setFromObject(car);
  const dimensions = finalBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(dimensions.x, dimensions.y, dimensions.z);
  const target = new THREE.Vector3(0, dimensions.y * .48, 0);
  controls.target.copy(target);
  camera.position.set(maxDimension * 1.05, maxDimension * .53, maxDimension * 1.35);
  controls.minDistance = maxDimension * .78;
  controls.maxDistance = maxDimension * 3.3;
  controls.update();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e9e6de', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.025; scene.add(floor);
  const contact = new THREE.Mesh(new THREE.CircleGeometry(maxDimension * .58, 64), new THREE.MeshBasicMaterial({ color: '#6b6862', transparent: true, opacity: .12, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = -.017; contact.scale.y = .72; scene.add(contact);
  status?.remove();
}, (event) => {
  if (event.total && status) status.firstChild.textContent = `LOADING MODEL ${Math.round(event.loaded / event.total * 100)}% `;
}, (error) => {
  console.error('Could not load Silvia model', error);
  if (status) status.textContent = 'MODEL COULD NOT LOAD — CHECK THAT silvia-s13.glb IS UPLOADED';
});
function resize() {
  const w = Math.max(holder.clientWidth, 1), h = Math.max(holder.clientHeight, 1);
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
}
new ResizeObserver(resize).observe(holder); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
