// Pool denso sin asignaciones en caliente: los vivos ocupan [0, n). kill(i) intercambia con el último.
// Iterar SIEMPRE de n-1 a 0 cuando se pueda matar dentro del bucle.
export class Pool {
  constructor(make, cap) {
    this.items = new Array(cap);
    for (let i = 0; i < cap; i++) this.items[i] = make();
    this.n = 0;
  }
  get() {
    if (this.n >= this.items.length) return null;
    return this.items[this.n++];
  }
  kill(i) {
    const last = --this.n;
    if (i !== last) { const t = this.items[i]; this.items[i] = this.items[last]; this.items[last] = t; }
  }
  clear() { this.n = 0; }
}

// Rejilla espacial fija sobre el mundo para consultas de colisión (enemigos).
export class Grid {
  constructor(half, cell) {
    this.half = half; this.cell = cell;
    this.cols = Math.ceil((half * 2) / cell) + 2;
    this.cells = new Array(this.cols * this.cols);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
    this.used = [];
  }
  clear() {
    for (let i = 0; i < this.used.length; i++) this.cells[this.used[i]].length = 0;
    this.used.length = 0;
  }
  idx(x, y) {
    let cx = ((x + this.half) / this.cell) | 0, cy = ((y + this.half) / this.cell) | 0;
    if (cx < 0) cx = 0; else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0; else if (cy >= this.cols) cy = this.cols - 1;
    return cy * this.cols + cx;
  }
  insert(e) {
    const i = this.idx(e.x, e.y);
    const c = this.cells[i];
    if (c.length === 0) this.used.push(i);
    c.push(e);
  }
  // Llama fn(e) para cada entidad en celdas que tocan el círculo (x,y,r). Devuelve true para cortar.
  query(x, y, r, fn) {
    const h = this.half, cs = this.cell, cols = this.cols;
    let x0 = ((x - r + h) / cs) | 0, x1 = ((x + r + h) / cs) | 0;
    let y0 = ((y - r + h) / cs) | 0, y1 = ((y + r + h) / cs) | 0;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0; if (x1 >= cols) x1 = cols - 1; if (y1 >= cols) y1 = cols - 1;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = this.cells[cy * cols + cx];
        for (let k = 0; k < c.length; k++) if (fn(c[k])) return true;
      }
    }
    return false;
  }
}
