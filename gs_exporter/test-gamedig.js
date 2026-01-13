#!/usr/bin/env node

/**
 * Script de teste para gamedig
 * Testa se consegue consultar um servidor de jogo diretamente
 * 
 * Uso:
 *   node test-gamedig.js <tipo> <host> <porta>
 * 
 * Exemplos:
 *   node test-gamedig.js cod2 80.75.221.52 28960
 *   node test-gamedig.js cs2 192.168.1.100 27015
 *   node test-gamedig.js minecraft minecraft.example.com 25565
 */

const Gamedig = require('gamedig');

// Verificar argumentos
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Uso: node test-gamedig.js <tipo> <host> <porta>');
  console.error('');
  console.error('Exemplos:');
  console.error('  node test-gamedig.js cod2 80.75.221.52 28960');
  console.error('  node test-gamedig.js cs2 192.168.1.100 27015');
  console.error('  node test-gamedig.js minecraft minecraft.example.com 25565');
  console.error('');
  console.error('Tipos de jogos suportados: https://github.com/gamedig/node-gamedig#games-list');
  process.exit(1);
}

const [type, host, port] = args;
const portNumber = parseInt(port);

if (isNaN(portNumber)) {
  console.error(`Erro: Porta inválida: ${port}`);
  process.exit(1);
}

console.log('='.repeat(60));
console.log('Teste de Gamedig');
console.log('='.repeat(60));
console.log(`Tipo do jogo: ${type}`);
console.log(`Host: ${host}`);
console.log(`Porta: ${portNumber}`);
console.log('='.repeat(60));
console.log('');

console.log('Consultando servidor...\n');

const startTime = Date.now();

Gamedig.query({
  type: type,
  host: host,
  port: portNumber
})
  .then((state) => {
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCESSO! Servidor está ONLINE\n');
    console.log('Informações do servidor:');
    console.log('-'.repeat(60));
    console.log(`Nome: ${state.name || 'N/A'}`);
    console.log(`Mapa: ${state.map || 'N/A'}`);
    console.log(`Jogadores: ${state.players.length}/${state.maxplayers}`);
    console.log(`Bots: ${state.bots ? state.bots.length : 0}`);
    console.log(`Ping: ${state.ping || 'N/A'}ms`);
    console.log(`Tempo de resposta: ${duration}ms`);
    
    if (state.players && state.players.length > 0) {
      console.log('\nJogadores online:');
      state.players.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.name || 'Sem nome'} (Score: ${player.score || 0})`);
      });
    }
    
    if (state.raw) {
      console.log('\nDados brutos (raw):');
      console.log(JSON.stringify(state.raw, null, 2));
    }
    
    console.log('\n' + '='.repeat(60));
    process.exit(0);
  })
  .catch((error) => {
    const duration = Date.now() - startTime;
    
    console.log('❌ ERRO! Não foi possível consultar o servidor\n');
    console.log('Detalhes do erro:');
    console.log('-'.repeat(60));
    console.log(`Mensagem: ${error.message}`);
    console.log(`Tempo de resposta: ${duration}ms`);
    
    if (error.message.includes('Failed all')) {
      console.log('\n💡 Possíveis causas:');
      console.log('  - Servidor está offline');
      console.log('  - Porta está incorreta');
      console.log('  - Firewall bloqueando a conexão');
      console.log('  - Tipo do jogo pode estar incorreto');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Possíveis causas:');
      console.log('  - Servidor não respondeu a tempo');
      console.log('  - Rede lenta ou instável');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('\n💡 Possíveis causas:');
      console.log('  - Hostname não encontrado (DNS)');
      console.log('  - Host incorreto');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Possíveis causas:');
      console.log('  - Porta está fechada');
      console.log('  - Servidor não está escutando nessa porta');
    }
    
    console.log('\n💡 Dicas:');
    console.log('  - Verifique se o servidor está rodando');
    console.log('  - Verifique se a porta está correta');
    console.log('  - Verifique se o tipo do jogo está correto');
    console.log('  - Lista de tipos: https://github.com/gamedig/node-gamedig#games-list');
    
    console.log('\n' + '='.repeat(60));
    process.exit(1);
  });

