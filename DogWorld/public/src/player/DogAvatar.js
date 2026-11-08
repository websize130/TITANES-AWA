// Avatar de perro por raza: modelo paramétrico + locomoción + gestos de personalidad.
// Lo usan el jugador local, los jugadores remotos y la vista 3D de selección.
import * as THREE from 'three';
import { ANIM } from '../net/protocol.js';
import { getBreed } from '../breeds/BreedData.js';
import { buildDogModel, disposeDogModel } from '../breeds/DogModel.js';
import { GESTURES, resetPose, poseIdle, poseRun, poseAir } from '../breeds/DogPoses.js';
import { attachCosmetics, animateCosmetics } from '../cosmetics/CosmeticModels.js';
import { ModelLibrary } from '../core/ModelLibrary.js';

const _v = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class DogAvatar {
  /** fx: instancia de Effects compartida por todos los avatares de una escena. */
  constructor(breedId, fx = null) {
    this.breed = getBreed(breedId);
    this.fx = fx;
    // Modelo profesional (GLB) si existe en /assets/models; si no, el procedural.
    this.glb = ModelLibrary.instantiate('dog', this.breed.id);
    this.model = this.glb ? glbDogAdapter(this.glb, this.breed) : buildDogModel(this.breed);
    this.root = this.model.root;
    this.height = this.model.height;
    this.anim = ANIM.IDLE;
    this.speed01 = 0;
    this.phase = 0;
    this.time = 0;
    this.gestureTime = 0;
    this.gestureName = null;
    this.carrying = false;
    this.label = null;
    this.cosmetics = [];
    this.cosmeticSet = {};

    // Contexto para los gestos (sin asignaciones por frame).
    const self = this;
    this._timers = Object.create(null);
    this.ctx = {
      prop: null,
      propBaseY: 0,
      every(key, interval) {
        const last = self._timers[key] ?? -1e9;
        if (self.gestureTime - last >= interval || self.gestureTime < last) {
          self._timers[key] = self.gestureTime;
          return true;
        }
        return false;
      },
      emit(type, where) { self.emitAt(type, where); },
    };
  }

  /** Reproduce un gesto concreto (vista de selección). */
  setGesture(name) {
    if (this.gestureName !== name) {
      this.gestureName = name;
      this.gestureTime = 0;
      for (const k in this._timers) delete this._timers[k];
    }
  }

  emitAt(type, where) {
    if (!this.fx) return;
    const md = this.model;
    let dir = null;
    switch (where) {
      case 'mouth': case 'nose':
        md.head.localToWorld(_v.copy(md.mouthOffset));
        md.head.getWorldQuaternion(_q);
        dir = _d.set(0, -0.1, 1).applyQuaternion(_q).normalize();
        break;
      case 'head':
        md.head.getWorldPosition(_v);
        _v.y += 0.45 * this.breed.stats.scale;
        break;
      case 'frontPaws':
        md.legs.fl.getWorldPosition(_v);
        _v.y -= md.legLen * this.breed.stats.scale;
        this.root.getWorldQuaternion(_q);
        dir = _d.set(0, 0.8, 1).applyQuaternion(_q).normalize();
        break;
      case 'backPaw':
        md.legs.br.getWorldPosition(_v);
        _v.y -= md.legLen * this.breed.stats.scale * 0.8;
        this.root.getWorldQuaternion(_q);
        dir = _d.set(0, 0.5, 1).applyQuaternion(_q).normalize();
        break;
      default: // back
        md.pelvis.getWorldPosition(_v);
        this.root.getWorldQuaternion(_q);
        dir = _d.set(0, 0, 1).applyQuaternion(_q).normalize();
    }
    this.fx.emit(type, _v.x, _v.y, _v.z, dir);
  }

  /** Equipa accesorios { head, eyes, neck, back } (ids del catálogo). */
  setCosmetics(equipped) {
    for (const h of this.cosmetics) h.parent?.remove(h);
    this.cosmeticSet = { ...(equipped || {}) };
    this.cosmetics = attachCosmetics(this.model, this.breed, this.cosmeticSet);
  }

  /** Ladrido rápido (efecto + boca). */
  bark() {
    this.barkTimer = 0.3;
    this.emitAt('bark', 'mouth');
  }

  /**
   * anim: estado de red; speed01: velocidad normalizada; groundGap: altura sobre el suelo.
   */
  update(dt, anim, speed01, groundGap = 0) {
    if (this.glb) {
      this.updateGlb(dt, anim, speed01, groundGap);
      return;
    }
    const md = this.model;
    this.time += dt;
    this.speed01 += (speed01 - this.speed01) * Math.min(1, dt * 10);
    if (anim === ANIM.RUN) this.phase += dt * (8 + this.speed01 * 9) / Math.sqrt(this.breed.stats.scale);

    resetPose(md);

    let gesture = null;
    if (anim === ANIM.EMOTE) gesture = this.breed.gesture;
    else if (anim === ANIM.ACTION) gesture = this.breed.ability.anim;
    else if (this.gestureName && anim === -1) gesture = this.gestureName; // modo vista previa

    if (gesture) {
      if (gesture !== this.gestureName || anim !== this.anim) this.setGesture(gesture);
      this.gestureTime += dt;
      GESTURES[gesture]?.(md, this.gestureTime, this.ctx);
    } else {
      if (this.anim === ANIM.EMOTE || this.anim === ANIM.ACTION) this.gestureName = null;
      if (anim === ANIM.RUN) poseRun(md, this.time, this.phase, this.speed01);
      else if (anim === ANIM.JUMP || anim === ANIM.FALL) poseAir(md, anim === ANIM.JUMP);
      else poseIdle(md, this.time);
      if (this.carrying) GESTURES.goliathCarry(md);
    }
    this.anim = anim;
    if (this.cosmetics.length) animateCosmetics(this.cosmetics, this.time, this.speed01);

    if (this.barkTimer > 0) {
      this.barkTimer -= dt;
      md.jaw.rotation.x = 0.6;
      md.head.rotation.x -= 0.25;
    }

    // Sombra de contacto.
    const k = THREE.MathUtils.clamp(1 - groundGap / 6, 0.2, 1);
    md.blob.position.y = -groundGap / this.breed.stats.scale + 0.03;
    md.blob.scale.setScalar(k);
    md.blob.material.opacity = 0.28 * k;
    md.blob.visible = Number.isFinite(groundGap) && groundGap < 12;
  }

  setName(name) {
    if (this.label) {
      this.root.remove(this.label);
      this.label.material.map.dispose();
      this.label.material.dispose();
    }
    this.label = makeNameLabel(name, this.breed.accent);
    this.label.position.y = this.height / this.breed.stats.scale + 0.45;
    this.label.scale.multiplyScalar(1 / this.breed.stats.scale);
    this.root.add(this.label);
  }

  /** Animación por clips para modelos GLB (idle/run/jump/fall/emote/action). */
  updateGlb(dt, anim, speed01, groundGap) {
    const g = this.glb;
    this.time += dt;
    this.speed01 += (speed01 - this.speed01) * Math.min(1, dt * 10);
    const want = anim === ANIM.RUN ? 'run'
      : anim === ANIM.JUMP ? 'jump'
        : anim === ANIM.FALL ? (g.actions.fall ? 'fall' : 'jump')
          : anim === ANIM.EMOTE ? 'emote'
            : anim === ANIM.ACTION ? (g.actions.action ? 'action' : 'emote')
              : anim === -1 ? 'emote' : 'idle';
    if (!g.play(want)) g.play('idle');
    if (g.actions.run) g.actions.run.timeScale = 0.6 + this.speed01 * 0.8;
    g.mixer.update(dt);
    this.anim = anim;
    if (this.cosmetics.length) animateCosmetics(this.cosmetics, this.time, this.speed01);
    const md = this.model;
    const k = THREE.MathUtils.clamp(1 - groundGap / 6, 0.2, 1);
    md.blob.position.y = -groundGap + 0.03;
    md.blob.scale.setScalar(k);
    md.blob.material.opacity = 0.28 * k;
    md.blob.visible = Number.isFinite(groundGap) && groundGap < 12;
  }

  dispose() {
    if (this.label) {
      this.label.material.map.dispose();
      this.label.material.dispose();
    }
    if (this.glb) this.glb.mixer.stopAllAction();
    else disposeDogModel(this.model);
  }
}

