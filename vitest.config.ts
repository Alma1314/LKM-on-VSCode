import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // 让业务模块顶层的 `import * as vscode from "vscode"` 在 node 环境下
      // 解析到测试桩（@types/vscode 只是类型，运行时 node 没有该模块）。
      vscode: path.resolve(__dirname, "test/mocks/vscode.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
