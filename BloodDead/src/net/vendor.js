/* Librerías de red empaquetadas con el juego (antes venían de jsDelivr).
   Se importan bajo demanda: solo se descargan si se usa el móvil como mando. */
let peerP = null, qrP = null;
export function loadPeer() { return (peerP ||= import('peerjs').then((m) => m.Peer || m.default.Peer || m.default).catch((e) => { peerP = null; throw e; })); }
export function loadQR() { return (qrP ||= import('qrcode-generator').then((m) => m.default || m).catch((e) => { qrP = null; throw e; })); }
let jsqrP = null;
export function loadJsQR() { return (jsqrP ||= import('jsqr').then((m) => m.default || m).catch((e) => { jsqrP = null; throw e; })); }
// Servidor de emparejamiento: el público de PeerJS por defecto; window.__PEER_OPTS__ permite usar otro (pruebas o servidor propio)
export const peerOpts = () => (typeof window !== 'undefined' && window.__PEER_OPTS__) || undefined;
