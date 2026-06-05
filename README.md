# FútbolLive Expo App

Proyecto Expo para una app móvil de fútbol en directo.

## Pasos para ejecutar

1. Abre una terminal en `C:\Users\david\Downloads\futbol_live_expo`
2. Ejecuta:
   - `npm.cmd install`
   - `npm.cmd start -- --go --clear`
3. Usa Expo Go para ver la app en el móvil.

## Qué incluye

- Mundial 2026, ligas europeas, MLS, Liga MX y Champions.
- Partidos en directo, calendario, equipos y jugadores.
- Banderas, abreviaturas y colores por equipo o selección.
- Búsqueda y selección de equipo/jugador.
- Monetización con Premium, banners, interstitials y anuncios recompensados.

## Probar anuncios

Expo Go no incluye AdMob nativo. Para probar anuncios reales usa el APK de desarrollo:

```powershell
npm.cmd run start:dev
```

Después abre la app instalada, no Expo Go.

## Lanzamiento

- Checklist: `LAUNCH_CHECKLIST.md`
- Ficha de tienda: `STORE_LISTING.md`
- Privacidad: `PRIVACY_POLICY.md`
- Monetización: `MONETIZATION.md`

Build de producción Android:

```powershell
npm.cmd run build:prod:android
```
