import { describe, expect, it } from "vitest";
import { PERMISSION_KEYS } from "@bannersin48/shared";
import { auditActionLabel, permissionLabel, permissionResourceLabel, roleKeyLabel, roleKindLabel, staffStatusLabel } from "./labels";

describe("permissionLabel", () => {
  it("names every catalog key without falling back to the raw key", () => {
    for (const key of PERMISSION_KEYS) {
      const label = permissionLabel(key);
      expect(label).not.toContain(":");
      expect(label.length).toBeGreaterThan(3);
    }
  });

  it("falls back to readable text for keys outside the catalog", () => {
    expect(permissionLabel("widgets:frobnicate")).toBe("Widgets frobnicate");
    expect(permissionResourceLabel("widgets")).toBe("Widgets");
    expect(permissionResourceLabel("rbac")).toBe("Roles & permissions");
  });
});

describe("role, status and audit labels", () => {
  it("humanises role keys and statuses", () => {
    expect(roleKeyLabel("content_editor")).toBe("Content editor");
    expect(roleKeyLabel("night_shift")).toBe("Night shift");
    expect(roleKeyLabel(null)).toBe("No role");
    expect(staffStatusLabel("INVITED")).toBe("Invited");
  });

  it("names the derived kind enum for the roles editor only", () => {
    expect(roleKindLabel("CONTENT_EDITOR")).toBe("Content editor");
    expect(roleKindLabel("STAFF")).toBe("Staff");
    expect(roleKindLabel("SOMETHING_NEW")).toBe("Something new");
  });

  it("turns dotted audit actions into a verb phrase", () => {
    expect(auditActionLabel("rbac.user.role.assign")).toBe("Assign rbac user role");
    expect(auditActionLabel("user.suspend")).toBe("Suspend user");
    expect(auditActionLabel("order.mark_paid")).toBe("Mark paid order");
  });
});
