import { query } from "../../../../lib/db";
import { getUserFromRequest, jsonError } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return jsonError(401, "unauthorized", "Missing or invalid token.");
    }

    const result = await query(
      `SELECT id, username, created_at FROM users WHERE id = $1`,
      [authUser.id]
    );
    const user = result.rows[0];

    if (!user) {
      return jsonError(401, "unauthorized", "This account no longer exists.");
    }

    return Response.json({
      user: { id: user.id, username: user.username, createdAt: user.created_at },
    });
  } catch (err) {
    console.error("me error:", err);
    return jsonError(500, "internal", err.message || "Could not load the session.");
  }
}
