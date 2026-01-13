#!/bin/sh
# Script para adicionar o datasource do Prometheus no Grafana via API
# Este script é executado dentro do container Grafana

GRAFANA_URL="http://localhost:3000"
GRAFANA_USER="${GF_SECURITY_ADMIN_USER:-admin}"
GRAFANA_PASSWORD="${GF_SECURITY_ADMIN_PASSWORD:-admin}"

echo "Aguardando Grafana estar pronto..."
for i in $(seq 1 30); do
    if wget -q -O /dev/null "$GRAFANA_URL/api/health" 2>/dev/null; then
        echo "Grafana está pronto!"
        break
    fi
    echo "Tentativa $i/30 - Aguardando Grafana..."
    sleep 2
done

echo "Aguardando Prometheus estar pronto..."
for i in $(seq 1 30); do
    if wget -q -O /dev/null "http://prometheus:9090/-/healthy" 2>/dev/null; then
        echo "Prometheus está pronto!"
        break
    fi
    echo "Tentativa $i/30 - Aguardando Prometheus..."
    sleep 2
done

echo "Adicionando datasource Prometheus..."

# Verificar se o datasource já existe
DS_EXISTS=$(wget -q -O - --user="$GRAFANA_USER" --password="$GRAFANA_PASSWORD" \
    "$GRAFANA_URL/api/datasources/uid/prometheus" 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$DS_EXISTS" ]; then
    echo "Datasource já existe, atualizando..."
    wget -q -O /dev/null --method=PUT \
        --header="Content-Type: application/json" \
        --user="$GRAFANA_USER" \
        --password="$GRAFANA_PASSWORD" \
        --body-data='{
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
        "$GRAFANA_URL/api/datasources/uid/prometheus" 2>/dev/null
else
    echo "Criando novo datasource..."
    wget -q -O /dev/null --method=POST \
        --header="Content-Type: application/json" \
        --user="$GRAFANA_USER" \
        --password="$GRAFANA_PASSWORD" \
        --body-data='{
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
fi

if [ $? -eq 0 ]; then
    echo "Datasource configurado com sucesso!"
else
    echo "Erro ao configurar datasource"
fi

