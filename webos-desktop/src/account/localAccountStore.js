import { os } from "../framework.js";
import { StorageKeys } from "../StorageKeys.js";

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(String(password));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readAccounts() {
  const stored = os.storage.get(StorageKeys.localAccounts);
  return stored && typeof stored === "object" ? stored : {};
}

function writeAccounts(accounts) {
  os.storage.set(StorageKeys.localAccounts, accounts);
}

function normalizeKey(nickname) {
  return String(nickname || "").trim().toLowerCase();
}

export async function createLocalAccount(nickname, password) {
  const key = normalizeKey(nickname);
  const accounts = readAccounts();
  if (accounts[key]) return { error: "That nickname is already taken." };
  const userId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  accounts[key] = {
    userId,
    nickname: String(nickname).trim(),
    passHash: await hashPassword(password),
  };
  writeAccounts(accounts);
  return { ok: true, userId, nickname: accounts[key].nickname };
}

export async function verifyLocalAccount(identifier, password) {
  const account = readAccounts()[normalizeKey(identifier)];
  if (!account) return { error: "No account with that nickname." };
  if (account.passHash !== (await hashPassword(password)))
    return { error: "Wrong password." };
  return { ok: true, userId: account.userId, nickname: account.nickname };
}
