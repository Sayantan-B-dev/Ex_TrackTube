import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const realClient =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

function noConfig() {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in."
  );
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === "symbol") return undefined;
      return (...args) => {
        if (!realClient) noConfig();
        const value = realClient[prop];
        return typeof value === "function" ? value.apply(realClient, args) : value;
      };
    },
  }
);