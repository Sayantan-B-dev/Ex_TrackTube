import { query } from "../../../../lib/db";
import { verifyPassword, signToken, jsonError } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    let body = null;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "bad_request", "Invalid JSON body.");
    }

    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return jsonError(400, "missing_fields", "Username and password are required.");
    }

    const result = await query(
      `SELECT id, username, password_hash, created_at FROM users WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return jsonError(401, "invalid_credentials", "Invalid username or password.");
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return jsonError(401, "invalid_credentials", "Invalid username or password.");
    }

    return Response.json({
      token: signToken(user),
      user: { id: user.id, username: user.username, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("login error:", err);
    return jsonError(500, "internal", err.message || "Login failed.");
  }
}
