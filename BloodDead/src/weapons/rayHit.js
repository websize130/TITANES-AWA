// Intersecciones rayo-esfera y rayo-cápsula (devuelven distancia o Infinity)
export function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z, b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return Infinity; const t = -b - Math.sqrt(h); return t > 0 ? t : Infinity;
}
export function rayCapsule(o, d, a, b, r) {
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z, oax = o.x - a.x, oay = o.y - a.y, oaz = o.z - a.z;
  const baba = bax * bax + bay * bay + baz * baz, bard = bax * d.x + bay * d.y + baz * d.z, baoa = bax * oax + bay * oay + baz * oaz;
  const rdoa = d.x * oax + d.y * oay + d.z * oaz, oaoa = oax * oax + oay * oay + oaz * oaz;
  const A = baba - bard * bard, B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba, h = B * B - A * C;
  if (h >= 0 && A > 1e-9) {
    const t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
    if (y > 0 && y < baba && t > 0) return t;
    const cx = y <= 0 ? oax : o.x - b.x, cy = y <= 0 ? oay : o.y - b.y, cz = y <= 0 ? oaz : o.z - b.z; // tapas esféricas
    const bb = d.x * cx + d.y * cy + d.z * cz, cc = cx * cx + cy * cy + cz * cz - r * r, hh = bb * bb - cc;
    if (hh > 0) { const tt = -bb - Math.sqrt(hh); if (tt > 0) return tt; }
  }
  return Infinity;
}
