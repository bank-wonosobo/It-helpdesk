import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { isPasswordHashed, verifyPassword } from "@/lib/password";

const ADMIN_COOKIE = "hd_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminRole = "admin";

export type AdminSession = {
  username: string;
  name: string;
  role: AdminRole;
  exp: number;
};

const base64Url = (value: string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const parseCookies = (raw: string | null) => {
  const result: Record<string, string> = {};
  if (!raw) return result;

  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    result[name] = decodeURIComponent(rest.join("="));
  }

  return result;
};

const getSecret = () => process.env.ADMIN_SESSION_SECRET || "dev-admin-session-secret";

const sign = (payloadB64: string) =>
  createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");

const getToken = (cookieHeader: string | null) => {
  const cookies = parseCookies(cookieHeader);
  return cookies[ADMIN_COOKIE] || null;
};

export const createAdminSessionToken = (username: string, name: string) => {
  const payload: AdminSession = {
    username,
    name,
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadB64 = base64Url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
};

export const verifyAdminSessionToken = (
  token: string | null
): AdminSession | null => {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  try {
    const valid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as AdminSession;
    if (
      payload.role !== "admin" ||
      typeof payload.username !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
};

export const getAdminSessionFromRequest = (req: Request) => {
  const token = getToken(req.headers.get("cookie"));
  return verifyAdminSessionToken(token);
};

export const getAdminCookieName = () => ADMIN_COOKIE;

export const validateAdminCredentials = async (
  username: string,
  password: string
): Promise<
  { id: string; username: string; name: string; needsPasswordRehash: boolean } | null
> => {
  const admin = await prisma.adminUser.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      password: true,
      name: true,
      active: true,
    },
  });

  if (!admin || !admin.active) return null;
  const valid = await verifyPassword(password, admin.password);
  if (!valid) return null;

  return {
    id: admin.id,
    username: admin.username,
    name: admin.name,
    needsPasswordRehash: !isPasswordHashed(admin.password),
  };
};
