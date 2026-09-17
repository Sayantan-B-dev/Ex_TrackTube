import "server-only";
import { Pool } from "pg";

const rawUrl = process.env.NEON_DATABASE_URL;
let config;

if (rawUrl) {
  try {
    const url = new URL(rawUrl);
    config = {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.has("sslmode") ? { rejectUnauthorized: false } : undefined,
    };
    if (url.searchParams.has("channel_binding")) {
      config.channel_binding = url.searchParams.get("channel_binding");
    }
  } catch {
    config = { connectionString: rawUrl };
  }
}

const pool = new Pool(config);

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
