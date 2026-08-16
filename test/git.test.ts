import { describe, it, expect } from "vitest";
import { embedBasicAuth } from "../src/git";

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
