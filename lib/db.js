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
  } catch (e) {
    console.error("[db] Failed to parse NEON_DATABASE_URL:", e.message);
    console.error("[db] Raw URL:", rawUrl);
    config = { connectionString: rawUrl };
  }
} else {
  console.error("[db] NEON_DATABASE_URL is not set!");
}

const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("[db] Pool idle client error:", err.message);
  console.error("[db] Error code:", err.code);
  console.error("[db] Stack:", err.stack);
});

pool.on("connect", () => {
  console.log("[db] Connected to NeonDB");
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (e) {
    console.error("[db] Query error:", e.message);
    console.error("[db] Query:", text);
    console.error("[db] Error code:", e.code);
    console.error("[db] Stack:", e.stack);
    throw e;
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
