# Configuração do Prometheus

Esta pasta contém todos os arquivos de configuração do Prometheus.

## Estrutura

- `prometheus.yml` - Arquivo principal de configuração do Prometheus
- `targets/` - Arquivos JSON com os targets para monitoramento
  - `linux-targets.json` - Servidores Linux (Node Exporter)
  - `windows-targets.json` - Servidores Windows (Windows Exporter)
  - `process-exporter-targets.json` - Servidores com Process Exporter
  - `cadvisor-targets.json` - Servidores com cAdvisor (monitoramento de containers)
  - `icmp-targets.json` - Targets para monitoramento ICMP (ping)
  - `targets.json` - Servidores de jogos (Game Server Exporter)
- `rules/` - Regras de alertas e recording rules
  - `game-servers.yml` - Regras de alertas para servidores de jogos
- `alerts/` - Arquivos de alertas adicionais (opcional)

## Configuração

### Adicionar Targets

Os targets são configurados através de arquivos JSON na pasta `targets/`. O Prometheus usa Service Discovery (file_sd) para ler esses arquivos automaticamente.

#### 1. Servidores Linux (Node Exporter)

Edite `targets/linux-targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:9100"],
    "labels": {
      "name": "NOME_DO_SERVIDOR",
      "os": "linux",
      "environment": "production"
    }
  }
]
```

**Exemplo:**
```json
[
  {
    "targets": ["172.16.100.191:9100"],
    "labels": {
      "name": "DOCKER-01",
      "os": "linux",
      "environment": "production"
    }
  },
  {
    "targets": ["10.0.0.250:9100"],
    "labels": {
      "name": "node010.hostgamer.net",
      "os": "linux",
      "environment": "production"
    }
  }
]
```

#### 2. Servidores Windows (Windows Exporter)

Edite `targets/windows-targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:9182"],
    "labels": {
      "name": "NOME_DO_SERVIDOR",
      "os": "windows",
      "environment": "production"
    }
  }
]
```

**Exemplo:**
```json
[
  {
    "targets": ["172.16.100.101:9182"],
    "labels": {
      "name": "STREAMING-01",
      "os": "windows",
      "environment": "production"
    }
  }
]
```

#### 3. Process Exporter (Linux)

Edite `targets/process-exporter-targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:9256"],
    "labels": {
      "name": "NOME_DO_SERVIDOR",
      "os": "linux",
      "environment": "production",
      "exporter": "process"
    }
  }
]
```

**Exemplo:**
```json
[
  {
    "targets": ["10.0.0.250:9256"],
    "labels": {
      "name": "node010.hostgamer.net",
      "os": "linux",
      "environment": "production",
      "exporter": "process"
    }
  }
]
```

#### 4. cAdvisor (Monitoramento de Containers Docker)

Edite `targets/cadvisor-targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:9098"],
    "labels": {
      "server_name": "NOME_DO_SERVIDOR",
      "os": "linux",
      "environment": "production",
      "exporter": "cadvisor"
    }
  }
]
```

**Nota:** Use `server_name` ao invés de `name` para evitar conflito com o label `name` das métricas do cAdvisor (que representa o nome do container).

**Exemplo:**
```json
[
  {
    "targets": ["172.16.100.191:9098"],
    "labels": {
      "server_name": "DOCKER-01",
      "os": "linux",
      "environment": "production",
      "exporter": "cadvisor"
    }
  }
]
```

#### 5. Monitoramento ICMP (Ping)

Edite `targets/icmp-targets.json`:

```json
[
  {
    "targets": ["IP_OU_HOSTNAME"],
    "labels": {
      "name": "NOME_DESCRITIVO",
      "type": "dns|cloud|bu"
    }
  }
]
```

**Exemplo:**
```json
[
  {
    "targets": ["8.8.8.8"],
    "labels": {
      "name": "Google DNS",
      "type": "dns"
    }
  },
  {
    "targets": ["80.75.221.1"],
    "labels": {
      "name": "VibeGames SP",
      "type": "cloud"
    }
  }
]
```

#### 6. Servidores de Jogos (Game Server Exporter)

Edite `targets/targets.json`:

```json
[
  {
    "targets": ["IP_DO_SERVIDOR:PORTA"],
    "labels": {
      "gamedig-type": "TIPO_DO_JOGO",
      "exporter": "game-server"
    }
  }
]
```

**Exemplo:**
```json
[
  {
    "targets": ["80.75.221.52:28960"],
    "labels": {
      "gamedig-type": "cod2",
      "exporter": "game-server"
    }
  },
  {
    "targets": ["80.75.221.53:28964"],
    "labels": {
      "gamedig-type": "cod2",
      "exporter": "game-server"
    }
  }
]
```

### Regras de Alertas

As regras de alertas estão em `rules/game-servers.yml`. Você pode:

1. Editar as regras existentes
2. Adicionar novas regras ao mesmo arquivo
3. Criar novos arquivos `.yml` na pasta `rules/`

### Recarregar Configuração

Após modificar os arquivos, você pode recarregar a configuração do Prometheus sem reiniciar:

```bash
# Via API do Prometheus
curl -X POST http://localhost:9090/-/reload

# Ou reinicie o container
docker-compose restart prometheus
```

## Tipos de Jogos Suportados

Veja a lista completa em: https://github.com/gamedig/node-gamedig#games-list

Alguns exemplos populares:
- `cs2` - Counter-Strike 2
- `csgo` - Counter-Strike: Global Offensive
- `minecraft` - Minecraft
- `quake3` - Quake 3 Arena
- `tf2` - Team Fortress 2
- `rust` - Rust
- `ark` - ARK: Survival Evolved
- `valheim` - Valheim

