import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'cooking_assistant',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pgPool.connect()
  .then(client => {
    console.log('✅ PostgreSQL database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.error('Please check your database configuration in .env file');
  });

// MySQL ? 플레이스홀더를 PostgreSQL $1, $2, ... 로 변환
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// MySQL 전용 문법을 PostgreSQL 문법으로 변환 (convertPlaceholders 실행 전에 호출)
function convertSyntax(sql) {
  return sql
    .replace(/\bCURDATE\(\)/gi, 'CURRENT_DATE')
    .replace(
      /\bDATE_ADD\s*\(\s*(?:CURDATE\(\)|CURRENT_DATE)\s*,\s*INTERVAL\s+(\?|\d+)\s+DAY\s*\)/gi,
      (_, val) => `(CURRENT_DATE + (${val} * INTERVAL '1 day'))`
    );
}

// query() - MySQL2와 호환되는 반환 형식
// SELECT: rows 배열 반환 (rows[0], rows.length 등 사용 가능)
// DML: rows.affectedRows 로 영향받은 행 수 확인 가능
export async function query(sql, params = []) {
  try {
    const convertedSql = convertPlaceholders(convertSyntax(sql));
    const result = await pgPool.query(convertedSql, params);
    const rows = result.rows || [];
    rows.affectedRows = result.rowCount;
    rows.insertId = result.rows?.[0]?.id ?? null;
    return rows;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

// transaction() - 트랜잭션 실행
export async function transaction(callback) {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// communityController.js에서 pool.query() 패턴으로 사용하므로 MySQL2 호환 래퍼 제공
// [rows, fields] 구조로 반환
const pool = {
  query: async (sql, params = []) => {
    try {
      const convertedSql = convertPlaceholders(convertSyntax(sql));
      const result = await pgPool.query(convertedSql, params);
      const rows = result.rows || [];
      rows.affectedRows = result.rowCount;
      return [rows, []];
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  },
};

export default pool;
