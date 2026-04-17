const fs = require('fs');
const path = require('path');

function generateMigrationSQL() {
  console.log('📄 Gerando arquivo SQL único com todas as migrações...\n');

  const migrationsDir = path.join(__dirname, 'database', 'migrations');
  const outputFile = path.join(__dirname, 'database', 'full_migration.sql');

  // Cabeçalho do arquivo
  let sql = `-- Migração completa - Delegacia da Mulher
-- Gerado em: ${new Date().toISOString()}
-- Execute este arquivo no seu banco PostgreSQL

\\c railway;

`;

  // Listar arquivos de migração
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`📁 Encontrados ${migrationFiles.length} arquivos de migração\n`);

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    sql += `-- ===========================================
-- Migração: ${file}
-- ===========================================

${fileContent}

`;
    console.log(`✅ Adicionado: ${file}`);
  }

  // Adicionar seed data
  const seedDir = path.join(__dirname, 'database', 'seeds');
  const seedFiles = fs.readdirSync(seedDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  if (seedFiles.length > 0) {
    sql += `
-- ===========================================
-- SEEDS DATA
-- ===========================================

`;

    for (const file of seedFiles) {
      const filePath = path.join(seedDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');

      sql += `-- Seed: ${file}

${fileContent}

`;
      console.log(`✅ Seed adicionado: ${file}`);
    }
  }

  // Escrever arquivo
  fs.writeFileSync(outputFile, sql, 'utf8');

  console.log(`\n🎉 Arquivo gerado: ${outputFile}`);
  console.log('\n📋 Para executar no Railway:');
  console.log('1. Acesse o painel do Railway');
  console.log('2. Vá para a aba "Query" do seu banco PostgreSQL');
  console.log('3. Execute o conteúdo do arquivo full_migration.sql');
  console.log('\n⚠️  IMPORTANTE: Execute apenas uma vez!');
}

generateMigrationSQL();