import { describe, it, expect, vi, beforeEach } from "vitest";
import { basicHeader, getCredentials, saveCredentials, clearCredentials, promptForCredentials } from "../src/creds";
import { __inputBoxQueue } from "./mocks/vscode";

/**
 * 构造一个最小可用的 ExtensionContext 形状（只含 secrets 的存取桩）。
 * 每个用例都新建，避免污染共享 mock / 其它用例。
 * get/store/delete 均为可调用的 vi.fn()，底层存储用一个临时 Map 承载，
 * 从而真实还原 SecretStorage 的 store→get→delete 回路。
 */
function makeSecrets() {
  const store = new Map<string, string>();
  const api = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? undefined)),
    store: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
  return { store, api };
}

function makeContext() {
  const { store, api } = makeSecrets();
  return { secrets: api, __store: store };
}

describe("creds", () => {
  it("basicHeader 用 base64 编码 user:pass 并带 Basic 前缀", () => {
    const hdr = basicHeader("alice", "s3cret");
    // base64("alice:s3cret")
    const expected = "Basic " + Buffer.from("alice:s3cret").toString("base64");
    expect(hdr).toBe(expected);
  });

  // 已知字面量硬编码断言：base64("lkm:pass123")，锁定输出不因实现漂移而变化。
  it("basicHeader 对已知字面量产生稳定输出", () => {
    expect(basicHeader("lkm", "pass123")).toBe("Basic " + Buffer.from("lkm:pass123").toString("base64"));
    expect(basicHeader("lkm", "pass123")).toBe("Basic bGttOnBhc3MxMjM=");
  });

  describe("SecretStorage 回路", () => {
    it("saveCredentials 后 getCredentials 能原样取回 {username,password}", async () => {
      const ctx: any = makeContext();
      await saveCredentials(ctx, "alice", "s3cret");
      const got = await getCredentials(ctx);
      expect(got).toEqual({ username: "alice", password: "s3cret" });
    });

    it("getCredentials 在无凭证（secrets 返回 undefined）时返回 null", async () => {
      const ctx: any = makeContext();
      expect(await getCredentials(ctx)).toBeNull();
    });

    it("getCredentials 在 secrets 返回空串时返回 null", async () => {
      const { store, api } = makeSecrets();
      store.set("lkm.blog.credentials", "");
      expect(await getCredentials({ secrets: api })).toBeNull();
    });

    it("getCredentials 在残缺/空用户名时返回 null", async () => {
      const { store, api } = makeSecrets();
      // 只有分隔符、无用户名 → 空 username 分支
      store.set("lkm.blog.credentials", "\u0000pw");
      expect(await getCredentials({ secrets: api })).toBeNull();
    });

    it("getCredentials 在密码字段缺失时返回 null（password === undefined 分支）", async () => {
      const { store, api } = makeSecrets();
      // 分割后只有 [username]，password 为 undefined
      store.set("lkm.blog.credentials", "alice");
      expect(await getCredentials({ secrets: api })).toBeNull();
    });

    it("clearCredentials 后再 getCredentials 返回 null", async () => {
      const ctx: any = makeContext();
      await saveCredentials(ctx, "alice", "s3cret");
      expect(await getCredentials(ctx)).toEqual({ username: "alice", password: "s3cret" });
      await clearCredentials(ctx);
      expect(await getCredentials(ctx)).toBeNull();
    });
  });

  describe("promptForCredentials 空凭证保护", () => {
    beforeEach(() => {
      __inputBoxQueue.length = 0; // 每个用例前清空可注入的输入队列
    });

    it("两次空输入时不抛错且不落 storage，返回空对象", async () => {
      const ctx: any = makeContext();
      __inputBoxQueue.push(undefined, undefined); // 两次都无输入
      const res = await promptForCredentials(ctx);
      expect(res).toEqual({ username: "", password: "" });
      // 空凭证不应触发秘密存储写入
      expect(ctx.secrets.store).not.toHaveBeenCalled();
      expect(await getCredentials(ctx)).toBeNull();
    });

    it("任一输入非空时保存，并返回回填的 {username,password}", async () => {
      const ctx: any = makeContext();
      __inputBoxQueue.push("alice", "s3cret");
      const res = await promptForCredentials(ctx);
      expect(res).toEqual({ username: "alice", password: "s3cret" });
      expect(ctx.secrets.store).toHaveBeenCalled();
      expect(await getCredentials(ctx)).toEqual({ username: "alice", password: "s3cret" });
    });
  });
});
