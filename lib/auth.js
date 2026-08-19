import "server-only";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const BCRYPT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  return jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { subject: user.id, expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  return jwt.verify(token, JWT_SECRET);
}

export function getUserFromRequest(req) {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const payload = verifyToken(header.slice(7));
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function jsonError(status, code, message) {
  return Response.json({ error: code, message }, { status });
}