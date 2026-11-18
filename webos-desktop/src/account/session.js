import { os } from "../framework.js";
import { StorageKeys } from "../StorageKeys.js";
import { SOCIAL_BASE, analyticsFetch } from "../social/endpoints.js";
import {
  createLocalAccount,
  verifyLocalAccount,
} from "./localAccountStore.js";

const SESSION_KEY = StorageKeys.accountSession;

const listeners = [];

function emitChange() {
  listeners.slice().forEach((cb) => {
    try {
      cb(getSession());
    } catch {}
  });
}

async function request(path, method, body) {
  const session = getSession();
  const opts = { method: method || "GET", headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  if (session && session.token) {
    opts.headers["Authorization"] = `Bearer ${session.token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await analyticsFetch(`${SOCIAL_BASE}${path}`, {
      ...opts,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Could not reach the server." },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function getSession() {
  return os.storage.get(SESSION_KEY) || null;
}

export function setSession(session) {
  if (!session) os.storage.remove(SESSION_KEY);
  else os.storage.set(SESSION_KEY, session);
  emitChange();
}

export function isLoggedIn() {
  const s = getSession();
  return !!(s && s.token && s.userId);
}

export function onAccountChange(cb) {
  listeners.push(cb);
  return () => {
    const i = listeners.indexOf(cb);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export async function accountLogin(identifier, password) {
  const nickname = String(identifier || "").trim();
  if (!nickname || !password) {
    return { error: "Enter your nickname and password." };
  }
  const res = await verifyLocalAccount(nickname, password);
  if (res.error) return { error: res.error };
  setSession({
    token: `local-${res.userId}`,
    userId: res.userId,
    nickname: res.nickname,
    updatedAt: Date.now(),
  });
  return { ok: true };
}

export async function accountRegister({ nickname, password }) {
  const name = String(nickname || "").trim();
  if (name.length < 3) {
    return { error: "Nickname needs at least 3 characters." };
  }
  if (String(password || "").length < 6) {
    return { error: "Password needs at least 6 characters." };
  }
  const res = await createLocalAccount(name, password);
  if (res.error) return { error: res.error };
  setSession({
    token: `local-${res.userId}`,
    userId: res.userId,
    nickname: res.nickname,
    updatedAt: Date.now(),
  });
  return { ok: true };
}

export async function accountSignOut() {
  const session = getSession();
  const isLocalSession = String(session?.token || "").startsWith("local-");
  if (session && session.token && !isLocalSession) {
    await request("/live/account/logout", "POST").catch(() => {});
  }
  setSession(null);
  os.storage.remove(StorageKeys.accountQuota);
  os.storage.remove(StorageKeys.accountSyncEnabledPref);
}

export async function fetchAccountInfo(remote = true) {
  const session = getSession();
  if (!session) return null;
  let info = {
    userId: session.userId,
    nickname: session.nickname || "",
    supporter: false,
    quota: { limit: 256 * 1024, used: 0, supporter: false },
  };
  const isLocalSession = String(session.token || "").startsWith("local-");
  if (remote && !isLocalSession) {
    const res = await request("/live/account/me");
    if (res.ok && res.data && res.data.userId) {
      info = {
        userId: res.data.userId || info.userId,
        nickname: res.data.nickname ?? info.nickname,
        avatarIndex: res.data.avatarIndex ?? -1,
        bio: res.data.bio ?? "",
        supporter: !!res.data.supporter,
        quota: res.data.quota || info.quota,
      };
      session.nickname = info.nickname;
      setSession(session);
      os.storage.set(StorageKeys.accountQuota, info.quota);
    }
  }
  return info;
}

export async function updateAccountInfo(updates) {
  const session = getSession();
  if (!session) return { error: "Not signed in." };
  const res = await request("/live/account/update", "POST", updates);
  if (!res.ok) {
    if (res.status === 401)
      return { needsReauth: true, error: res.data.error || "Session expired." };
    return { error: res.data.error || "Could not update your account." };
  }
  if (res.data && res.data.nickname) {
    session.nickname = res.data.nickname;
    session.updatedAt = Date.now();
    setSession(session);
  }
  return { ok: true, data: res.data };
}

export { request, SESSION_KEY };
