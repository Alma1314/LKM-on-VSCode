/**
 * git 操作层：clone 系列仓库与 pull/push。
 *
 * 依赖 VS Code 内置 GitExtension（vscode.extensions.getExtension("vscode.git")）。
 * GitExtension 的运行时 API 类型不被 @types/vscode 覆盖，故通过 `any`/结构桥接
 * （VS Code 扩展常见做法）。纯函数 embedBasicAuth 单独抽出便于单测。
 */

import * as vscode from "vscode";

/**
 * 把 user:pass 以 Basic 认证的方式内联进裸 clone URL。
 *
 * 在 `://` 之后、host 之前插入 `encodeURIComponent(user):encodeURIComponent(pass)@`，
 * 返回内联凭证后的完整 URL。找不到 scheme 分隔符时视整个字符串为 host 起始。
 *
 * @param cloneUrl 裸仓库 URL（由 API 端生成，不含凭证）
 * @param username 用户名（会被 URL 编码）
 * @param password 密码（会被 URL 编码）
 */
export function embedBasicAuth(cloneUrl: string, username: string, password: string): string {
  const sep = cloneUrl.indexOf("://");
  const hostStart = sep === -1 ? 0 : sep + 3;
  const cred = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  return cloneUrl.slice(0, hostStart) + cred + cloneUrl.slice(hostStart);
}

/** 桥接出来的 GitExtension 子集：clone(url, parentPath) 返回克隆后的仓库路径。 */
interface GitApi {
  clone(url: string, parentPath: string): Promise<string>;
}

/**
 * 取 GitExtension 的桥接 API，负责激活扩展。
 *
 * getExtension 不存在或扩展未加载时抛错——clone 流程依赖它，必须失败快。
 */
async function gitApi(): Promise<GitApi> {
  const ext = vscode.extensions.getExtension("vscode.git");
  if (!ext) throw new Error("vscode.git 扩展未加载");
  const api = await ext.activate();
  return api as GitApi;
}

/**
 * 克隆仓库到目标目录。
 *
 * @param cloneUrl 含内联凭证的 clone URL（由 embedBasicAuth 生成）
 * @param targetDir 父目录，GitExtension.clone 在其下创建仓库
 */
export async function cloneRepository(cloneUrl: string, targetDir: string): Promise<void> {
  const api = await gitApi();
  // GitExtension.clone(url, parentPath) 返回克隆后的仓库(字符串 path)
  await api.clone(cloneUrl, targetDir);
}

/** pull/push 操作的最小仓库接口。 */
export interface GitRepositoryHandle {
  pull(): Promise<void>;
  push(): Promise<void>;
}

/** 把仓库对象包装成 {pull, push} 的 GitRepositoryHandle。 */
function wrapRepository(repo: unknown): GitRepositoryHandle {
  const typed = repo as { pull(): Promise<void>; push(): Promise<void> };
  return { pull: () => typed.pull(), push: () => typed.push() };
}

/**
 * 取当前活动工作区的仓库，包装成 {pull, push}。
 *
 * - 无 Git 扩展 / 无仓库：返回 null。
 * - 单仓库：直接包装，不弹选择器。
 * - 多仓库：走 QuickPick 让用户选择。
 */
export async function getActiveGitRepository(): Promise<GitRepositoryHandle | null> {
  const ext = vscode.extensions.getExtension("vscode.git");
  if (!ext) return null;
  const api = await ext.activate();
  const repos = (api as { repositories?: unknown[] }).repositories ?? [];
  if (repos.length === 0) return null;
  // 恰好一个仓库时直接包装，避免无谓弹出的单项选择器。
  if (repos.length === 1) return wrapRepository(repos[0]);
  // 多个仓库：走 QuickPick 让用户选择。
  return pickRepository(api);
}

/**
 * 让用户从所有 Git 仓库中 QuickPick 一个，返回其 {pull, push} 包装。
 * 用户取消时返回 null。调用方保证仓库集合非空。
 */
async function pickRepository(api: unknown): Promise<GitRepositoryHandle | null> {
  const repos = (api as { repositories?: unknown[] }).repositories ?? [];
  const label = (r: unknown) => (r as { rootUri?: { fsPath?: string } }).rootUri?.fsPath ?? "";
  const picked = await vscode.window.showQuickPick(
    repos.map((r) => ({ label: label(r), repo: r })),
    { placeHolder: "选择要同步的 LKM 仓库" }
  );
  if (!picked) return null;
  return wrapRepository(picked.repo);
}
