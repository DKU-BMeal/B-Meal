import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function rollback() {
  let conn;

  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await conn.query(`USE ${process.env.DB_NAME}`);

    console.log("⚠️ Starting rollback: dropping all tables...");

    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    const [tables] = await conn.query("SHOW TABLES");

    for (const t of tables) {
      const table = Object.values(t)[0];
      console.log(`   Dropping: ${table}`);
      await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
    }

    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n🧨 Rollback complete. Database is now clean.\n");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
  } finally {
    if (conn) await conn.end();
  }
}

rollback();
