#!/bin/bash
# Script para adicionar o datasource do Prometheus no Grafana via API

GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASSWORD="admin"

echo "Aguardando Grafana estar pronto..."
until curl -s -f -o /dev/null "$GRAFANA_URL/api/health"; do
    echo "Aguardando Grafana..."
    sleep 2
done

echo "Grafana está pronto. Adicionando datasource..."

# Criar datasource via API
curl -X POST \
  -H "Content-Type: application/json" \
  -u "$GRAFANA_USER:$GRAFANA_PASSWORD" \
  -d '{
    "name": "Prometheus",
    "type": "prometheus",
    "access": "proxy",
    "url": "http://prometheus:9090",
    "isDefault": true,
    "editable": true,
    "jsonData": {
      "httpMethod": "POST",
      "timeInterval": "15s"
    },
    "uid": "prometheus"
  }' \
  "$GRAFANA_URL/api/datasources" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Datasource adicionado com sucesso!"
else
    echo "Erro ao adicionar datasource (pode já existir)"
fi

