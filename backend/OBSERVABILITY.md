# Observabilidad externa

## Componentes
- `GET /metrics`: resumen operativo legible para soporte y diagnostico rapido.
- `GET /metrics/prometheus`: endpoint Prometheus para scraping externo.
- `LOG_FORMAT=json`: logs estructurados.
- `LOG_FILE_PATH`: salida de logs a archivo para Promtail/Loki.

## Stack recomendado
- Prometheus para metricas
- Grafana para dashboards
- Loki + Promtail para logs centralizados

La carpeta `deploy/observability/` ya incluye configuracion base para estos servicios.
Tambien incluye provisioning de Grafana con estos dashboards:
- `DMS Backend Overview`
- `DMS Platform Operations`

## Variables relevantes
- `LOG_FORMAT=json`
- `LOG_FILE_PATH=/app/runtime/logs/backend.log`
- `HTTP_SLOW_REQUEST_MS=1000`
- `ES_NODE=http://elasticsearch:9200`

## Despliegue
```powershell
cd C:\Users\alexi\DMS\deploy
Copy-Item .env.staging.example .env
docker compose -f docker-compose.release.yml -f docker-compose.staging.yml --profile observability up -d
```

## Endpoints utiles
- `http://localhost:3000/metrics`
- `http://localhost:3000/metrics/prometheus`
- `http://localhost:9090` Prometheus
- `http://localhost:3001` Grafana
- `http://localhost:3100` Loki

## Logs centralizados
Promtail lee el volumen `backend_logs` y envia a Loki. Para que eso funcione:
1. `LOG_FORMAT` debe ser `json`.
2. `LOG_FILE_PATH` debe apuntar a un archivo dentro del volumen montado.
3. El contenedor backend debe montar `/app/runtime/logs`.

## Validacion minima
1. Abrir `GET /metrics/prometheus` y confirmar metricas `dms_http_requests_total`.
2. Generar trafico a la API.
3. Confirmar en Prometheus que el target `backend:3000` esta `UP`.
4. Confirmar en Grafana que Loki recibe logs del backend.
5. Abrir el dashboard `DMS Backend Overview` y validar:
   - solicitudes por ruta
   - latencia p95
   - tasa de error
   - estado de Elastic
   - cola de indexacion
6. Abrir `DMS Platform Operations` y validar:
   - estado del worker
   - queries `elastic` vs `fallback`
   - reindexaciones y fallos
   - backlog y antiguedad de la cola

## Alertas incluidas
Prometheus carga `observability/alerts.yml` con estas alertas base:
- `DmsBackendDown`
- `DmsElasticDegraded`
- `DmsSearchQueueStalled`
- `DmsSearchWorkerStopped`
- `DmsHttp5xxSpike`
