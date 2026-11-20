/* Carga perezosa del GLTFLoader (+ DRACO) y caché por URL */
export const ModelLoader = {
  loader: null, cache: new Map(), su: null,
  async get() {
    if (this.loader) return this.loader;
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]);
    const l = new GLTFLoader(), d = new DRACOLoader();
    d.setDecoderPath(new URL('draco/', document.baseURI).href); // copia local (public/draco), sin CDN
    l.setDRACOLoader(d);
    return (this.loader = l);
  },
  skeletonUtils() { return this.su || (this.su = import('three/addons/utils/SkeletonUtils.js')); },
  load(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.get().then((l) => l.loadAsync(url)).catch((e) => { this.cache.delete(url); throw e; }));
    return this.cache.get(url);
  },
};
