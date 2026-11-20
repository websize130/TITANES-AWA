/* Bus de eventos: desacopla sistemas (zombis, armas, misiones…) */
export class EventBus {
  constructor() { this.map = new Map(); }
  on(e, fn) { if (!this.map.has(e)) this.map.set(e, new Set()); this.map.get(e).add(fn); return () => this.off(e, fn); }
  off(e, fn) { const s = this.map.get(e); if (s) s.delete(fn); }
  emit(e, data) { const s = this.map.get(e); if (s) s.forEach((fn) => { try { fn(data); } catch (err) { console.error(err); } }); }
}
