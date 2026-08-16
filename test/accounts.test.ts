import { describe, it, expect } from "vitest";
import {
  accountKey,
  addAccount,
  removeAccount,
  mapSeries,
  unmapSeries,
  listAccounts,
  AccountMeta,
} from "../src/accounts";

const A: AccountMeta = { key: "https://h:alice", serverUrl: "https://h", username: "alice", series: {} };

describe("accounts", () => {
  it("accountKey 用 serverUrl:username", () => {
    expect(accountKey("https://h", "alice")).toBe("https://h:alice");
  });

  it("addAccount 追加并去重同 key", () => {
    const list = addAccount([], "https://h", "alice");
    expect(list).toHaveLength(1);
    const again = addAccount(list, "https://h", "alice"); // 同 key → 替换不新增
    expect(again).toHaveLength(1);
    const two = addAccount(list, "https://h", "bob");
    expect(two).toHaveLength(2);
  });

  it("listAccounts 返回全量且含 A 当 key 匹配", () => {
    const list = listAccounts([A]);
    expect(list).toHaveLength(1);
  });

  it("removeAccount 删除指定账号", () => {
    const bob = { ...A, key: "https://h:bob", username: "bob" };
    expect(removeAccount([A, bob], "https://h:bob")).toEqual([A]);
    expect(removeAccount([A, bob], "nope")).toHaveLength(2);
  });

  it("mapSeries 追加且不可变", () => {
    const m = mapSeries(A, "my-blog", "C:/x/my-blog");
    expect(A.series["my-blog"]).toBeUndefined(); // 原对象不变
    expect(m.series["my-blog"]).toBe("C:/x/my-blog");
    // 覆盖同名键
    const overwrite = mapSeries(m, "my-blog", "D:/new");
    expect(Object.keys(overwrite.series)).toHaveLength(1);
    expect(overwrite.series["my-blog"]).toBe("D:/new");
  });

  it("unmapSeries 删除映射", () => {
    const m = mapSeries(A, "my-blog", "C:/x/my-blog");
    const u = unmapSeries(m, "my-blog");
    expect(u.series["my-blog"]).toBeUndefined();
    expect(unmapSeries(u, "absent").series).toEqual(u.series);
  });
});
