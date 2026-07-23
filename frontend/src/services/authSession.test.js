import { afterEach, describe, expect, it } from "vitest";

import { authSession } from "./authSession";

describe("authSession", () => {
  afterEach(() => authSession.clear());

  it("keeps access tokens in memory and clears them", () => {
    expect(authSession.getToken()).toBeNull();
    authSession.setToken("access-token");
    expect(authSession.getToken()).toBe("access-token");
    authSession.clear();
    expect(authSession.getToken()).toBeNull();
  });
});
