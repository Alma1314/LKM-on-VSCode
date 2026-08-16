import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerCommands,
  PULL_CMD,
  PUSH_CMD,
  CLONE_CMD,
  ADD_ACCOUNT_CMD,
  SWITCH_ACCOUNT_CMD,
  REMOVE_ACCOUNT_CMD,
  CREATE_SERIES_CMD,
  DELETE_SERIES_CMD,
  TOGGLE_STAR_CMD,
  MANAGE_SERIES_VIEW,
} from "../src/extension";
import { AccountMeta, accountKey } from "../src/accounts";
import { __inputBoxQueue } from "./mocks/vscode";

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
      {
        subscriptions: { push() {} },
        globalState: { get: () => [], update: async () => {} },
      } as never,
      fakeRegister as never,
      [] as never
    );
    expect(registered).toContain(CLONE_CMD);
    expect(registered).toContain(PULL_CMD);
    expect(registered).toContain(PUSH_CMD);
  });

  it("registerCommands 注册新增命令并返回 provider", () => {
    const registered: string[] = [];
    const fakeRegister = (id: string) => {
      registered.push(id);
      return { dispose() {} } as { dispose(): void };
    };
    const provider = registerCommands(
      {
        subscriptions: { push() {} },
        globalState: { get: () => [], update: async () => {} },
      } as never,
      fakeRegister as never,
      [] as never
    ) as { refresh: () => void };
    for (const c of [
      CLONE_CMD,
      PULL_CMD,
      PUSH_CMD,
      ADD_ACCOUNT_CMD,
      SWITCH_ACCOUNT_CMD,
      REMOVE_ACCOUNT_CMD,
      CREATE_SERIES_CMD,
      DELETE_SERIES_CMD,
      TOGGLE_STAR_CMD,
    ]) {
      expect(registered).toContain(c);
    }
    expect(provider).toBeDefined();
    expect(typeof provider.refresh).toBe("function");
  });
});

/**
 * Fix 1（spec §4/§10）集成测试：401 需升级为「清凭证 + 重新引导输入」，
 * 而不是对限流的 /auth/login/password 持续硬撞。
 *
 * 流程：创建系列 → 首次用旧凭证换 token 返回 401 → 重新录入密码 →
 * 用新凭证重建 TokenManager 重试成功 → 继续创建系列 API 调用。
 */
describe("extension 401 升级", () => {
  const CRED_PREFIX = "lkm.blog.credentials.";
  const key = accountKey("https://h", "alice"); // "https://h:alice"
  const credKey = CRED_PREFIX + Buffer.from(key).toString("base64");

  function jsonResp(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("login 401 时清除旧凭证并引导重新录入后重试成功", async () => {
    __inputBoxQueue.length = 0;
    // 队列顺序：创建系列的标题、repo_name，随后密码录入（showInputBox 沿用同一队列）。
    __inputBoxQueue.push("My Blog", "my-blog", "newpw");

    // 凭证存储：初始有旧密码，clear 会删除、prompt 会写回新密码。
    const secretsStore = new Map<string, string>([[credKey, "alice\u0000oldpw"]]);
    const secrets = {
      get: vi.fn((k: string) => Promise.resolve(secretsStore.get(k) ?? undefined)),
      store: vi.fn(async (k: string, v: string) => { secretsStore.set(k, v); }),
      delete: vi.fn(async (k: string) => { secretsStore.delete(k); }),
    };

    // 全局账号状态：一个已添加账号 alice，且为当前账号。
    const account: AccountMeta = {
      key,
      serverUrl: "https://h",
      username: "alice",
      series: {},
    };
    const globalState = {
      get: vi.fn((k: string) => {
        if (k === "lkm.accounts") return [account];
        if (k === "lkm.currentAccount") return key;
        return undefined;
      }),
      update: vi.fn(async () => {}),
    };

    // fetch 调用序列：
    //  1) ensureAuthedToken 首次 login（旧凭证）→ 401
    //  2) 重建后用新凭证 login → ok
    //  3) createSeries API → ok
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResp({ code: 401, msg: "Unauthorized", data: null }, 401))
      .mockResolvedValueOnce(jsonResp({ code: 0, msg: "ok", data: { access_token: "tok2" } }))
      .mockResolvedValueOnce(jsonResp({ code: 0, msg: "ok", data: { id: 9, title: "My Blog", repo_name: "my-blog", status: "ACTIVE" } }));
    vi.stubGlobal("fetch", fetchMock);

    // 捕获各命令回调，手动驱动 createSeries handler。
    const callbacks = new Map<string, (...args: never[]) => unknown>();
    const fakeRegister = (id: string, cb: (...args: never[]) => unknown) => {
      callbacks.set(id, cb);
      return { dispose() {} } as { dispose(): void };
    };

    registerCommands(
      { subscriptions: { push() {} }, globalState, secrets } as never,
      fakeRegister as never,
      [] as never
    );

    const handler = callbacks.get(CREATE_SERIES_CMD)!;
    await handler();

    // 旧凭证被清除（不存在 oldpw 值），新密码已回写。
    const stored = secretsStore.get(credKey) ?? "";
    expect(stored).not.toContain("oldpw");
    expect(stored).toContain("newpw");
    // 密码录入走了一次 showInputBox。
    expect(secrets.store).toHaveBeenCalledTimes(1);
    // 总 fetch：401 一次 + 新凭证兑换一次 + 创建系列一次，未对 login 无限重试。
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });
});
