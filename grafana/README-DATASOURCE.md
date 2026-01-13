# Configuração do Datasource Prometheus

O provisionamento automático do datasource foi desabilitado para evitar erros de inicialização do Grafana.

## Opção 1: Adicionar via Interface Web (Recomendado)

1. Acesse o Grafana: http://localhost:3001
2. Faça login com:
   - Usuário: `admin`
   - Senha: `admin`
3. Vá em **Configuration → Data Sources**
4. Clique em **Add data source**
5. Selecione **Prometheus**
6. Configure:
   - **URL**: `http://prometheus:9090`
   - **Access**: `Server (default)`
   - Marque **Set as default**
7. Clique em **Save & Test**

## Opção 2: Adicionar via API

Execute o script após o Grafana estar rodando:

```bash
./grafana/setup-datasource.sh
```

Ou manualmente via curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -u admin:admin \
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
  http://localhost:3001/api/datasources
```

## Habilitar Provisionamento Automático (Futuro)

Depois que tudo estiver funcionando, você pode reabilitar o provisionamento automático:

1. Copie o arquivo de backup:
   ```bash
   cp grafana/provisioning/datasources/prometheus.yml.bak grafana/provisioning/datasources/prometheus.yml
   ```

2. Reinicie o Grafana:
   ```bash
   docker compose restart grafana
   ```

