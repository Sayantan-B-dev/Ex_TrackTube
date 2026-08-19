import { supabase } from "../../../../lib/supabase";
import { hashPassword, signToken, jsonError } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(req) {
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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    return jsonError(409, "username_taken", "That username is already taken.");
  }

  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({ username, password_hash: passwordHash })
    .select("id, username, created_at")
    .single();

  if (error) {
    return jsonError(500, "db_error", "Could not create the account. Please try again.");
  }

  return Response.json(
    {
      token: signToken(user),
      user: { id: user.id, username: user.username, createdAt: user.created_at },
    },
    { status: 201 }
  );
}