function makeNameLabel(name, accent) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px system-ui, sans-serif';
  const w = Math.min(240, g.measureText(name).width + 34);
  g.fillStyle = 'rgba(30,14,58,0.65)';
  g.beginPath();
  g.roundRect((256 - w) / 2, 10, w, 44, 22);
  g.fill();
  g.fillStyle = accent;
  g.beginPath();
  g.arc((256 - w) / 2 + 16, 32, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 128 + 6, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sprite.scale.set(2, 0.5, 1);
  sprite.renderOrder = 2;
  return sprite;
}

/**
 * Adapta un modelo GLB a la interfaz del modelo procedural (cabeza, pecho, pelvis…)
 * para que efectos y accesorios sigan funcionando.
 */
function glbDogAdapter(glb, breed) {
  const root = glb.root;
  const head = glb.bone('head') ?? root;
  const chest = glb.bone('chest') ?? glb.bone('spine') ?? root;
  const pelvis = glb.bone('pelvis') ?? glb.bone('hips') ?? root;
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.5 * breed.stats.scale, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }));
  blob.position.y = 0.03;
  blob.renderOrder = 1;
  root.add(blob);
  const dummy = new THREE.Object3D();
  return {
    root, rig: root, pelvis, chest, head, jaw: dummy, tongue: dummy, ears: [], blob,
    legs: { fl: chest, fr: chest, bl: pelvis, br: pelvis },
    legLen: 0.3, hipY: 0.5, mats: {}, mouthOffset: new THREE.Vector3(0, 0, 0.3),
    height: glb.height || 1,
  };
}
