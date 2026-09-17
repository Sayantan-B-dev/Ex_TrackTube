import "server-only";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});

pool.on("error", () => {
  // idle client error, pool handles reconnection
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function getRow(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function getRows(text, params) {
  const result = await query(text, params);
  return result.rows;
}

export async function exec(text, params) {
  const result = await query(text, params);
  return result;
}
