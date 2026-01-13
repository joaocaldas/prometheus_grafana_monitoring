# Configuração do Grafana

Esta pasta contém a configuração do Grafana para monitoramento dos servidores de jogos.

## Estrutura

```
grafana/
├── dashboards/
│   └── game-servers.json          # Dashboard principal
├── provisioning/
│   ├── datasources/
│   │   └── prometheus.yml         # Configuração do datasource Prometheus
│   └── dashboards/
│       └── default.yml            # Configuração de provisionamento de dashboards
```

## Acesso

- **URL**: http://localhost:3001
- **Usuário padrão**: `admin`
- **Senha padrão**: `admin` (será solicitado para alterar no primeiro login)

## Datasource

O datasource do Prometheus é configurado automaticamente via provisionamento:
- **Nome**: Prometheus
- **URL**: http://prometheus:9090 (comunicação interna Docker)
- **UID**: prometheus

## Dashboard

O dashboard "Game Servers Monitoring" é carregado automaticamente e inclui:

1. **Status dos Servidores** - Indicadores visuais (verde/vermelho)
2. **Jogadores Online** - Gráfico de linha por servidor
3. **Ocupação dos Servidores** - Gauge com percentual
4. **Latência (Ping)** - Gráfico de ping por servidor
5. **Tabela de Servidores** - Visão geral em tabela
6. **Jogadores vs Bots** - Gráfico de barras
7. **Taxa de Erros** - Monitoramento de erros de consulta

## Troubleshooting

### Datasource não encontrado

Se aparecer "datasource prometheus not found":

1. Verifique se o Prometheus está rodando:
```bash
docker compose ps prometheus
```

2. Reinicie o Grafana:
```bash
docker compose restart grafana
```

3. Verifique os logs do Grafana:
```bash
docker compose logs grafana | grep -i datasource
```

4. Acesse o Grafana e vá em **Configuration → Data Sources** para verificar se o Prometheus está listado

### Dashboard não aparece

1. Verifique se o arquivo está no lugar correto:
```bash
ls -la grafana/dashboards/
```

2. Reinicie o Grafana:
```bash
docker compose restart grafana
```

3. Acesse o Grafana e vá em **Dashboards → Browse** para verificar se o dashboard está listado

## Personalização

### Alterar senha do admin

Edite o `docker-compose.yml` e altere:
```yaml
- GF_SECURITY_ADMIN_PASSWORD=sua_senha_aqui
```

Depois reinicie:
```bash
docker compose restart grafana
```

### Adicionar mais dashboards

Coloque arquivos JSON na pasta `grafana/dashboards/` e reinicie o Grafana.

