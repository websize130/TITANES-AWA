import { loadJsQR } from '../net/vendor.js';

/* Lector de QR con la cámara trasera: usa el detector nativo del navegador (Chrome/Android) y, si no existe,
   jsQR (incluido en el juego). Solo se pide la cámara al pulsar «Escanear QR»; se apaga al leer o al cerrar. */
export class QRScanner {
  constructor(video) { this.video = video; this.stream = null; this.on = false; this.canvas = null; }
  async start(onText) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Este navegador no da acceso a la cámara');
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    const v = this.video; v.srcObject = this.stream; await v.play(); this.on = true;
    let detector = null;
    try { if ('BarcodeDetector' in window && (await window.BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { detector = null; }
    const jsQR = detector ? null : await loadJsQR();
    const tick = async () => {
      if (!this.on) return;
      let text = null;
      try {
        if (detector) { const r = await detector.detect(v); if (r.length) text = r[0].rawValue; }
        else if (v.videoWidth) {
          const W = 480, H = Math.round((W * v.videoHeight) / v.videoWidth), c = (this.canvas ||= document.createElement('canvas')); c.width = W; c.height = H;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(v, 0, 0, W, H);
          const r = jsQR(g.getImageData(0, 0, W, H).data, W, H, { inversionAttempts: 'dontInvert' }); if (r) text = r.data;
        }
      } catch (e) { /* fotograma no disponible */ }
      if (text) { this.stop(); onText(text); return; }
      setTimeout(tick, 140);
    };
    tick();
  }
  stop() { this.on = false; if (this.stream) for (const t of this.stream.getTracks()) t.stop(); this.stream = null; if (this.video) this.video.srcObject = null; }
}

// Interpreta lo leído o escrito: enlace con ?mando= / ?unirse=, o un código suelto (4 = mando de TV, 6 = invitación)
export function parseJoin(raw) {
  const t = String(raw || '').trim();
  try { const u = new URL(t); const m = u.searchParams.get('mando'), j = u.searchParams.get('unirse'); if (m) return { kind: 'mando', code: m.toUpperCase() }; if (j) return { kind: 'join', code: j.toUpperCase() }; } catch (e) { /* no es un enlace */ }
  const c = t.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length === 4) return { kind: 'mando', code: c };
  if (c.length === 6) return { kind: 'join', code: c };
  return null;
}
export const baseUrl = () => location.href.split('#')[0].split('?')[0];
