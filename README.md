# Game Server Exporter para Prometheus

Exporter do Prometheus para monitorar servidores de jogos usando o pacote [gamedig](https://github.com/gamedig/node-gamedig).

## Estrutura do Projeto

```
gs_exporter/
├── docker-compose.yml          # Stack completa (Prometheus + Exporter)
├── prometheus/                  # Configuração do Prometheus
│   ├── prometheus.yml          # Configuração principal
│   ├── rules/                  # Regras de alertas
│   │   └── game-servers.yml    # Alertas para servidores de jogos
│   └── alerts/                 # Alertas adicionais (opcional)
├── gs_exporter/                # Código do exporter
│   ├── index.js                # Código principal
│   ├── package.json            # Dependências Node.js
│   ├── Dockerfile              # Imagem Docker do exporter
│   └── docker-compose.yml      # Para rodar apenas o exporter
└── README.md                   # Este arquivo
```

## Início Rápido com Docker

### Opção 1: Stack Completa (Prometheus + Exporter)

```bash
# 1. Configure seus servidores em prometheus/prometheus.yml
# 2. Inicie tudo com docker-compose
docker-compose up -d

# 3. Acesse:
# - Prometheus: http://localhost:9090
# - Métricas do exporter: http://localhost:9091/metrics
```

### Opção 2: Apenas o Exporter

```bash
# Entre na pasta do exporter
cd gs_exporter

# Inicie apenas o exporter
docker-compose up -d
```

## Funcionalidades

- Consulta informações de servidores de jogos usando gamedig
- Expõe métricas do Prometheus em `/metrics`
- Suporta múltiplos servidores simultaneamente
- Métricas incluem:
  - Número de jogadores online
  - Número máximo de jogadores
  - Número de bots
  - Latência (ping)
  - Status online/offline
  - Contador de erros de consulta

## Instalação

### Instalação Local

```bash
npm install
```

### Instalação via Docker

```bash
# Usar docker-compose (inclui Prometheus)
docker-compose up -d

# Ou build da imagem manualmente
docker build -t gs-exporter .
```

## Uso

### Configuração via Variável de Ambiente

Configure os servidores usando a variável de ambiente `GAME_SERVERS`:

```bash
export GAME_SERVERS='[
  {
    "name": "cs2-server-1",
    "type": "cs2",
    "host": "localhost",
    "port": 27015
  },
  {
    "name": "minecraft-server-1",
    "type": "minecraft",
    "host": "minecraft.example.com",
    "port": 25565
  }
]'
```

### Variáveis de Ambiente Disponíveis

- `GAME_SERVERS`: JSON array com configuração dos servidores (padrão: servidor CS2 local)
- `PORT`: Porta do servidor HTTP (padrão: 9090). **Nota:** Se o Prometheus já estiver usando 9090, configure `PORT=9091`
- `SCRAPE_INTERVAL`: Intervalo de consulta em milissegundos (padrão: 30000 = 30 segundos)

### Executar

```bash
npm start
```

Ou em modo desenvolvimento com auto-reload:

```bash
npm run dev
```

## Tipos de Jogos Suportados

O gamedig suporta mais de 100 tipos de jogos. Veja a lista completa em: https://github.com/gamedig/node-gamedig#games-list

Alguns exemplos populares:
- `cs2` - Counter-Strike 2
- `csgo` - Counter-Strike: Global Offensive
- `minecraft` - Minecraft
- `tf2` - Team Fortress 2
- `rust` - Rust
- `ark` - ARK: Survival Evolved
- `valheim` - Valheim
- E muitos outros...

## Endpoints

- `GET /metrics` - Métricas do Prometheus
- `GET /health` - Health check

## Arquitetura

### Como funciona

**Importante:** O Prometheus faz scrape do **exporter** (não dos servidores de jogos diretamente). Os servidores de jogos podem ser configurados de duas formas:

1. **Via query parameters no `prometheus.yml`** (recomendado) - cada servidor como um target separado
2. **Via variável de ambiente `GAME_SERVERS`** - servidores padrão consultados periodicamente

**Fluxo de dados:**
```
Servidores de Jogos → Game Server Exporter → Prometheus → Grafana
     (gamedig)         (express + /metrics)   (scrape)    (visualização)
```

**Passo a passo:**
1. Você configura os servidores de jogos no `prometheus.yml` via query parameters OU no exporter via `GAME_SERVERS`
2. O exporter consulta os servidores usando gamedig quando o Prometheus faz scrape (ou periodicamente para servidores padrão)
3. O exporter expõe métricas em `/metrics` (endpoint HTTP)
4. O Prometheus faz scrape do exporter (a cada `scrape_interval` configurado)
5. O Prometheus armazena as métricas e você pode visualizar no Grafana

## Configuração do Prometheus

### Método 1: Configuração via Query Parameters (Recomendado)

Configure cada servidor de jogo diretamente no `prometheus.yml` usando query parameters na URL do target:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Métricas do próprio Prometheus
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Game Server Exporter
  # Configure cada servidor como um target separado com query parameters
  - job_name: 'game-servers'
    scrape_interval: 30s
    static_configs:
      # Servidor Quake 3
      - targets: ['localhost:9091?host=127.0.0.1&port=28960&type=quake3&name=quake3-server']
        labels:
          server-ip: '127.0.0.1'
          server-port: '28960'
          gamedig-type: 'quake3'
          exporter: 'game-server'
      
      # Servidor CS2
      - targets: ['localhost:9091?host=192.168.1.100&port=27015&type=cs2&name=cs2-server']
        labels:
          server-ip: '192.168.1.100'
          server-port: '27015'
          gamedig-type: 'cs2'
          exporter: 'game-server'
      
      # Servidor Minecraft
      - targets: ['localhost:9091?host=minecraft.example.com&port=25565&type=minecraft&name=minecraft-server']
        labels:
          server-ip: 'minecraft.example.com'
          server-port: '25565'
          gamedig-type: 'minecraft'
          exporter: 'game-server'
    metrics_path: '/metrics'
```

**Parâmetros de query disponíveis:**
- `host` (obrigatório): IP ou hostname do servidor de jogo
- `port` (obrigatório): Porta do servidor de jogo
- `type` (obrigatório): Tipo do jogo conforme gamedig (cs2, quake3, minecraft, etc.)
- `name` (opcional): Nome do servidor (padrão: `{type}-{host}-{port}`)

**Vantagens deste método:**
- Configuração centralizada no Prometheus
- Fácil adicionar/remover servidores
- Labels personalizados por servidor
- Cada servidor consultado apenas quando o Prometheus faz scrape

### Método 2: Configuração via Variável de Ambiente

Configure os servidores no exporter via variável de ambiente `GAME_SERVERS`:

```bash
export GAME_SERVERS='[
  {
    "name": "cs2-server-1",
    "type": "cs2",
    "host": "192.168.1.100",
    "port": 27015
  },
  {
    "name": "minecraft-server-1",
    "type": "minecraft",
    "host": "minecraft.example.com",
    "port": 25565
  }
]'
npm start
```

E no `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'game-servers'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:9091']
    metrics_path: '/metrics'
