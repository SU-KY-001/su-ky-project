import { describe, expect, it } from "bun:test";
import { getPostLoginPath } from "./routes";

describe("getPostLoginPath", () => {
  it("returns a moderator to the saved deep link", () => {
    expect(getPostLoginPath("moderator", { pathname: "/moderator/podcast/episodes/e1", search: "?q=a", hash: "#x" })).toBe("/moderator/podcast/episodes/e1?q=a#x");
  });

  it("falls back to the role home when the role may not open the saved area", () => {
    expect(getPostLoginPath("user", { pathname: "/moderator/podcast" })).toBe("/");
    expect(getPostLoginPath("admin", { pathname: "/moderator/podcast" })).toBe("/admin");
    expect(getPostLoginPath("moderator", { pathname: "/admin/users" })).toBe("/moderator");
  });

  it("does not treat a sibling prefix as a protected area", () => {
    expect(getPostLoginPath("user", { pathname: "/moderators" })).toBe("/moderators");
  });

  it("rejects unsafe and login targets", () => {
    expect(getPostLoginPath("moderator", { pathname: "//evil.example" })).toBe("/moderator");
    expect(getPostLoginPath("user", { pathname: "/login/x" })).toBe("/");
  });

  it("keeps public deep links for plain users only", () => {
    expect(getPostLoginPath("user", { pathname: "/history/events/a", search: "?x=1" })).toBe("/history/events/a?x=1");
    expect(getPostLoginPath("moderator", { pathname: "/history/events/a" })).toBe("/moderator");
  });
});
