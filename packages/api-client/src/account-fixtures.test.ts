import { describe, expect, it } from "vitest";
import { store } from "./mocks/fixtures";

/**
 * Plan §4.4: the denormalised reward balance must equal the ledger sum for
 * every seeded account, and the fixtures must be internally consistent
 * (addresses have one default, designs point at owned artwork).
 */
describe("customer account fixtures", () => {
  it("reward ledger totals equal each seeded user's balance", () => {
    for (const { user } of store.users.values()) {
      const sum = store.ledger.filter((r) => r.userId === user.id).reduce((n, r) => n + r.deltaCents, 0);
      expect(sum, `${user.email} ledger sum`).toBe(user.rewardsPoints);
    }
    expect(store.ledger.length).toBeGreaterThan(0);
  });

  it("each address book has at most one default shipping address", () => {
    const byUser = new Map<string, number>();
    for (const a of store.addresses.values()) if (a.isDefaultShipping) byUser.set(a.userId, (byUser.get(a.userId) ?? 0) + 1);
    for (const [userId, count] of byUser) expect(count, `${userId} defaults`).toBe(1);
  });

  it("saved designs reference the owner's own artwork, if any", () => {
    for (const design of store.designs.values()) {
      if (!design.artworkFileId) continue;
      expect(store.artwork.get(design.artworkFileId)?.userId).toBe(design.userId);
    }
  });
});
