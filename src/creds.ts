import * as vscode from "vscode";

const CRED_KEY = "lkm.blog.credentials";
const SEP = "\u0000";

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
