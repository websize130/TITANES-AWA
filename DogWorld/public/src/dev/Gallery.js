// Galería de personajes: muestra un perro o NPC aislado con buena iluminación.
// /galeria.html?dog=rufus · ?npc=isabel · &anim=idle|run|gesture · &q=low|medium|high · &yaw=0.6
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BREEDS } from '../breeds/BreedData.js';
import { NPCS } from '../npcs/NpcData.js';
import { DogAvatar } from '../player/DogAvatar.js';
import { NpcCharacter } from '../npcs/NpcModel.js';
import { setFurQuality } from '../world/Fur.js';
import { windUniforms } from '../world/Wind.js';
import { ANIM } from '../net/protocol.js';
import { ModelLibrary } from '../core/ModelLibrary.js';

const params = new URLSearchParams(location.search);
await ModelLibrary.load();
setFurQuality(params.get('q') || 'high');
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight('#dcecff', '#7aa04a', 0.9));
const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
scene.add(sun);
const rim = new THREE.DirectionalLight('#c9a0ff', 1.4);
rim.position.set(-4, 3, -4);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8fd14c', roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

const nav = document.getElementById('nav');
for (const b of BREEDS) nav.insertAdjacentHTML('beforeend', `<a href="?dog=${b.id}" class="${params.get('dog') === b.id ? 'on' : ''}">🐶 ${b.name}</a>`);
for (const n of NPCS) nav.insertAdjacentHTML('beforeend', `<a href="?npc=${n.id}" class="${params.get('npc') === n.id ? 'on' : ''}">${n.portrait} ${n.name}</a>`);

let subject;
let height;
const npcId = params.get('npc');
if (npcId) {
  subject = new NpcCharacter(NPCS.find((n) => n.id === npcId) || NPCS[0]);
  height = 2.3;
} else {
  subject = new DogAvatar(params.get('dog') || 'rufus');
  height = subject.height;
  const g = { gesture: subject.breed.gesture };
  if (params.get('anim') === 'gesture') subject.setGesture(g.gesture);
}
scene.add(subject.root);
subject.root.rotation.y = Number(params.get('yaw') ?? 0.55);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
const clock = new THREE.Clock();
let t = 0;
const anim = params.get('anim') || 'idle';
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  windUniforms.uTime.value = t;
  if (subject.update && subject.breed) {
    const a = anim === 'run' ? ANIM.RUN : anim === 'gesture' ? -1 : ANIM.IDLE;
    subject.update(dt, a, anim === 'run' ? 1 : 0, 0);
  } else {
    subject.update(dt, null, null);
  }
  const d = height * 2.2 + 0.6;
  camera.position.set(0, height * 0.62, d);
  camera.lookAt(0, height * 0.48, 0);
  renderer.render(scene, camera);
});
window.gallery = { renderer, subject };
