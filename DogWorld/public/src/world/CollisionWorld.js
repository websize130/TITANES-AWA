// Colisiones ligeras para plataformas: terreno analítico + cajas, cilindros y rampas.
// El jugador es un cilindro vertical (pies en position.y).

export const STEP_HEIGHT = 0.4;

export class CollisionWorld {
  constructor(terrainHeight) {
    this.terrainHeight = terrainHeight; // (x, z) => y | -Infinity (vacío)
    this.boxes = [];      // { minX, minY, minZ, maxX, maxY, maxZ }
    this.cylinders = [];  // { x, z, r, minY, maxY }
    this.surfaces = [];   // { minX, maxX, minZ, maxZ, height(x, z) } rampas/puentes transitables
  }

  addBox(minX, minY, minZ, maxX, maxY, maxZ) {
    const b = { minX, minY, minZ, maxX, maxY, maxZ };
    this.boxes.push(b);
    return b;
  }

  /** Caja centrada en (x, y, z) con tamaño (w, h, d); y = base. */
  addBoxCentered(x, y, z, w, h, d) {
    return this.addBox(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2);
  }

  addCylinder(x, z, r, minY, maxY) {
    const c = { x, z, r, minY, maxY };
    this.cylinders.push(c);
    return c;
  }

  addSurface(minX, maxX, minZ, maxZ, height) {
    this.surfaces.push({ minX, maxX, minZ, maxZ, height });
  }

  /**
   * Altura del suelo más alto que el jugador puede pisar desde feetY
   * (incluye subir escalones pequeños). -Infinity si no hay suelo debajo.
   */
  groundHeight(x, z, feetY, radius) {
    const reach = feetY + STEP_HEIGHT;
    let best = -Infinity;

    const t = this.terrainHeight(x, z);
    if (t <= reach && t > best) best = t;

    const shrink = radius * 0.5; // apoyo parcial sobre bordes
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (x < b.minX - shrink || x > b.maxX + shrink || z < b.minZ - shrink || z > b.maxZ + shrink) continue;
      if (b.maxY <= reach && b.maxY > best) best = b.maxY;
    }
    for (let i = 0; i < this.cylinders.length; i++) {
      const c = this.cylinders[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const rr = c.r + shrink;
      if (dx * dx + dz * dz > rr * rr) continue;
      if (c.maxY <= reach && c.maxY > best) best = c.maxY;
    }
    for (let i = 0; i < this.surfaces.length; i++) {
      const s = this.surfaces[i];
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
      const h = s.height(x, z);
      if (h <= reach && h > best) best = h;
    }
    return best;
  }

  /** Empuja horizontalmente al jugador fuera de cajas y cilindros sólidos. Muta pos. */
  resolveHorizontal(pos, radius, height) {
    const feet = pos.y;
    const head = pos.y + height;

    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (head <= b.minY || feet >= b.maxY - STEP_HEIGHT) continue; // por encima: es suelo
      const cx = pos.x < b.minX ? b.minX : pos.x > b.maxX ? b.maxX : pos.x;
      const cz = pos.z < b.minZ ? b.minZ : pos.z > b.maxZ ? b.maxZ : pos.z;
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      } else {
        // Centro dentro de la caja: sacar por el lado más cercano.
        const left = pos.x - b.minX;
        const right = b.maxX - pos.x;
        const back = pos.z - b.minZ;
        const front = b.maxZ - pos.z;
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = b.minX - radius;
        else if (m === right) pos.x = b.maxX + radius;
        else if (m === back) pos.z = b.minZ - radius;
        else pos.z = b.maxZ + radius;
      }
    }

    for (let i = 0; i < this.cylinders.length; i++) {
      const c = this.cylinders[i];
      if (head <= c.minY || feet >= c.maxY - STEP_HEIGHT) continue;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const min = c.r + radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 1e-4;
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }

  /** Techo: altura mínima de la cara inferior de una caja sobre la cabeza. */
  ceilingHeight(x, z, headY) {
    let best = Infinity;
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (b.minY >= headY - 0.3 && b.minY < best) best = b.minY;
    }
    return best;
  }
}
