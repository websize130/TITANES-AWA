# Web Size — Landing page

Landing de la agencia **Web Size** (HTML5 + Tailwind CSS por CDN + JavaScript vanilla).
Proyecto independiente del juego Unity de este repositorio (está fuera de `Assets/`, Unity no lo importa).

```
index.html   Estructura: header, hero y showcase de 5 móviles 3D
styles.css   Efectos: texto metálico/neón, móviles 3D, flotación, onda neón, toast
main.js      Configuración de WhatsApp, datos de los 5 sectores, parallax, chispas
assets/      Logotipo y banner corporativos
```

## Antes de publicar
1. Abre `main.js` y cambia el marcador temporal `WHATSAPP_NUMBER = '34600000000'`
   por tu número real (formato internacional, solo dígitos, sin `+`).
2. Ajusta, si quieres, los mensajes preconfigurados de cada sector en `SECTORS[].message`.

## Probar en local
```bash
cd web-size-landing
python3 -m http.server 8080   # http://localhost:8080
```
