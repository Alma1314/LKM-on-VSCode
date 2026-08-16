export interface BlogSeries {
  id: number;
  title: string;
  repo_name: string;
  status: string;
}

interface ApiResp<T> {
  code: number;
  msg: string;
  data: T | null;
}

interface ListData<T> {
  items: T[];
  total?: number;
}

/**
 * 拉取 blog 系列列表并解包 ApiResp。
 * 仅返回 status 为 "ACTIVE" 的系列。
 */
export async function listSeries(
  serverUrl: string,
  authHeader: string
): Promise<BlogSeries[]> {
  const url = `${serverUrl.replace(/\/$/, "")}/api/v1/blog/series`;
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const body = (await res.json()) as ApiResp<ListData<BlogSeries>>;
  if (body.code !== 0 || !body.data) {
    throw new Error(body.msg || "系列列表接口返回错误");
  }
  return body.data.items.filter((s) => s.status === "ACTIVE");
}

/**
 * 拼出 blog 系列的克隆仓库 URL（裸 URL，不含内联凭证）。
 * _username/_password 为签名预留，供后续 embedBasicAuth 使用。
 */
export function gitCloneUrl(
  serverUrl: string,
  _username: string,
  _password: string,
  repoName: string
): string {
  return `${serverUrl.replace(/\/$/, "")}/api/v1/blog/git/${repoName}.git`;
}

interface TokenResp<T> {
  code: number;
  msg: string;
  data: T | null;
}

/** 通用请求：带 Bearer，POST/PUT/DELETE 走 json body；解包 ApiResp 直接返回 data。 */
async function authed<T>(
  serverUrl: string,
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${serverUrl.replace(/\/$/, "")}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const body = (await res.json().catch(() => null)) as TokenResp<T> | null;
  if (!res.ok || !body || body.code !== 0) {
    throw new Error(body?.msg || `HTTP ${res.status}`);
  }
  return body.data as T;
}

export async function createSeries(
  serverUrl: string,
  token: string,
  input: { title: string; repo_name: string }
): Promise<BlogSeries> {
  return authed<BlogSeries>(serverUrl, token, "/api/v1/blog/series", {
    method: "POST",
    body: input,
  });
}

export async function deleteSeries(serverUrl: string, token: string, id: number): Promise<void> {
  await authed<unknown>(serverUrl, token, `/api/v1/blog/series/${id}`, { method: "DELETE" });
}

export async function toggleStar(
  serverUrl: string,
  token: string,
  id: number
): Promise<{ starred: boolean }> {
  return authed<{ starred: boolean }>(serverUrl, token, `/api/v1/blog/series/${id}/star`, {
    method: "POST",
  });
}
