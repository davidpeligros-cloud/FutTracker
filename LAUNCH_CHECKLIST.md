# Checklist de lanzamiento

## Estado actual

- App Expo/React Native funcional.
- Android APK local generado correctamente.
- Monetización integrada con AdMob y RevenueCat.
- Premium, anuncios, banners, interstitials y recompensados conectados.
- Icono, adaptive icon y splash añadidos.
- EAS configurado para development, preview y production.
- Documentación de monetización y privacidad añadida.

## Bloqueos externos

- Crear cuenta de Google Play Developer.
- Crear app real en AdMob y sustituir IDs de prueba.
- Crear proyecto y productos en RevenueCat.
- Publicar una URL real de política de privacidad.
- Usar una API deportiva con licencia comercial antes de escalar.
- Completar formulario de seguridad de datos en Google Play.
- Completar clasificación de contenido en Google Play.

## Antes de subir a Play Store

- Probar APK preview en Android real.
- Verificar que no hay errores rojos en Metro.
- Revisar que los anuncios no tapen contenido ni aparezcan en momentos engañosos.
- Confirmar que Premium elimina anuncios.
- Crear capturas finales desde un móvil real.
- Revisar textos, acentos y nombres.
- Cambiar App IDs de AdMob de test a producción.
- Cambiar claves de RevenueCat demo a producción.

## Comandos útiles

```powershell
npm.cmd start -- --go --clear
npm.cmd run start:dev
npm.cmd run build:preview:android
npm.cmd run build:prod:android
npm.cmd run submit:android
```

## Notas importantes

Google Play exige que las nuevas apps apunten como mínimo a Android 15, API 35. Expo SDK 54 cumple ese nivel en builds actuales.

Los anuncios agresivos pueden mejorar ingresos a corto plazo, pero también pueden reducir retención o generar problemas de revisión si parecen engañosos, bloquean navegación o se disparan al abrir la app. La app mantiene cooldown en interstitials y Premium sin anuncios.
