import { LOCAL_ADMIN_EMAIL, LOCAL_ADMIN_PASSWORD, resolveSeedAdmin } from "./seed-admin";

describe("resolveSeedAdmin", () => {
  it("uses the local defaults outside production", () => {
    expect(resolveSeedAdmin({})).toEqual({ email: LOCAL_ADMIN_EMAIL, password: LOCAL_ADMIN_PASSWORD });
    expect(resolveSeedAdmin({ NODE_ENV: "development", ADMIN_EMAIL: "Me@Shop.com", ADMIN_PASSWORD: "x" })).toEqual({
      email: "me@shop.com",
      password: "x",
    });
  });

  it("refuses to run in production without explicit credentials", () => {
    expect(() => resolveSeedAdmin({ NODE_ENV: "production" })).toThrow(/ADMIN_EMAIL is required; ADMIN_PASSWORD is required/);
    expect(() => resolveSeedAdmin({ NODE_ENV: "production", ADMIN_EMAIL: "a@b.com" })).toThrow(/ADMIN_PASSWORD is required/);
  });

  it("refuses short or default passwords in production", () => {
    const base = { NODE_ENV: "production", ADMIN_EMAIL: "owner@bannersin48.com" };
    expect(() => resolveSeedAdmin({ ...base, ADMIN_PASSWORD: "fifteen-chars!!" })).toThrow(/at least 16/);
    expect(() => resolveSeedAdmin({ ...base, ADMIN_PASSWORD: `${LOCAL_ADMIN_PASSWORD}${LOCAL_ADMIN_PASSWORD}` })).toThrow(/placeholder/);
    expect(() => resolveSeedAdmin({ ...base, ADMIN_PASSWORD: "MySuperPassword2026!" })).toThrow(/placeholder/);
  });

  it("accepts strong production credentials", () => {
    expect(resolveSeedAdmin({ NODE_ENV: "production", ADMIN_EMAIL: "Owner@Bannersin48.com", ADMIN_PASSWORD: "vivid-otter-lantern-42" })).toEqual({
      email: "owner@bannersin48.com",
      password: "vivid-otter-lantern-42",
    });
  });
});
