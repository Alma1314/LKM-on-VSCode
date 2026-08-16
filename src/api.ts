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
