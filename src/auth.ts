import { basicHeader } from "./creds";

export interface RestAuthDeps {
  serverUrl: string;
  getCredentials(): Promise<{ username: string; password: string } | null>;
  fetchFn?: typeof fetch;
}

/** 解包 ApiResp 并返回 data 的通用辅助。 */
async function unpack<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { code: number; msg: string; data: T | null };
  if (!res.ok || body.code !== 0 || body.data === null) {
    throw new Error(body.msg || `HTTP ${res.status}`);
  }
  return body.data;
}

/**
 * 用用户名+密码换 Bearer access token（POST /auth/login/password）。
 * fetchFn 供测试注入。
 */
export async function loginForToken(
  serverUrl: string,
  username: string,
  password: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const url = `${serverUrl.replace(/\/$/, "")}/api/v1/auth/login/password`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicHeader(username, password),
    },
    body: JSON.stringify({ username, password }),
  });
  const data = await unpack<{ access_token: string }>(res);
  return data.access_token;
}

export interface TokenManager {
  getToken(): Promise<string | null>;
  invalidate(): void;
  /** 最近一次成功兑换 token 的时间戳（毫秒）；从未兑换过返回 null。 */
  lastTokenAt(): number | null;
}

/** access_token 的生命周期（毫秒），对齐后端 15 分钟。超时即视为过期。 */
export const TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * 凭证→token 缓存管理器：复用 token 规避登录限流，401 时 invalidate 触发重兑。
 *
 * token 有 15 分钟有效期：超过该窗口后，即便未收到 401，下次 getToken 也会
 * 视为过期并重新兑换（避免使用已失效的 Bearer）。cachedAt 记录最近一次成功
 * 兑换的时刻，供 lastTokenAt() 判断会话活跃度。
 */
export function createTokenManager(deps: RestAuthDeps): TokenManager {
  let cached: string | null = null;
  let cachedAt: number | null = null;
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    async getToken() {
      // 已缓存且未过期（15 分钟内）则复用；过期则清除后重兑。
      if (cached && cachedAt !== null && Date.now() - cachedAt < TOKEN_TTL_MS) {
        return cached;
      }
      cached = null;
      cachedAt = null;
      const creds = await deps.getCredentials();
      if (!creds) return null;
      cached = await loginForToken(deps.serverUrl, creds.username, creds.password, fetchFn);
      cachedAt = Date.now();
      return cached;
    },
    invalidate() {
      cached = null;
      cachedAt = null;
    },
    lastTokenAt() {
      return cachedAt;
    },
  };
}
