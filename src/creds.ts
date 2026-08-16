import * as vscode from "vscode";
import { accountKey } from "./accounts";

const CRED_KEY = "lkm.blog.credentials";
const SEP = "\u0000";

/** 按账号 SecretStorage key 的前缀。 */
const CRED_PREFIX = "lkm.blog.credentials.";

/** 按账号 key 生成 SecretStorage key（base64 避免 key 中 `:` `/` 等非法字符）。 */
function credKeyFor(key: string): string {
  return CRED_PREFIX + Buffer.from(key).toString("base64");
}

export async function getCredentials(
  context: vscode.ExtensionContext
): Promise<{ username: string; password: string } | null> {
  const raw = await context.secrets.get(CRED_KEY);
  if (!raw) return null;
  const [username, password] = raw.split(SEP);
  // 用户名或密码任一为空都视为无效凭证（空密码不能被当作有效凭证绕过录入）。
  if (!username || !password) return null;
  return { username, password };
}

export async function saveCredentials(
  context: vscode.ExtensionContext,
  username: string,
  password: string
): Promise<void> {
  await context.secrets.store(CRED_KEY, username + SEP + password);
}

export async function clearCredentials(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.secrets.delete(CRED_KEY);
}

export async function promptForCredentials(
  context: vscode.ExtensionContext
): Promise<{ username: string; password: string }> {
  const username =
    (await vscode.window.showInputBox({
      prompt: "LKM 用户名",
      ignoreFocusOut: true,
    })) ?? "";
  const password =
    (await vscode.window.showInputBox({
      prompt: "LKM 密码",
      password: true,
      ignoreFocusOut: true,
    })) ?? "";
  // 用户名或密码任一为空（取消/留空）都不落 SecretStorage，避免把空密码持久化。
  if (username && password) {
    await saveCredentials(context, username, password);
  }
  return { username, password };
}

export function basicHeader(username: string, password: string): string {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

/** 按账号 key（accountKey 生成）读取凭证；无/残缺返回 null。 */
export async function getCredentialsForAccount(
  context: vscode.ExtensionContext,
  key: string
): Promise<{ username: string; password: string } | null> {
  const raw = await context.secrets.get(credKeyFor(key));
  if (!raw) return null;
  const [username, password] = raw.split(SEP);
  if (!username || !password) return null;
  return { username, password };
}

/** 按账号 key 写凭证。 */
export async function saveCredentialsForAccount(
  context: vscode.ExtensionContext,
  key: string,
  username: string,
  password: string
): Promise<void> {
  await context.secrets.store(credKeyFor(key), username + SEP + password);
}

/** 按账号 key 删除凭证。 */
export async function clearCredentialsForAccount(
  context: vscode.ExtensionContext,
  key: string
): Promise<void> {
  await context.secrets.delete(credKeyFor(key));
}

/**
 * 仅收集密码（用户名已在账号元数据里），存 SecretStorage 后返回完整凭证。
 * 用户取消/留空则返回 null（不落存）。
 */
export async function promptCredentialsForAccount(
  context: vscode.ExtensionContext,
  serverUrl: string,
  username: string
): Promise<{ username: string; password: string } | null> {
  const password =
    (await vscode.window.showInputBox({
      prompt: `「${username}」的 LKM 密码`,
      password: true,
      ignoreFocusOut: true,
    })) ?? "";
  if (!password) return null;
  const key = accountKey(serverUrl, username);
  await saveCredentialsForAccount(context, key, username, password);
  return { username, password };
}
