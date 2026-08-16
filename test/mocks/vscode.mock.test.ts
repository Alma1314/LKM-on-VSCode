import { describe, expect, it } from "vitest";
import * as vscode from "vscode";

/**
 * 冒烟测试：确认 vitest 的 resolve.alias 能把顶层 `import * as vscode from "vscode"`
 * 解析到 test/mocks/vscode.ts，使后续任务的业务模块在 node 环境下可被 import 而不崩。
 */
describe("vscode mock", () => {
  it("提供 workspace / window / extensions / commands 等常用 API", () => {
    expect(vscode).toBeDefined();
    expect(vscode.workspace).toBeDefined();
    expect(vscode.window).toBeDefined();
    expect(vscode.extensions).toBeDefined();
    expect(vscode.commands).toBeDefined();
  });

  it("常用 API 为可调用的 stub", () => {
    expect(typeof vscode.workspace.getConfiguration).toBe("function");
    expect(typeof vscode.window.showInformationMessage).toBe("function");
    expect(typeof vscode.commands.registerCommand).toBe("function");
  });
});
