import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCommands, PULL_CMD, PUSH_CMD, CLONE_CMD } from "../src/extension";

describe("extension", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("registerCommands 注册三个 LKM 命令", () => {
    const registered: string[] = [];
    const fakeRegister = (id: string) => {
      registered.push(id);
      return { dispose() {} } as { dispose(): void };
    };
    registerCommands(
      { subscriptions: { push() {} } } as never,
      fakeRegister as never,
      [] as never
    );
    expect(registered).toContain(CLONE_CMD);
    expect(registered).toContain(PULL_CMD);
    expect(registered).toContain(PUSH_CMD);
  });
});
