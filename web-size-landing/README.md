# Web Size — Landing page

Landing de la agencia **Web Size** (HTML5 + Tailwind CSS por CDN + JavaScript vanilla).
Proyecto independiente del juego Unity de este repositorio (está fuera de `Assets/`, Unity no lo importa).

```
index.html   Estructura: header, hero y showcase de 5 móviles 3D
styles.css   Efectos: texto metálico/neón, móviles 3D, flotación, onda neón, toast
main.js      Configuración de WhatsApp, datos de los 5 sectores, parallax, chispas
assets/      Logotipo y banner corporativos
```

## Secciones
Header · Hero · 5 móviles 3D con maquetas de negocios ficticios · Software & Dashboards (demo en vivo) ·
Tarifas (planes, módulos y packs) · Configurador con presupuesto en tiempo real + botón flotante de WhatsApp ·
Stack de rendimiento · Footer.

## Precios: dónde se cambian
Todo el cálculo sale de `main.js`, sección **CATÁLOGO DE PRECIOS**:
- `PLANS`: Plan Básico, Pro y Élite / 3D (`min` = `max` para precio fijo).
- `MODULES`: módulos de automatización y software (`min`/`max` = rango; `open: true` añade "+").
- `PACKS`: packs con su precio, el plan y los módulos que incluyen. El configurador
  aplica el pack automáticamente cuando el usuario marca esa combinación y calcula el ahorro.

Los textos y precios de las tarjetas de planes están en `index.html` (sección `#tarifas`);
si cambias un precio de plan, cámbialo en los dos sitios.

## Antes de publicar
1. Cambia el marcador temporal `WHATSAPP_NUMBER = '34600000000'` en `main.js`
   por tu número real (formato internacional, solo dígitos, sin `+`).
2. Redes sociales del footer: rellena `url` en `SOCIAL_LINKS` (`main.js`).
   Las redes con `url` vacía no se muestran (ahora mismo: LinkedIn y WhatsApp).
3. **Textos legales** (modales del footer: Aviso Legal, Privacidad, Cookies y Términos):
   completa los datos marcados en amarillo (nombre completo, NIF, domicilio, IVA, pagos,
   revisiones, propiedad) en `index.html` y haz que un profesional los revise.
4. **Prueba social**: sustituye el texto de ejemplo de Aura Beauty Studio (`#caso`) por su
   opinión real y quita el atributo `data-draft`.
5. Los negocios de los móviles (TurboFix, Lumière, AquaPronto, Dentiva, KineticFisio)
   son maquetas inventadas; se editan en `SECTORS` (`main.js`).

## Probar en local
```bash
cd web-size-landing
python3 -m http.server 8080   # http://localhost:8080
```
