const fs = require('fs');
const path = require('path');
const pool = require('./src/config/database');

async function runMigrations() {
  console.log('🚀 Iniciando migrações do banco de dados...\n');

  let client;
  try {
    console.log('🔌 Tentando conectar ao banco de dados...');
    client = await pool.connect();
    console.log('✅ Conexão estabelecida!\n');

    // Criar tabela de controle de migrações se não existir
    console.log('📋 Criando tabela de controle de migrações...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabela de migrações criada/verificada\n');

    // Listar arquivos de migração
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Encontrados ${migrationFiles.length} arquivos de migração\n`);

    for (const file of migrationFiles) {
      const version = file.split('_')[0];

      // Verificar se migração já foi executada
      const result = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Migração ${file} já executada, pulando...`);
        continue;
      }

      console.log(`⚡ Executando migração: ${file}`);

      // Ler e executar arquivo SQL
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query(sql);

      // Registrar migração como executada
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1)',
        [version]
      );

      console.log(`✅ Migração ${file} executada com sucesso\n`);
    }

    console.log('🎉 Todas as migrações foram executadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante migração:', error.message);
    if (error.code) {
      console.error('Código do erro:', error.code);
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Executar migrações
runMigrations()
  .then(() => {
    console.log('\n🏁 Processo de migração concluído.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na migração:', error.message);
    process.exit(1);
  });