import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "nexo_saved_accounts";
const MAX_ACCOUNTS = 6;
const MAX_AGE = 60 * 60 * 24 * 30;

export type SavedAccount = {
  userId: string;
  username: string;
  name: string;
  role: string;
  businessName: string;
  destination: string;
};

type StoredAccount = SavedAccount & { refreshToken: string };

function encryptionKey() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY não configurada.");
  return createHash("sha256").update(`nexo-accounts:${secret}`).digest();
}

function encrypt(accounts: StoredAccount[]) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(accounts), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((value) => value.toString("base64url"))
    .join(".");
}

function decrypt(value?: string): StoredAccount[] {
  if (!value) return [];
  try {
    const [iv, tag, encrypted] = value
      .split(".")
      .map((part) => Buffer.from(part, "base64url"));
    if (!iv || !tag || !encrypted) return [];
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decoded = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readStoredAccounts() {
  const store = await cookies();
  return decrypt(store.get(COOKIE_NAME)?.value);
}

async function writeStoredAccounts(accounts: StoredAccount[]) {
  const store = await cookies();
  if (!accounts.length) {
    store.delete(COOKIE_NAME);
    return;
  }
  store.set(COOKIE_NAME, encrypt(accounts.slice(0, MAX_ACCOUNTS)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  return (await readStoredAccounts()).map((account) => ({
    userId: account.userId,
    username: account.username,
    name: account.name,
    role: account.role,
    businessName: account.businessName,
    destination: account.destination,
  }));
}

export async function getStoredAccount(userId: string) {
  return (await readStoredAccounts()).find((account) => account.userId === userId);
}

export async function saveAccount(
  account: SavedAccount,
  refreshToken: string,
) {
  const accounts = await readStoredAccounts();
  const next = [
    { ...account, refreshToken },
    ...accounts.filter((item) => item.userId !== account.userId),
  ];
  await writeStoredAccounts(next);
}

export async function updateSavedAccountToken(
  userId: string,
  refreshToken: string,
) {
  const accounts = await readStoredAccounts();
  const target = accounts.find((account) => account.userId === userId);
  if (!target) return;
  await writeStoredAccounts(
    accounts.map((account) =>
      account.userId === userId ? { ...account, refreshToken } : account,
    ),
  );
}

export async function removeSavedAccount(userId: string) {
  await writeStoredAccounts(
    (await readStoredAccounts()).filter((account) => account.userId !== userId),
  );
}
