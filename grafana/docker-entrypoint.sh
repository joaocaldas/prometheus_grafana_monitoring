#!/bin/sh
set -e

# Aguardar 15 segundos após o Prometheus estar healthy
echo "Aguardando 15 segundos após Prometheus estar pronto..."
sleep 15

# Executar o entrypoint padrão do Grafana
# O Grafana usa /run.sh como entrypoint padrão
if [ -f /run.sh ]; then
    exec /run.sh "$@"
else
    # Fallback para o binário direto
    exec /usr/share/grafana/bin/grafana-server \
        --config=/etc/grafana/grafana.ini \
        --homepath=/usr/share/grafana \
        --packaging=docker \
        "$@"
fi

