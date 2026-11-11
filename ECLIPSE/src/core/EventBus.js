/** Bus de eventos mínimo: los sistemas se comunican sin referencias directas. */
export class EventBus {
  #handlers = new Map();

  on(type, fn) {
    let set = this.#handlers.get(type);
    if (!set) { set = new Set(); this.#handlers.set(type, set); }
    set.add(fn);
    return () => set.delete(fn);
  }

  emit(type, payload) {
    const set = this.#handlers.get(type);
    if (!set) return;
    for (const fn of set) fn(payload);
  }
}
