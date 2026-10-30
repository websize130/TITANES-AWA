/* PokerVegasPro — códigos canjeables firmados, códigos secretos y llave de administración.
 * Todo con WebCrypto del navegador (sin servicios externos):
 *  - Códigos de activación: ECDSA P-256. El admin firma con su llave privada; el juego solo trae la pública,
 *    así que nadie puede fabricar un código válido sin la llave del admin.
 *  - Código de creador: solo se guarda su hash PBKDF2 (el texto nunca está en el código fuente).
 *  - Llave privada del admin: cifrada con AES-GCM usando una clave derivada (PBKDF2) de su contraseña.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const subtle = () => {
    const c = root.crypto;
    if (!c || !c.subtle) throw new Error('Tu navegador no permite criptografía aquí. Abre el juego por HTTPS o desde localhost.');
    return c.subtle;
  };

  const PREFIX = 'PVP1-';
  const PBKDF2_ITER = 250000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------- base64url ---------- */
  function b64u(bytes) {
    bytes = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    const s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function randomBytes(n) {
    const b = new Uint8Array(n);
    root.crypto.getRandomValues(b);
    return b;
  }

  /** Normaliza lo que escribe el usuario: sin espacios y en mayúsculas (los firmados se respetan). */
  function normalize(code) {
    const c = String(code || '').trim().replace(/\s+/g, '');
    return c.toUpperCase().startsWith(PREFIX) ? PREFIX + c.slice(PREFIX.length) : c.toUpperCase();
  }

  async function sha256Hex(text) {
    const buf = await subtle().digest('SHA-256', enc.encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function pbkdf2Bits(text, salt, iterations) {
    const base = await subtle().importKey('raw', enc.encode(text), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256));
  }

  /** Hash lento de un código secreto (para el código de creador). */
  async function hashSecret(code) {
    const salt = randomBytes(16);
    const bits = await pbkdf2Bits(normalize(code), salt, PBKDF2_ITER);
    return { salt: b64u(salt), iter: PBKDF2_ITER, hash: b64u(bits) };
  }

  async function checkSecret(code, rec) {
    if (!rec || !rec.hash) return false;
    const bits = await pbkdf2Bits(normalize(code), unb64u(rec.salt), rec.iter || PBKDF2_ITER);
    return b64u(bits) === rec.hash;
  }

  /** Hash rápido de un código promocional público (no son secretos críticos). */
  function promoHash(code) { return sha256Hex('pvp-promo:' + normalize(code)); }

  /* ---------- llave de administración ---------- */

  async function aesKeyFrom(password, salt, iterations) {
    const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /** Crea el par de llaves del admin y devuelve la parte pública + la privada cifrada (apta para publicarse). */
  async function createAdmin(password) {
    if (String(password).length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
    const pair = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const publicKey = await subtle().exportKey('jwk', pair.publicKey);
    const privateJwk = await subtle().exportKey('jwk', pair.privateKey);
    const salt = randomBytes(16), iv = randomBytes(12);
    const key = await aesKeyFrom(password, salt, PBKDF2_ITER);
    const cipher = await subtle().encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(privateJwk)));
    return {
      admin: {
        publicKey: { kty: publicKey.kty, crv: publicKey.crv, x: publicKey.x, y: publicKey.y },
        salt: b64u(salt), iv: b64u(iv), iter: PBKDF2_ITER, keyEnc: b64u(cipher),
      },
      privateKey: pair.privateKey,
    };
  }

  /** Descifra la llave privada con la contraseña. Si la contraseña es incorrecta, lanza un error. */
  async function unlockAdmin(password, admin) {
    if (!admin || !admin.keyEnc) throw new Error('El panel aún no está configurado.');
    let jwk;
    try {
      const key = await aesKeyFrom(password, unb64u(admin.salt), admin.iter || PBKDF2_ITER);
      const plain = await subtle().decrypt({ name: 'AES-GCM', iv: unb64u(admin.iv) }, key, unb64u(admin.keyEnc));
      jwk = JSON.parse(dec.decode(plain));
    } catch (e) {
      throw new Error('Contraseña incorrecta.');
    }
    return subtle().importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  }

  /* ---------- códigos firmados ---------- */

  /**
   * payload: { k: 'pack'|'coins', u: id de jugador o '*', t: 'elite'|'legend'|'', d: días (0 = permanente),
   *            c: monedas, x: caducidad en ms (0 = nunca), n: nonce, i: emitido }
   */
  async function sign(privateKey, payload) {
    const body = Object.assign({ n: b64u(randomBytes(6)), i: Date.now() }, payload);
    const data = b64u(enc.encode(JSON.stringify(body)));
    const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, enc.encode(data));
    return PREFIX + data + '.' + b64u(sig);
  }

  /** Devuelve el contenido si la firma es válida; si no, null. */
  async function verify(code, publicJwk) {
    if (!publicJwk) return null;
    code = normalize(code);
    if (!code.startsWith(PREFIX)) return null;
    const [data, sig] = code.slice(PREFIX.length).split('.');
    if (!data || !sig) return null;
    try {
      const key = await subtle().importKey('jwk', Object.assign({ ext: true }, publicJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const ok = await subtle().verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(sig), enc.encode(data));
      return ok ? JSON.parse(dec.decode(unb64u(data))) : null;
    } catch (e) {
      return null;
    }
  }

  const isSigned = (code) => normalize(code).startsWith(PREFIX);

  PVP.Vouchers = { PREFIX, normalize, sha256Hex, hashSecret, checkSecret, promoHash, createAdmin, unlockAdmin, sign, verify, isSigned };
})(typeof window !== 'undefined' ? window : globalThis);
