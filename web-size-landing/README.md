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
Header · Hero · 5 móviles 3D por sector · Software & Dashboards (demo en vivo) ·
Configurador a la carta + botón flotante de WhatsApp dinámico · Tarifas · Stack de rendimiento · Footer.

## Antes de publicar
1. Abre `main.js` y cambia el marcador temporal `WHATSAPP_NUMBER = '34600000000'`
   por tu número real (formato internacional, solo dígitos, sin `+`).
2. Redes sociales del footer: rellena `url` en `SOCIAL_LINKS` (`main.js`).
   Las redes con `url` vacía no se muestran (ahora mismo: LinkedIn y WhatsApp).
3. Revisa en `index.html` las características de cada plan (sección `#tarifas`):
   son una propuesta inicial; los precios (200 €, 350 €, 699 €) son los indicados.
4. Ajusta, si quieres, los mensajes preconfigurados: sectores en `SECTORS[].message`,
   planes en el atributo `data-wa-msg` de cada botón y módulos en `MODULES` (`main.js`).

## Probar en local
```bash
cd web-size-landing
python3 -m http.server 8080   # http://localhost:8080
```