```

**Nota:** Com este método, os servidores são consultados periodicamente pelo exporter (a cada `SCRAPE_INTERVAL` ms), independente do scrape do Prometheus.

## Executando com Docker

### Usando Docker Compose (Recomendado)

O `docker-compose.yml` inclui tanto o exporter quanto o Prometheus configurados e prontos para uso.

1. Edite o `prometheus.yml` para configurar seus servidores de jogos (veja seção de configuração abaixo)
2. Inicie os containers:

```bash
docker-compose up -d
```

3. Verifique os logs:

```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs apenas do exporter
docker-compose logs -f game-server-exporter

# Logs apenas do Prometheus
docker-compose logs -f prometheus
```

4. Acesse os serviços:
   - **Métricas do exporter**: `http://localhost:9091/metrics`
   - **Interface do Prometheus**: `http://localhost:9090`
   - **Health check do exporter**: `http://localhost:9091/health`

5. Configure seus servidores de jogos no `prometheus.yml` (veja seção de configuração)

### Usando Docker diretamente

```bash
# Build da imagem
docker build -t gs-exporter .

# Executar o container
docker run -d \
  --name gs-exporter \
  -p 9091:9090 \
  -e PORT=9090 \
  -e SCRAPE_INTERVAL=30000 \
  --restart unless-stopped \
  gs-exporter
```

### Configuração de Rede Docker

**Importante:** Se os servidores de jogos estiverem na rede local (host), você pode precisar usar `network_mode: host`:

**Opção 1:** Usar o arquivo alternativo `docker-compose.host-network.yml`:

```bash
docker-compose -f docker-compose.host-network.yml up -d
```

**Opção 2:** Modificar o `docker-compose.yml` para usar `network_mode: host` (descomente a linha no arquivo)

**Opção 3:** Usar `--network host` no docker run:

```bash
docker run -d --network host --name gs-exporter gs-exporter
```

**Nota:** Com `network_mode: host`, não é necessário mapear portas (`ports`), pois o container usa a rede do host diretamente. Isso permite que o exporter acesse servidores de jogos na rede local usando endereços como `127.0.0.1` ou `192.168.x.x`.

### Acessando Servidores de Jogos do Docker

Quando o exporter está rodando no Docker e precisa acessar servidores de jogos:

**Se os servidores estão no mesmo host:**
- Use `host.docker.internal` no `prometheus.yml` para acessar serviços no host
- Exemplo: `host=host.docker.internal&port=28960`

**Se os servidores estão na rede local:**
- Use o IP real do servidor (ex: `192.168.1.100`)
- Certifique-se de que a rede Docker permite acesso à rede local

**Se os servidores estão em outro container Docker:**
- Use o nome do serviço do docker-compose ou o IP do container
- Exemplo: `host=game-server-container&port=27015`

### Variáveis de Ambiente no Docker

Você pode configurar servidores padrão via variável de ambiente:

```bash
docker run -d \
  --name gs-exporter \
  -p 9091:9090 \
  -e GAME_SERVERS='[{"name":"cs2-server","type":"cs2","host":"192.168.1.100","port":27015}]' \
  gs-exporter
```

Ou no `docker-compose.yml`:

```yaml
environment:
  - GAME_SERVERS=[{"name":"cs2-server","type":"cs2","host":"192.168.1.100","port":27015}]
```

## Exemplo de Métricas

```
# HELP game_server_players_current Número atual de jogadores no servidor
# TYPE game_server_players_current gauge
game_server_players_current{game="cs2",host="localhost",port="27015",server_name="cs2-server-1"} 12

# HELP game_server_players_max Número máximo de jogadores no servidor
# TYPE game_server_players_max gauge
game_server_players_max{game="cs2",host="localhost",port="27015",server_name="cs2-server-1"} 20

# HELP game_server_online Se o servidor está online (1) ou offline (0)
# TYPE game_server_online gauge
game_server_online{game="cs2",host="localhost",port="27015",server_name="cs2-server-1"} 1
```

## Licença

MIT

