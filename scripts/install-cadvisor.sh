#!/bin/bash

# Script para remover e reinstalar cAdvisor configurado para Prometheus
# Execute no servidor onde o cAdvisor está rodando (10.0.0.250)

set -e

CADVISOR_PORT="9098"
CADVISOR_IMAGE="gcr.io/cadvisor/cadvisor:latest"

echo "🔧 Reinstalando cAdvisor para Prometheus..."
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute como root (sudo)"
    exit 1
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado"
    exit 1
fi

echo "✅ Docker encontrado"
echo ""

# 1. Parar e remover container atual
echo "1️⃣ Parando e removendo cAdvisor atual..."
if docker ps -a --format '{{.Names}}' | grep -q "^cadvisor$"; then
    docker stop cadvisor 2>/dev/null || true
    docker rm cadvisor 2>/dev/null || true
    echo "   ✅ Container removido"
else
    echo "   ℹ️  Container não encontrado (já removido ou nunca existiu)"
fi
echo ""

# 2. Parar serviço systemd se existir
echo "2️⃣ Parando serviço systemd (se existir)..."
if systemctl list-units --type=service | grep -q cadvisor.service; then
    systemctl stop cadvisor.service 2>/dev/null || true
    systemctl disable cadvisor.service 2>/dev/null || true
    echo "   ✅ Serviço parado"
else
    echo "   ℹ️  Serviço systemd não encontrado"
fi
echo ""

# 3. Rodar cAdvisor via Docker (sem autenticação, HTTP)
echo "3️⃣ Rodando cAdvisor via Docker..."
docker run -d \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --volume=/dev/disk/:/dev/disk:ro \
  --device=/dev/kmsg \
  --publish=${CADVISOR_PORT}:8080 \
  --name=cadvisor \
  --restart=always \
  ${CADVISOR_IMAGE}

if [ $? -eq 0 ]; then
    echo "   ✅ cAdvisor iniciado com sucesso"
else
    echo "   ❌ Falha ao iniciar cAdvisor"
    exit 1
fi
echo ""

# 4. Aguardar alguns segundos
echo "4️⃣ Aguardando cAdvisor inicializar..."
sleep 5
echo ""

# 5. Verificar se está rodando
echo "5️⃣ Verificando status..."
if docker ps | grep -q cadvisor; then
    echo "   ✅ Container está rodando"
    docker ps | grep cadvisor
else
    echo "   ❌ Container não está rodando"
    echo "   Verifique os logs: docker logs cadvisor"
    exit 1
fi
echo ""

# 6. Testar acesso HTTP
echo "6️⃣ Testando acesso HTTP..."
if curl -s -f "http://localhost:${CADVISOR_PORT}/metrics" > /dev/null 2>&1; then
    echo "   ✅ cAdvisor está respondendo em http://localhost:${CADVISOR_PORT}"
    echo "   ✅ Métricas disponíveis em http://localhost:${CADVISOR_PORT}/metrics"
    
    # Mostrar primeiras linhas das métricas
    echo ""
    echo "   📊 Primeiras métricas:"
    curl -s "http://localhost:${CADVISOR_PORT}/metrics" | head -5
else
    echo "   ⚠️  cAdvisor pode não estar respondendo ainda"
    echo "   Aguarde alguns segundos e teste: curl http://localhost:${CADVISOR_PORT}/metrics"
fi
echo ""

# 7. Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "📋 Informações de configuração:"
echo "   IP do servidor: ${SERVER_IP}"
echo "   Porta cAdvisor: ${CADVISOR_PORT}"
echo "   URL métricas: http://${SERVER_IP}:${CADVISOR_PORT}/metrics"
echo "   Protocolo: HTTP (sem autenticação)"
echo ""

echo "📝 Próximos passos:"
echo "   1. No servidor Prometheus, atualize prometheus/cadvisor-targets.json:"
echo "      {"
echo "        \"targets\": [\"${SERVER_IP}:${CADVISOR_PORT}\"],"
echo "        \"labels\": {"
echo "          \"name\": \"$(hostname)\","
echo "          \"os\": \"linux\","
echo "          \"environment\": \"production\","
echo "          \"exporter\": \"cadvisor\""
echo "        }"
echo "      }"
echo ""
echo "   2. Remova 'scheme: \"https\"' do cadvisor-targets.json (se existir)"
echo ""
echo "   3. Remova basic_auth/bearer_token do prometheus.yml (se tiver adicionado)"
echo ""
echo "   4. Recarregue o Prometheus: docker compose restart prometheus"
echo ""

echo "✅ cAdvisor reinstalado e configurado para Prometheus!"

