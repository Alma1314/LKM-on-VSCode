/**
 * 测试桩：vscode 模块的 mock。
 *
 * 背景：业务模块顶层会 `import * as vscode from "vscode"`，
 * 而 `@types/vscode` 只是类型，node 运行时并不存在该模块。
 * vitest.config.ts 通过 resolve.alias 把 `vscode` 指到这里，
 * 使单测能在 node 环境下 import 这些模块而不崩。
 *
 * 只提供可调用的 stub / 空对象，语义逻辑由各测试自行 mock。
 */

export const workspace = {
  getConfiguration: (section?: string) => ({
    get: <T>(key: string, defaultValue?: T): T | undefined => defaultValue,
    has: () => false,
    inspect: () => undefined,
    update: () => Promise.resolve(),
  }),
  workspaceFolders: [],
};

/**
 * 可控制输入的 showInputBox 桩。
 *
 * 测试可在用例内替换 `__inputBoxQueue` 数组来控制每次调用的返回值
 * （空数组表示无输入 → 返回 undefined）。它是模块级的可注入控制点，
 * 不要求配合 vi.mock，直接通过本模块导入使用即可。
 */
export const __inputBoxQueue: Array<string | undefined> = [];

export const window = {
  showInformationMessage: (..._args: unknown[]) => Promise.resolve(undefined),
  showErrorMessage: (..._args: unknown[]) => Promise.resolve(undefined),
  showWarningMessage: (..._args: unknown[]) => Promise.resolve(undefined),
  showQuickPick: () => Promise.resolve(undefined),
  showInputBox: () => {
    const value = __inputBoxQueue.shift();
    return Promise.resolve(value);
  },
  createOutputChannel: (_name?: string) => ({
    append: () => {},
    appendLine: () => {},
    show: () => {},
  }),
  showOpenDialog: () => Promise.resolve(undefined),
  showSaveDialog: () => Promise.resolve(undefined),
};

export const extensions = {
  getExtension: () => undefined,
  all: [],
};

export const commands = {
  registerCommand: (_command: string, _callback: (...args: never[]) => unknown) => ({
    dispose: () => {},
  }),
  registerTextEditorCommand: (_command: string, _callback: (...args: never[]) => unknown) => ({
    dispose: () => {},
  }),
  executeCommand: () => Promise.resolve(undefined),
};

export const env = {
  language: "en",
  machineId: "",
  uiKind: 1,
};

export const Uri = {
  parse: (value: string) => ({ scheme: "file", fsPath: value, toString: () => value }),
  file: (path: string) => ({ scheme: "file", fsPath: path, toString: () => path }),
};

export const Disposable = class Disposable {
  dispose(): void {}
};

export const EventEmitter = class EventEmitter<T = unknown> {
  event = (_listener: (e: T) => unknown, _thisArgs?: unknown, _disposables?: unknown) => new Disposable();
  fire(_data?: T): void {}
  dispose(): void {}
};

const extensionContext: Record<string, unknown> = {
  subscriptions: [],
  extensionPath: "",
  extensionUri: Uri.file(""),
  workspaceState: {},
  globalState: {},
  secrets: { get: () => Promise.resolve(undefined), store: () => Promise.resolve(), delete: () => Promise.resolve() },
};

export const ExtensionContext = extensionContext;
export const ExtensionMode = { Production: 1, Development: 2, Test: 3 };
