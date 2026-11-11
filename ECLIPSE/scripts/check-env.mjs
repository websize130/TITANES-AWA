// Verificación rápida del entorno: Node, dependencias e import de Three.js.
import { existsSync, readFileSync } from 'node:fs';

const pkgVersion = (name) =>
  JSON.parse(readFileSync(new URL('../node_modules/' + name + '/package.json', import.meta.url))).version;
const ok = (m) => console.log('  ✔ ' + m);
const ko = (m) => { console.log('  ✘ ' + m); process.exitCode = 1; };

console.log('ECLIPSE — comprobación del entorno');
const [major, minor] = process.versions.node.split('.').map(Number);
(major > 20 || (major === 20 && minor >= 19)) ? ok('Node ' + process.version) : ko('Node ' + process.version + ' (se requiere >= 20.19)');

for (const pkg of ['three', 'vite', 'lil-gui', '@gltf-transform/cli']) {
  try { ok(pkg + ' ' + pkgVersion(pkg)); }
  catch { ko(pkg + ' no instalado'); }
}

try {
  const THREE = await import('three');
  ok('three importa correctamente (REVISION ' + THREE.REVISION + ')');
  await import('three/addons/loaders/GLTFLoader.js');
  await import('three/addons/loaders/DRACOLoader.js');
  await import('three/addons/utils/SkeletonUtils.js');
  ok('GLTFLoader, DRACOLoader y SkeletonUtils importan correctamente');
} catch (e) { ko('Error importando three: ' + e.message); }

existsSync(new URL('../node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm', import.meta.url))
  ? ok('Decodificador DRACO local incluido en three')
  : ko('Falta el decodificador DRACO de three');
