import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('hero3d');
const canvas = document.getElementById('coinCanvas');
if (!container || !canvas) throw new Error('Hero 3D elements not found');

const W = container.clientWidth;
const H = container.clientHeight;

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.8;

// Scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
camera.position.set(0, 0.4, 5.0);

// ── Procedural warm HDR env (critical for metallic gold) ──
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileCubemapShader();

(() => {
  const envScene = new THREE.Scene();
  // Warm background dome
  envScene.add(Object.assign(
    new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x120800, side: THREE.BackSide }))
  ));
  // Bright warm key (upper right front)
  const key = new THREE.PointLight(0xFFD580, 300, 30); key.position.set(6, 8, 6);
  envScene.add(key);
  // Secondary warm fill
  const fill = new THREE.PointLight(0xFFB347, 100, 20); fill.position.set(-5, 3, 4);
  envScene.add(fill);
  // Cool rim from behind
  const rim = new THREE.PointLight(0xD0E8FF, 80, 20); rim.position.set(-3, -4, -7);
  envScene.add(rim);
  // Soft bottom bounce
  const bot = new THREE.PointLight(0xA05000, 30, 15); bot.position.set(0, -8, 2);
  envScene.add(bot);

  const envRT = pmrem.fromScene(envScene);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.6;
})();

// ── Direct lights for crisp highlights ───────────────────
// Hard key — creates the sharp specular streak on gold
const key = new THREE.DirectionalLight(0xFFE8A0, 5.0);
key.position.set(3, 5, 4);
scene.add(key);

// Soft front fill — lifts the face of the coin
const front = new THREE.DirectionalLight(0xFFD070, 3.0);
front.position.set(0, 1, 6);
scene.add(front);

// Warm rim from upper left
const rim = new THREE.DirectionalLight(0xFFA040, 2.0);
rim.position.set(-4, 3, -2);
scene.add(rim);

// Very soft ambient to avoid pure black shadows
scene.add(new THREE.AmbientLight(0x3a1800, 1.5));

// OrbitControls
const controls = new OrbitControls(camera, canvas);
controls.enableZoom = false;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = 2.2;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.78;

// Load model
const loader = new GLTFLoader();

loader.load(
  './game-coin.glb',
  (gltf) => {
    const coin = gltf.scene;

    // Center & fit
    const box = new THREE.Box3().setFromObject(coin);
    const center = new THREE.Vector3();
    const size   = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    coin.position.sub(center);
    coin.scale.setScalar(2.8 / Math.max(size.x, size.y, size.z));

    // Tilt to show face prominently at start
    coin.rotation.x = -0.3;

    // Force rich gold PBR on every mesh
    coin.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        // Override to gold if material looks non-metallic
        if (mat.metalness < 0.7) {
          mat.color.set(0xFFD060);
          mat.metalness = 0.97;
          mat.roughness = 0.25;
        } else {
          // Already metallic — just punch up reflectivity
          mat.metalness  = Math.max(mat.metalness, 0.92);
          mat.roughness  = Math.min(mat.roughness,  0.30);
        }
        mat.envMapIntensity = 3.0;
        mat.needsUpdate = true;
      });
    });

    scene.add(coin);
  },
  undefined,
  (err) => console.error('GLB load error:', err)
);

// Resize
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
canvas.addEventListener('pointerup',   () => { controls.autoRotate = true; });

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
