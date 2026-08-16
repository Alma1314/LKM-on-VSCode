import * as vscode from "vscode";
import { getActiveGitRepository } from "./git";
import { runCloneFlow, CloneDeps } from "./clone";
import { BlogSeries } from "./api";

/** 克隆博客系列命令 id。 */
export const CLONE_CMD = "lkm.cloneBlog";
/** 拉取当前仓库命令 id。 */
export const PULL_CMD = "lkm.pull";
/** 推送当前仓库命令 id。 */
export const PUSH_CMD = "lkm.push";

/** vscode.commands.registerCommand 的类型，便于测试注入真假实现。 */
type RegisterFn = typeof vscode.commands.registerCommand;

/**
 * 注入并注册三个 LKM 命令。
 *
 * @param context VS Code 扩展上下文（挂到 subscriptions）
 * @param register 命令注册函数（测试可注入 spy）
 * @param _ 预留参数（当前未使用）
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  register: RegisterFn,
  _: never[]
): void {
  // 处理 LKM: Clone Blog：构造真实 UI deps 后走 runCloneFlow。
  async function handleClone(commandContext: vscode.ExtensionContext) {
    const deps: CloneDeps = {
      // lkm.serverUrl 落在 lkm 配置段；getConfiguration("lkm") 会去掉 "lkm." 前缀，
      // 故此处把 "lkm.serverUrl" 键翻译成段内 "serverUrl"。
      getConfig: (k) =>
        k === "lkm.serverUrl"
          ? vscode.workspace.getConfiguration("lkm").get<string>("serverUrl")
          : undefined,
      pickSeries: async (series: BlogSeries[]) => {
        const picked = await vscode.window.showQuickPick(
          series.map((s) => ({ label: s.title, detail: s.repo_name, series: s })),
          { placeHolder: "选择要克隆的 blog 系列" }
        );
        return picked ? picked.series : null;
      },
      pickTargetDir: async () => {
        const dirs = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
          openLabel: "选择克隆目标目录",
        });
        return dirs && dirs.length > 0 ? dirs[0].fsPath : undefined;
      },
      doClone: async (url, dir) => {
        // 动态取最终实现，避免顶层副作用。
        const { cloneRepository } = await import("./git");
        await cloneRepository(url, dir);
      },
    };
    const outcome = await runCloneFlow(commandContext, deps);
    if (outcome.kind === "cloned") {
      vscode.window.showInformationMessage(outcome.message);
    } else if (outcome.kind === "error") {
      vscode.window.showErrorMessage(outcome.message);
    }
  }

  // 处理 LKM: Pull：拉取当前活动仓库。
  async function handlePull() {
    const repo = await getActiveGitRepository();
    if (!repo) {
      vscode.window.showWarningMessage("未找到当前 LKM 仓库");
      return;
    }
    try {
      await repo.pull();
    } catch (err) {
      vscode.window.showErrorMessage(`拉取失败：${(err as Error).message}`);
    }
  }

  // 处理 LKM: Push：推送当前活动仓库。
  async function handlePush() {
    const repo = await getActiveGitRepository();
    if (!repo) {
      vscode.window.showWarningMessage("未找到当前 LKM 仓库");
      return;
    }
    try {
      await repo.push();
    } catch (err) {
      vscode.window.showErrorMessage(`推送失败：${(err as Error).message}`);
    }
  }

  context.subscriptions.push(register(CLONE_CMD, () => handleClone(context)));
  context.subscriptions.push(register(PULL_CMD, handlePull));
  context.subscriptions.push(register(PUSH_CMD, handlePush));
}

/** 扩展激活入口：以真实实现注册命令。 */
export function activate(context: vscode.ExtensionContext): void {
  registerCommands(context, vscode.commands.registerCommand.bind(vscode.commands), []);
}

/** 扩展停用入口：无需清理。 */
export function deactivate(): void {
  // 无清理逻辑。
}
