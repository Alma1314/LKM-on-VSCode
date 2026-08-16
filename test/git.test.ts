import { describe, it, expect, vi } from "vitest";
import * as vscode from "vscode";
import { embedBasicAuth, getGitByDir } from "../src/git";

describe("git", () => {
  it("embedBasicAuth 把 user:pass 内联进 clone URL 的 host 前", () => {
    const url = embedBasicAuth("https://host/api/v1/blog/git/my-blog.git", "al", "pw");
    // 内联成 https://al:pw@host/api...
    expect(url.startsWith("https://al:pw@host/")).toBe(true);
    expect(url.endsWith("/api/v1/blog/git/my-blog.git")).toBe(true);
  });

  it("embedBasicAuth 对 URL 中 userinfo 做 encodeURIComponent", () => {
    const url = embedBasicAuth("https://h/g.git", "user name", "p@ss");
    expect(url).toContain("@h/");
    expect(url.startsWith("https://user%20name:p%40ss@h/g.git")).toBe(true);
  });
});

describe("git.getGitByDir", () => {
  it("按 rootUri 归一化匹配仓库", async () => {
    const repo = { rootUri: { fsPath: "C:\\x\\a-blog" }, pull: vi.fn(), push: vi.fn() };
    const api = { repositories: [repo] };
    (vscode.extensions as any).getExtension = () => ({ activate: async () => api });
    const r = await getGitByDir("C:/x/a-blog");
    expect(r).not.toBeNull();
    await r!.pull();
    await r!.push();
    expect(repo.pull).toHaveBeenCalledOnce();
    expect(repo.push).toHaveBeenCalledOnce();
  });

  it("找不到返回 null", async () => {
    (vscode.extensions as any).getExtension = () => ({ activate: async () => ({ repositories: [] }) });
    expect(await getGitByDir("C:/nope")).toBeNull();
  });
});
