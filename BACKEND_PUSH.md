# Backend de notificaciones FutTracker

Este backend registra moviles con Expo Push Token, revisa marcadores cada minuto y envia notificaciones cuando detecta goles.

## Que hace

- `POST /register`: guarda el token del movil y sus preferencias.
- `POST /poll`: fuerza una revision manual de marcadores.
- `GET /health`: comprueba si el backend esta vivo.
- Poll automatico cada `60000 ms`.

## Probar localmente

```powershell
npm.cmd run backend
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8787/health
```

Forzar revision:

```powershell
Invoke-RestMethod -Method POST http://localhost:8787/poll
```

## Conectar la app

Cuando tengas una URL publica del backend, ponla en `.env`:

```env
EXPO_PUBLIC_PUSH_BACKEND_URL=https://tu-backend-publico.com
```

Luego recompila la APK o la build EAS. Las variables `EXPO_PUBLIC_*` se meten en el bundle durante build, asi que cambiar `.env` sin recompilar no basta.

## Despliegue recomendado

Para una primera version barata, usa un servicio Node 18+ que mantenga procesos activos:

- Render Web Service.
- Railway.
- Fly.io.
- VPS pequeno.

Comandos de despliegue:

- Root directory: `backend`
- Build command: vacio o `npm install`
- Start command: `npm start`
- Environment: `POLL_INTERVAL_MS=60000`

### Railway paso a paso

1. Sube este proyecto a GitHub.
2. En Railway, crea un proyecto nuevo.
3. Elige `Deploy from GitHub repo`.
4. Selecciona el repositorio de FutTracker.
5. En ajustes del servicio, pon `Root Directory` como `/backend`.
6. Si te pide config file, pon `/backend/railway.json`.
7. Despliega y abre la URL publica que te da Railway.
8. Prueba `https://tu-url-de-railway/health`; debe devolver `ok: true`.

Cuando funcione, copia esa URL en `.env` como `EXPO_PUBLIC_PUSH_BACKEND_URL` y recompila la app.

## Limitaciones

- La primera lectura crea linea base y no notifica goles antiguos.
- Si el hosting duerme el proceso, no revisara partidos mientras este dormido.
- Esta version guarda datos en archivos JSON. Para escalar, conviene mover tokens y marcadores a una base de datos.
- ESPN puede cambiar o limitar su API; antes de publicar masivamente conviene usar una API deportiva comercial.
