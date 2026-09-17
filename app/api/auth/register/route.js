import { query } from "../../../../lib/db";
import { hashPassword, signToken, jsonError } from "../../../../lib/auth";

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

    if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return jsonError(
        400,
        "invalid_username",
        "Username must be 3–20 characters using letters, numbers, dots, dashes or underscores."
      );
    }
    if (password.length < 6) {
      return jsonError(400, "weak_password", "Password must be at least 6 characters long.");
    }

    const existing = await query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    if (existing.rows.length > 0) {
      return jsonError(409, "username_taken", "That username is already taken.");
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, created_at`,
      [username, passwordHash]
    );
    const user = result.rows[0];

    return Response.json(
      {
        token: signToken(user),
        user: { id: user.id, username: user.username, createdAt: user.created_at },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("register error:", err);
    return jsonError(500, "internal", err.message || "Registration failed.");
  }
}
