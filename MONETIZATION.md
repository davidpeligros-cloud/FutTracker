# Monetizacion

La app ya tiene una capa preparada para RevenueCat y Google AdMob.

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

Productos recomendados:

- `monthly`: suscripcion mensual.
- `annual`: suscripcion anual.
- `lifetime`: compra unica de lanzamiento.

La app intenta comprar el paquete cuyo identificador contiene `monthly`, `annual` o `lifetime`.

## AdMob

La app usa:

- Banners en zonas seguras como Home, Calendario y Equipos.
- Rewarded ads para monedas y recursos.
- Nada de interstitials durante partidos en directo.

## Probar en build nativa

```bash
npm run build:dev:android
npm run start:dev
```

Para iOS:

```bash
npm run build:dev:ios
npm run start:dev
```

Expo Go no ejecuta AdMob real. RevenueCat puede previsualizar flujos, pero las compras reales necesitan development build.
