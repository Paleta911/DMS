# Hardening de seguridad para produccion

## Controles implementados
- JWT de acceso y refresh token separados.
- Politica de contrasenas: minimo 8 caracteres, mayuscula, minuscula y numero.
- Bloqueo temporal por intentos fallidos de login.
- Rate limit por endpoint sensible.
- Helmet con CSP configurable.
- HSTS en produccion.
- CORS configurable por ambiente.
- Validacion estricta de tipos de archivo y firma binaria.
- Auditoria de eventos criticos de autenticacion y autorizacion.

## Variables obligatorias en produccion
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DB_PASS`
- `BOOTSTRAP_TOKEN`
- `CORS_ORIGIN`
- `CSP_*` segun politica deseada
- `LOG_FORMAT=json`
- `LOG_FILE_PATH`

## Sesion
- `JWT_EXPIRES_IN` define la vida del access token.
- `JWT_REFRESH_EXPIRES_IN` define la vida del refresh token.
- El frontend renueva sesion automaticamente contra `POST /auth/refresh`.

## Anti abuso
- `AUTH_LOGIN_LIMIT`
- `AUTH_LOGIN_TTL_SEC`
- `AUTH_LOGIN_BLOCK_AFTER`
- `AUTH_LOGIN_BLOCK_SEC`
- `AUTH_LOGIN_RESET_WINDOW_SEC`
- `AUTH_REFRESH_LIMIT`
- `AUTH_REFRESH_TTL_SEC`

## Recomendaciones de despliegue
1. Usar secretos distintos para access y refresh.
2. Definir `CORS_ORIGIN` sin comodines.
3. Activar CSP y ajustar `connect-src` al frontend real.
4. Rotar `BOOTSTRAP_TOKEN` y deshabilitar bootstrap cuando ya no sea necesario.
5. Montar logs y respaldos fuera del contenedor.
6. Revisar periodicamente metricas y logs de `AUTH_LOGIN_FAIL`, `AUTH_LOGIN_BLOCKED`, `ACCESS_DENIED`.

## Checklist rapido
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` fuertes
- [ ] `CORS_ORIGIN` sin `*`
- [ ] `BOOTSTRAP_TOKEN` fuerte y privado
- [ ] `LOG_FORMAT=json`
- [ ] `LOG_FILE_PATH` montado a volumen persistente
- [ ] `EMAIL_MODE=smtp` validado si aplica
- [ ] Prometheus/Grafana/Loki disponibles si se requiere monitoreo externo
