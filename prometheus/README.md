# Prometheus Configuration

This folder contains all Prometheus configuration files.

## Structure

- `prometheus.yml` - Main Prometheus configuration file
- `targets/` - JSON files with monitoring targets
  - `linux-targets.json` - Linux servers (Node Exporter)
  - `windows-targets.json` - Windows servers (Windows Exporter)
  - `process-exporter-targets.json` - Servers with Process Exporter
  - `cadvisor-targets.json` - Servers with cAdvisor (container monitoring)
  - `icmp-targets.json` - Targets for ICMP monitoring (ping)
  - `targets.json` - Game servers (Game Server Exporter)
- `rules/` - Alert and recording rules
  - `game-servers.yml` - Alert rules for game servers
- `alerts/` - Additional alert files (optional)

## Configuration

### Adding Targets

Targets are configured through JSON files in the `targets/` folder. Prometheus uses Service Discovery (file_sd) to read these files automatically.

#### 1. Linux Servers (Node Exporter)

Edit `targets/linux-targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:9100"],
    "labels": {
      "name": "SERVER_NAME",
      "os": "linux",
      "environment": "production"
    }
  }
]
```

**Example:**
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

#### 2. Windows Servers (Windows Exporter)

Edit `targets/windows-targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:9182"],
    "labels": {
      "name": "SERVER_NAME",
      "os": "windows",
      "environment": "production"
    }
  }
]
```

**Example:**
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

Edit `targets/process-exporter-targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:9256"],
    "labels": {
      "name": "SERVER_NAME",
      "os": "linux",
      "environment": "production",
      "exporter": "process"
    }
  }
]
```

**Example:**
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

#### 4. cAdvisor (Docker Container Monitoring)

Edit `targets/cadvisor-targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:9098"],
    "labels": {
      "server_name": "SERVER_NAME",
      "os": "linux",
      "environment": "production",
      "exporter": "cadvisor"
    }
  }
]
```

**Note:** Use `server_name` instead of `name` to avoid conflict with the `name` label from cAdvisor metrics (which represents the container name).

**Example:**
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

#### 5. ICMP Monitoring (Ping)

Edit `targets/icmp-targets.json`:

```json
[
  {
    "targets": ["IP_OR_HOSTNAME"],
    "labels": {
      "name": "DESCRIPTIVE_NAME",
      "type": "dns|cloud|bu"
    }
  }
]
```

**Example:**
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

#### 6. Game Servers (Game Server Exporter)

Edit `targets/targets.json`:

```json
[
  {
    "targets": ["SERVER_IP:PORT"],
    "labels": {
      "gamedig-type": "GAME_TYPE",
      "exporter": "game-server"
    }
  }
]
```

**Example:**
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

### Alert Rules

Alert rules are in `rules/game-servers.yml`. You can:

1. Edit existing rules
2. Add new rules to the same file
3. Create new `.yml` files in the `rules/` folder

### Reload Configuration

After modifying files, you can reload the Prometheus configuration without restarting:

```bash
# Via Prometheus API
curl -X POST http://localhost:9090/-/reload

# Or restart the container
docker-compose restart prometheus
```

## Supported Game Types

See the complete list at: https://github.com/gamedig/node-gamedig#games-list

Some popular examples:
- `cs2` - Counter-Strike 2
- `csgo` - Counter-Strike: Global Offensive
- `minecraft` - Minecraft
- `quake3` - Quake 3 Arena
- `tf2` - Team Fortress 2
- `rust` - Rust
- `ark` - ARK: Survival Evolved
- `valheim` - Valheim
