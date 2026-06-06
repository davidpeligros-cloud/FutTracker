# Hosting web de FutTracker

La app movil puede tener una version web/PWA para verla desde una URL sin tener el PC encendido.

## Generar la web

```powershell
npm.cmd run export:web
```

Esto crea la carpeta `dist-web`.

## Probar localmente

```powershell
npm.cmd run preview:web
```

## Opciones gratis o baratas

- Netlify: arrastra la carpeta `dist-web` a Netlify Drop.
- Vercel: conecta el repo y usa `npm.cmd run export:web` como build command, con `dist-web` como output.
- Cloudflare Pages: conecta el repo y usa `npx expo export --platform web --output-dir dist-web --clear`, con `dist-web` como output.

## Limitaciones de la version web

- AdMob real funciona en Android/iOS nativo, no en web.
- En web se usa un fallback visual de anuncios para que la app compile.
- RevenueCat/Play Billing real se debe validar en build nativa.
- La web sirve para mostrar la app, probar flujos y compartir FutTracker sin Play Console.
