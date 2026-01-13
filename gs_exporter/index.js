const express = require('express');
const Gamedig = require('gamedig');
const { Registry, Gauge, Counter } = require('prom-client');
const fs = require('fs');
const path = require('path');

// Criar um registro de métricas do Prometheus
const register = new Registry();

// Métricas do Prometheus
const serverPlayers = new Gauge({
  name: 'game_server_players_current',
  help: 'Número atual de jogadores no servidor',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverMaxPlayers = new Gauge({
  name: 'game_server_players_max',
  help: 'Número máximo de jogadores no servidor',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverBots = new Gauge({
  name: 'game_server_bots',
  help: 'Número de bots no servidor',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverPing = new Gauge({
  name: 'game_server_ping_ms',
  help: 'Latência do servidor em milissegundos',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverOnline = new Gauge({
  name: 'game_server_online',
  help: 'Se o servidor está online (1) ou offline (0)',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverQueryErrors = new Counter({
  name: 'game_server_query_errors_total',
  help: 'Total de erros ao consultar servidores',
  labelNames: ['server_name', 'game', 'host', 'port'],
  registers: [register]
});

const serverHostname = new Gauge({
  name: 'game_server_hostname_info',
  help: 'Hostname do servidor de jogo (sempre 1, hostname no label)',
  labelNames: ['server_name', 'game', 'host', 'port', 'hostname'],
  registers: [register]
});

const serverMap = new Gauge({
  name: 'game_server_map_info',
  help: 'Mapa do servidor de jogo (sempre 1, map no label)',
  labelNames: ['server_name', 'game', 'host', 'port', 'map'],
  registers: [register]
});

// Métrica adicional para o mapa como valor (para exibir em stat panel)
const serverMapValue = new Gauge({
  name: 'game_server_map',
  help: 'Nome do mapa atual do servidor (valor sempre 1, nome do mapa no label)',
  labelNames: ['server_name', 'game', 'host', 'port', 'map_name'],
  registers: [register]
});

// Métrica para informações do servidor (raw data como JSON string) - mantida para compatibilidade
const serverRawInfo = new Gauge({
  name: 'game_server_raw_info',
  help: 'Dados raw do servidor (sempre 1, raw_data no label como JSON string)',
  labelNames: ['server_name', 'game', 'host', 'port', 'raw_data'],
  registers: [register]
});

// Métrica para campos individuais do raw data
const serverRawField = new Gauge({
  name: 'game_server_raw_field',
  help: 'Campo individual dos dados raw do servidor (valor do campo, field_name e field_value no label)',
  labelNames: ['server_name', 'game', 'host', 'port', 'field_name', 'field_value'],
  registers: [register]
});

// Métrica para jogadores (cada jogador é uma série separada)
const serverPlayerInfo = new Gauge({
  name: 'game_server_player_info',
  help: 'Informações do jogador (sempre 1, player_name no label)',
  labelNames: ['server_name', 'game', 'host', 'port', 'player_name', 'player_index'],
  registers: [register]
});

const serverPlayerScore = new Gauge({
  name: 'game_server_player_score',
  help: 'Score do jogador',
  labelNames: ['server_name', 'game', 'host', 'port', 'player_name', 'player_index'],
  registers: [register]
});

// Função para carregar servidores do targets.json
function loadServers() {
  const targetsFile = process.env.TARGETS_JSON_FILE || '/etc/prometheus/targets.json';
  
  console.log(`[${new Date().toISOString()}] Tentando carregar servidores de: ${targetsFile}`);
  
  // Tentar carregar do arquivo targets.json
  if (fs.existsSync(targetsFile)) {
    try {
      const content = fs.readFileSync(targetsFile, 'utf8');
      const targets = JSON.parse(content);
      
      console.log(`[${new Date().toISOString()}] Arquivo targets.json encontrado`);
      
      const servers = [];
      
      // Processar cada target do JSON
      if (Array.isArray(targets)) {
        targets.forEach(targetConfig => {
          if (targetConfig.targets && Array.isArray(targetConfig.targets)) {
            targetConfig.targets.forEach(target => {
              // Extrair host e porta do target (formato: "host:port")
              const [host, port] = target.split(':');
              
              // Extrair labels
              const labels = targetConfig.labels || {};
              const gamedigType = labels['gamedig-type'] || labels['gamedig_type'] || 'unknown';
              
              const server = {
                name: labels.name || `${gamedigType}-${host}-${port}`,
                host: host,
                port: parseInt(port),
                type: gamedigType
              };
              
              servers.push(server);
              console.log(`[${new Date().toISOString()}] Servidor carregado:`, server);
            });
          }
        });
      }
      
      if (servers.length > 0) {
        console.log(`[${new Date().toISOString()}] Total de servidores carregados: ${servers.length}`);
        return servers;
      } else {
        console.warn(`[${new Date().toISOString()}] Nenhum servidor encontrado no targets.json`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Erro ao carregar ${targetsFile}:`, error.message);
      console.error(error.stack);
    }
  } else {
    console.warn(`[${new Date().toISOString()}] Arquivo targets.json não encontrado: ${targetsFile}`);
  }
  
  // Fallback para variável de ambiente
  if (process.env.GAME_SERVERS) {
    console.log(`[${new Date().toISOString()}] Usando variável de ambiente GAME_SERVERS`);
    return JSON.parse(process.env.GAME_SERVERS);
  }
  
  // Nenhum servidor encontrado
  console.warn(`[${new Date().toISOString()}] Nenhum servidor configurado. Configure servidores no targets.json`);
  return [];
}

// Carregar servidores na inicialização (apenas para logs)
const initialServers = loadServers();
console.log(`[${new Date().toISOString()}] Exporter iniciado. ${initialServers.length} servidor(es) encontrado(s) no arquivo de configuração.`);

// Cache para armazenar dados dos servidores (incluindo jogadores)
const serverDataCache = new Map();

const app = express();
const PORT = process.env.PORT || 9090;
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL || '30000'); // 30 segundos por padrão

// Habilitar CORS para permitir requisições do Grafana
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Limpar métricas antigas de jogadores antes de atualizar
function clearPlayerMetrics(serverName) {
  // Não há método direto para limpar métricas específicas no prom-client
  // As métricas antigas serão sobrescritas pelas novas
  // Se um jogador sair, a métrica ficará com valor 0 ou será removida na próxima atualização
}

// Endpoint de métricas do Prometheus
app.get('/metrics', async (req, res) => {
  try {
    // Sempre recarregar servidores do arquivo targets.json
    // Isso garante que sempre usa os mesmos servidores que o Prometheus está configurado para monitorar
    const servers = loadServers();
    
    console.log(`[${new Date().toISOString()}] /metrics chamado. Consultando ${servers.length} servidor(es)...`);
    
    // Consultar todos os servidores configurados
    const promises = servers.map(server => queryServer(server));
      await Promise.allSettled(promises);
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    console.error(`[${new Date().toISOString()}] Erro no endpoint /metrics:`, ex);
    res.status(500).end(ex.message || String(ex));
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint para obter jogadores de um servidor específico
app.get('/players', async (req, res) => {
  try {
    const serverName = req.query.server_name;
    
    if (!serverName) {
      return res.status(400).json({ error: 'Parâmetro server_name é obrigatório' });
    }
    
    // Buscar dados do cache
    const serverData = serverDataCache.get(serverName);
    
    if (!serverData) {
      return res.status(404).json({ error: 'Servidor não encontrado ou dados não disponíveis' });
    }
    
    res.json({
      server_name: serverName,
      players: serverData.players || [],
      timestamp: serverData.timestamp
    });
  } catch (ex) {
    console.error(`[${new Date().toISOString()}] Erro no endpoint /players:`, ex);
    res.status(500).json({ error: ex.message || String(ex) });
  }
});

// Endpoint para obter informações completas do servidor (incluindo dados raw)
app.get('/server-info', async (req, res) => {
  try {
    const serverName = req.query.server_name;
    
    if (!serverName) {
      return res.status(400).json({ error: 'Parâmetro server_name é obrigatório' });
    }
    
    // Buscar dados do cache
    const serverData = serverDataCache.get(serverName);
    
    if (!serverData) {
      return res.status(404).json({ error: 'Servidor não encontrado ou dados não disponíveis' });
    }
    
    res.json({
      server_name: serverName,
      ...serverData
    });
  } catch (ex) {
    console.error(`[${new Date().toISOString()}] Erro no endpoint /server-info:`, ex);
    res.status(500).json({ error: ex.message || String(ex) });
  }
});

// Endpoint para obter jogadores formatados em HTML
app.get('/players-html', async (req, res) => {
  try {
    const serverName = req.query.server_name;
    
    if (!serverName) {
      return res.status(400).send('<p style="color: red;">Parâmetro server_name é obrigatório</p>');
    }
    
    // Buscar dados do cache
    const serverData = serverDataCache.get(serverName);
    
    if (!serverData) {
      return res.status(404).send('<p style="color: red;">Servidor não encontrado ou dados não disponíveis</p>');
    }
    
    const players = serverData.players || [];
    
    if (players.length === 0) {
      return res.send('<p>Nenhum jogador online no momento.</p>');
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; border: 1px solid #444;">';
    html += '<thead><tr style="background: #2d2d2d;">';
    html += '<th style="border: 1px solid #444; padding: 8px; text-align: left;">#</th>';
    html += '<th style="border: 1px solid #444; padding: 8px; text-align: left;">Nome</th>';
    html += '<th style="border: 1px solid #444; padding: 8px; text-align: left;">Score</th>';
    html += '</tr></thead><tbody>';
    
    players.forEach((player, index) => {
      html += '<tr>';
      html += '<td style="border: 1px solid #444; padding: 8px;">' + (index + 1) + '</td>';
      html += '<td style="border: 1px solid #444; padding: 8px;">' + (player.name || 'Sem nome') + '</td>';
      html += '<td style="border: 1px solid #444; padding: 8px;">' + (player.score || 0) + '</td>';
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '<p style="margin-top: 10px; font-size: 12px; color: #999;">Atualizado: ' + new Date(serverData.timestamp).toLocaleString() + '</p>';
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (ex) {
    console.error(`[${new Date().toISOString()}] Erro no endpoint /players-html:`, ex);
    res.status(500).send('<p style="color: red;">Erro: ' + ex.message + '</p>');
  }
});

// Endpoint para obter informações do servidor formatadas em HTML (incluindo dados raw)
app.get('/server-info-html', async (req, res) => {
  try {
    const serverName = req.query.server_name;
    
    if (!serverName) {
      return res.status(400).send('<p style="color: red;">Parâmetro server_name é obrigatório</p>');
    }
    
    // Buscar dados do cache
    const serverData = serverDataCache.get(serverName);
    
    if (!serverData) {
      return res.status(404).send('<p style="color: red;">Servidor não encontrado ou dados não disponíveis</p>');
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
    html += '<tr><td style="border: 1px solid #444; padding: 8px; font-weight: bold; background: #2d2d2d;">Hostname:</td><td style="border: 1px solid #444; padding: 8px;">' + (serverData.hostname || 'N/A') + '</td></tr>';
    html += '<tr><td style="border: 1px solid #444; padding: 8px; font-weight: bold; background: #2d2d2d;">Mapa:</td><td style="border: 1px solid #444; padding: 8px;">' + (serverData.map || 'N/A') + '</td></tr>';
    html += '<tr><td style="border: 1px solid #444; padding: 8px; font-weight: bold; background: #2d2d2d;">Jogo:</td><td style="border: 1px solid #444; padding: 8px;">' + (serverData.game || 'N/A') + '</td></tr>';
    html += '</table>';
    
    html += '<h4 style="margin-top: 20px;">Dados Raw:</h4>';
    html += '<pre style="background: #1f1f1f; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 11px; max-height: 400px; overflow-y: auto;">';
    html += JSON.stringify(serverData.raw || {}, null, 2);
    html += '</pre>';
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (ex) {
    console.error(`[${new Date().toISOString()}] Erro no endpoint /server-info-html:`, ex);
    res.status(500).send('<p style="color: red;">Erro: ' + ex.message + '</p>');
  }
});

// Função para consultar um servidor
async function queryServer(serverConfig) {
  const { name, type, host, port } = serverConfig;
  
  try {
    const state = await Gamedig.query({
      type: type,
      host: host,
      port: port
    });

    // Atualizar métricas
    const labels = {
      server_name: name,
      game: type,
      host: host,
      port: port.toString()
    };

    serverOnline.set(labels, 1);
    
    // Converter valores para números (podem vir como string do gamedig)
    const players = state.players ? state.players.length : 0;
    
    // Converter maxplayers - pode vir como string, número, ou undefined
    let maxPlayers = 0;
    if (state.maxplayers !== undefined && state.maxplayers !== null) {
      const rawValue = state.maxplayers;
      console.log(`[${new Date().toISOString()}] DEBUG: maxplayers raw value: ${rawValue} (type: ${typeof rawValue})`);
      
      if (typeof rawValue === 'string') {
        maxPlayers = parseInt(rawValue.trim(), 10);
      } else if (typeof rawValue === 'number') {
        maxPlayers = Math.floor(rawValue);
      } else {
        maxPlayers = Number(rawValue);
      }
      
      if (isNaN(maxPlayers) || !isFinite(maxPlayers)) {
        console.warn(`[${new Date().toISOString()}] maxplayers inválido: ${rawValue}, usando 0`);
        maxPlayers = 0;
      }
    }
    
    console.log(`[${new Date().toISOString()}] DEBUG: maxplayers final: ${maxPlayers} (type: ${typeof maxPlayers})`);
    
    const bots = state.bots ? state.bots.length : 0;
    
    // Converter ping - pode vir como string, número, ou undefined
    let ping = 0;
    if (state.ping !== undefined && state.ping !== null) {
      if (typeof state.ping === 'string') {
        ping = parseFloat(state.ping);
      } else if (typeof state.ping === 'number') {
        ping = state.ping;
      } else {
        ping = Number(state.ping);
      }
      if (isNaN(ping) || !isFinite(ping)) {
        ping = 0;
      }
    }
    
    // Garantir que todos os valores são números válidos antes de passar para o Prometheus
    const safeMaxPlayers = typeof maxPlayers === 'number' && isFinite(maxPlayers) ? maxPlayers : 0;
    const safePing = typeof ping === 'number' && isFinite(ping) ? ping : 0;
    
    serverPlayers.set(labels, players);
    serverMaxPlayers.set(labels, safeMaxPlayers);
    serverBots.set(labels, bots);
    serverPing.set(labels, safePing);
    
    // Expor hostname do servidor (usa sv_hostname do state.raw, ou fallback para state.name)
    const hostname = (state.raw && state.raw.sv_hostname) ? state.raw.sv_hostname : (state.name || '');
    
    if (hostname) {
      const hostnameLabels = {
        ...labels,
        hostname: hostname
      };
      serverHostname.set(hostnameLabels, 1);
    }

    const playersCount = state.players ? state.players.length : 0;
    console.log(`[${new Date().toISOString()}] ${name} (${type}): ${playersCount}/${safeMaxPlayers} jogadores (Ping: ${safePing}ms)`);
    
    // Expor mapa do servidor
    const mapName = state.map || '';
    if (mapName) {
      const mapLabels = {
        ...labels,
        map: mapName
      };
      serverMap.set(mapLabels, 1);
      
      // Expor também como métrica separada com map_name no label (para stat panel)
      const mapValueLabels = {
        ...labels,
        map_name: mapName
      };
      serverMapValue.set(mapValueLabels, 1);
    }
    
    // Expor dados raw como métrica (JSON string no label) - mantido para compatibilidade
    const rawDataString = JSON.stringify(state.raw || {});
    if (rawDataString && rawDataString !== '{}') {
      const rawLabels = {
        ...labels,
        raw_data: rawDataString.substring(0, 1000) // Limitar tamanho do label
      };
      serverRawInfo.set(rawLabels, 1);
    }
    
    // Expor cada campo do raw data como métrica separada
    // Usar um Set para garantir que não criamos duplicatas na mesma iteração
    const currentRawFieldKeys = new Set();
    
    if (state.raw && typeof state.raw === 'object') {
      Object.keys(state.raw).forEach(fieldName => {
        const fieldValue = state.raw[fieldName];
        // Converter valor para número se possível, senão usar 1 e colocar valor no label
        let numericValue = 1;
        let valueString = String(fieldValue);
        
        // Tentar converter para número
        if (typeof fieldValue === 'number') {
          numericValue = fieldValue;
          valueString = String(fieldValue);
        } else if (typeof fieldValue === 'boolean') {
          numericValue = fieldValue ? 1 : 0;
          valueString = String(fieldValue);
        } else if (typeof fieldValue === 'string' && !isNaN(Number(fieldValue)) && fieldValue.trim() !== '') {
          numericValue = Number(fieldValue);
          valueString = fieldValue; // Manter string original
        } else {
          // Para valores não numéricos, usar 1 e colocar o valor no label
          valueString = String(fieldValue);
        }
        
        const fieldLabels = {
          ...labels,
          field_name: fieldName,
          field_value: valueString.substring(0, 200) // Limitar tamanho do valor no label
        };
        
        // Criar uma chave única para este campo
        const fieldKey = `${name}:${fieldName}:${valueString}`;
        
        // Se já processamos este campo nesta iteração, pular
        if (currentRawFieldKeys.has(fieldKey)) {
          console.warn(`[${new Date().toISOString()}] Campo raw duplicado ignorado: ${fieldName} = ${valueString} no servidor ${name}`);
          return;
        }
        
        currentRawFieldKeys.add(fieldKey);
        serverRawField.set(fieldLabels, numericValue);
      });
    }
    
    // Expor jogadores como métricas do Prometheus
    // Cada jogador é exposto como uma série separada com labels únicos
    // Usar um Set para garantir que não criamos duplicatas na mesma iteração
    const currentPlayerKeys = new Set();
    
    if (state.players && state.players.length > 0) {
      state.players.forEach((player, index) => {
        const playerName = (player.name || 'Sem nome').substring(0, 100); // Limitar tamanho do nome
        const playerLabels = {
          ...labels,
          player_name: playerName,
          player_index: index.toString()
        };
        
        // Criar uma chave única para este jogador (baseada em nome e índice)
        const playerKey = `${name}:${playerName}:${index}`;
        
        // Se já processamos este jogador nesta iteração, pular
        if (currentPlayerKeys.has(playerKey)) {
          console.warn(`[${new Date().toISOString()}] Jogador duplicado ignorado: ${playerName} (índice ${index}) no servidor ${name}`);
          return;
        }
        
        currentPlayerKeys.add(playerKey);
        serverPlayerInfo.set(playerLabels, 1);
        serverPlayerScore.set(playerLabels, player.score || 0);
      });
    }
    
    // Armazenar dados do servidor no cache (incluindo lista de jogadores e dados raw)
    serverDataCache.set(name, {
      players: state.players || [],
      timestamp: new Date().toISOString(),
      hostname: hostname,
      map: mapName,
      game: type,
      raw: state.raw || {},
      name: state.name || '',
      maxplayers: safeMaxPlayers,
      bots: bots,
      ping: safePing
    });
  } catch (error) {
    const labels = {
      server_name: name,
      game: type,
      host: host,
      port: port.toString()
    };

    serverOnline.set(labels, 0);
    serverQueryErrors.inc(labels);
    
    // Limpar cache em caso de erro
    serverDataCache.delete(name);
    
    console.error(`[${new Date().toISOString()}] Erro ao consultar ${name} (${host}:${port}):`, error.message);
  }
  
  return state; // Retornar state para uso futuro se necessário
}

// Nota: Os servidores são consultados sob demanda quando o Prometheus faz scrape do endpoint /metrics
// Isso garante que sempre usa os servidores configurados no arquivo targets.json

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Game Server Exporter rodando na porta ${PORT}`);
  console.log(`Métricas disponíveis em http://localhost:${PORT}/metrics`);
  console.log(`Health check em http://localhost:${PORT}/health`);
  console.log(`\nConfiguração:`);
  console.log(`- Arquivo targets.json: ${process.env.TARGETS_JSON_FILE || '/etc/prometheus/targets.json'}`);
  console.log(`- Servidores carregados na inicialização: ${initialServers.length}`);
  if (initialServers.length > 0) {
    console.log(`- Servidores encontrados:`);
    initialServers.forEach(s => console.log(`  * ${s.name} (${s.type}) - ${s.host}:${s.port}`));
  }
  console.log(`\nOs servidores são consultados quando o Prometheus faz scrape do endpoint /metrics`);
  console.log(`Certifique-se de que o arquivo targets.json está configurado corretamente.`);
});

