import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const DB = process.env.DB_NAME || 'cooking_assistant';
  const baseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };

  console.log('🔄 Starting migration...\n');

  // 1. postgres DB에 연결하여 DB 초기화
  const adminClient = new Client({ ...baseConfig, database: 'postgres' });
  await adminClient.connect();

  console.log(`🚨 Initializing Database: ${DB}`);

  // 기존 연결 강제 종료 후 DB 삭제
  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB}' AND pid <> pg_backend_pid()
  `);
  await adminClient.query(`DROP DATABASE IF EXISTS "${DB}"`);
  await adminClient.query(`CREATE DATABASE "${DB}" ENCODING 'UTF8'`);
  await adminClient.end();
  console.log(`✅ Database ${DB} dropped and recreated.\n`);

  // 2. cooking_assistant DB에 연결하여 마이그레이션 실행
  const client = new Client({ ...baseConfig, database: DB });
  await client.connect();
  console.log(`✅ Connected to DB: ${DB}`);

  try {
    // SQL 파일 목록 (정렬 순서대로 실행)
    const migrationFiles = readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📦 SQL files: ${migrationFiles.join(', ')}\n`);

    for (const file of migrationFiles) {
      console.log(`➡️  Executing: ${file}`);
      const sql = readFileSync(join(__dirname, file), 'utf8');

      // pg는 파라미터 없는 query() 호출 시 multi-statement 지원
      await client.query(sql);
      console.log(`   ✔ Done: ${file}`);
    }

    console.log('\n🎉 Migration completed successfully!\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
