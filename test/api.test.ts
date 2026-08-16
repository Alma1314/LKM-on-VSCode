import { describe, it, expect, vi, afterEach } from "vitest";
import { listSeries, gitCloneUrl } from "../src/api";

describe("api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listSeries 解包 ApiResp 并取 data.items", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          msg: "ok",
          data: {
            items: [
              { id: 1, title: "我的博客", repo_name: "my-blog", status: "ACTIVE" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const series = await listSeries("https://x", "Basic abc");
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ id: 1, repo_name: "my-blog", status: "ACTIVE" });
    // 校验请求 URL 与 Authorization 头
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toContain("/api/v1/blog/series");
    expect((call[1].headers as Record<string, string>).Authorization).toBe("Basic abc");
  });

  it("listSeries 过滤非 ACTIVE 系列", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          msg: "ok",
          data: {
            items: [
              { id: 1, title: "a", repo_name: "a", status: "ACTIVE" },
              { id: 2, title: "b", repo_name: "b", status: "ARCHIVED" },
            ],
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const series = await listSeries("https://x", "Basic abc");
    expect(series).toHaveLength(1);
    expect(series[0].id).toBe(1);
  });

  it("listSeries 对非 200 抛错", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("auth fail", { status: 401 }))
    );
    await expect(listSeries("https://x", "Basic abc")).rejects.toThrow();
  });

  it("gitCloneUrl 拼出裸仓库 URL", () => {
    // 第 3、4 参为 username/password（签名预留，暂未内联），repoName 为真正的仓库名
    expect(gitCloneUrl("https://host", "post", "pass", "my-blog")).toBe(
      "https://host/api/v1/blog/git/my-blog.git"
    );
  });
});
