import { supabase } from "../../../../lib/supabase";
import { getUserFromRequest, jsonError } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return jsonError(401, "unauthorized", "Missing or invalid token.");
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, created_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      return jsonError(500, "db_error", "Could not load the account. Please try again.");
    }
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