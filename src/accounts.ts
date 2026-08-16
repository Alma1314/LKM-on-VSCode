/** 系列映射：repo_name → 本地目录绝对路径。 */
export interface SeriesMap {
  [repoName: string]: string;
}

/** 账号元数据（凭证不在此，凭证存 SecretStorage）。 */
export interface AccountMeta {
  key: string; // accountKey(serverUrl, username)
  serverUrl: string;
  username: string;
  series: SeriesMap;
}

/** 账号的唯一标识：serverUrl:username。 */
export function accountKey(serverUrl: string, username: string): string {
  return `${serverUrl.replace(/\/+$/, "")}:${username}`;
}

function mkAccount(serverUrl: string, username: string): AccountMeta {
  return { key: accountKey(serverUrl, username), serverUrl, username, series: {} };
}

/** 全量账号列表。 */
export function listAccounts(accounts: AccountMeta[]): AccountMeta[] {
  return accounts;
}

/** 按 key 找账号。 */
export function findAccount(accounts: AccountMeta[], key: string): AccountMeta | undefined {
  return accounts.find((a) => a.key === key);
}

/** 追加账号；同 key 已存在则替换（更新 serverUrl/username 冗余字段），去重。 */
export function addAccount(accounts: AccountMeta[], serverUrl: string, username: string): AccountMeta[] {
  const key = accountKey(serverUrl, username);
  const fresh = mkAccount(serverUrl, username);
  const rest = accounts.filter((a) => a.key !== key);
  return [...rest, fresh];
}

/** 删除账号；key 不存在则原样返回。 */
export function removeAccount(accounts: AccountMeta[], key: string): AccountMeta[] {
  return accounts.filter((a) => a.key !== key);
}

/** 不可变地为账号追加/覆盖一个系列映射。 */
export function mapSeries(account: AccountMeta, repoName: string, dir: string): AccountMeta {
  return { ...account, series: { ...account.series, [repoName]: dir } };
}

/** 不可变地删除一个系列映射。 */
export function unmapSeries(account: AccountMeta, repoName: string): AccountMeta {
  const next = { ...account.series };
  delete next[repoName];
  return { ...account, series: next };
}
