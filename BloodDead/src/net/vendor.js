/* Librerías de red empaquetadas con el juego (antes venían de jsDelivr).
   Se importan bajo demanda: solo se descargan si se usa el móvil como mando. */
let peerP = null, qrP = null;
export function loadPeer() { return (peerP ||= import('peerjs').then((m) => m.Peer || m.default.Peer || m.default).catch((e) => { peerP = null; throw e; })); }
export function loadQR() { return (qrP ||= import('qrcode-generator').then((m) => m.default || m).catch((e) => { qrP = null; throw e; })); }
