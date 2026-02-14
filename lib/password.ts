import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

const toBase64 = (value: Buffer) => value.toString("base64");
const fromBase64 = (value: string) => Buffer.from(value, "base64");

export const isPasswordHashed = (value: string) =>
  value.startsWith(`${HASH_PREFIX}$`);

export const hashPassword = async (plainPassword: string) => {
  const salt = randomBytes(16);
  const derived = scryptSync(plainPassword, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    HASH_PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    toBase64(salt),
    toBase64(derived),
  ].join("$");
};

export const verifyPassword = async (
  plainPassword: string,
  storedPassword: string
) => {
  if (!isPasswordHashed(storedPassword)) {
    return plainPassword === storedPassword;
  }

  const [
    prefix,
    nRaw,
    rRaw,
    pRaw,
    saltB64,
    expectedHashB64,
  ] = storedPassword.split("$");

  if (
    prefix !== HASH_PREFIX ||
    !nRaw ||
    !rRaw ||
    !pRaw ||
    !saltB64 ||
    !expectedHashB64
  ) {
    return false;
  }

  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const salt = fromBase64(saltB64);
  const expected = fromBase64(expectedHashB64);
  const actual = scryptSync(plainPassword, salt, expected.length, {
    N,
    r,
    p,
  });

  try {
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};
