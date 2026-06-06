# Monetizacion

La app tiene una capa preparada para Google AdMob y Premium mediante RevenueCat.

## Modelo actual

FutTracker usa un modelo simple:

- Gratis: resultados, calendario, equipos, jugadores, favoritos, alertas y anuncios.
- Premium: pago unico de 5,99 EUR para quitar anuncios y desbloquear funciones avanzadas.
- Sin suscripciones mensuales.
- Sin modos competitivos de ventaja pagada ni mecanicas pay-to-win.

## Modo desarrollo

Por defecto usa App IDs de prueba de Google y modo demo para RevenueCat si no hay claves reales.

1. Copia `.env.example` a `.env`.
2. Rellena las claves `EXPO_PUBLIC_REVENUECAT_*` desde RevenueCat.
3. Rellena los IDs `EXPO_PUBLIC_ADMOB_*` desde AdMob.
4. Si tienes App IDs reales de AdMob, añade tambien:

```env
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx
```

## RevenueCat

Configura un entitlement llamado `premium` o cambia `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`.

Producto recomendado:

- `lifetime`: compra unica de 5,99 EUR.

La app intenta comprar el paquete cuyo identificador contiene `lifetime`.

## AdMob

La app usa:

- Banners en zonas seguras como Home, Calendario y Equipos.
- Banners repetidos en listas de partidos, equipos, jugadores y competiciones.
- Interstitials al cambiar de seccion, abrir partidos o cambiar competiciones, con cooldown para no bloquear cada toque.
- Rewarded ads para monedas y recursos.
- Premium elimina todos los banners, interstitials y pausas patrocinadas.

## Web

La version web usa un fallback visual de anuncios. AdMob real funciona en Android/iOS nativo, no en la web exportada para Netlify.

## Probar en build nativa

```powershell
npm.cmd run build:dev:android
npm.cmd run start:dev
```

Expo Go no ejecuta AdMob real. RevenueCat puede previsualizar flujos, pero las compras reales necesitan development build.
