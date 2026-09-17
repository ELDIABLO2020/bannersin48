/**
 * In-memory fixtures for the MSW mock backend.
 * Designed so the frontend can develop, screenshot, and E2E-test every screen
 * before the real NestJS backend ships.
 */

import {
  type Order,
  type User,
} from "@bannersin48/shared";

interface MockOrderRecord {
  order: Order;
}

class MockStore {
  users: Map<string, { user: User; password: string }> = new Map();
  userIdCounter = 1;
  artwork: Map<
    string,
    {
      id: string;
      userId: string;
      folderId: string;
      filename: string;
      previewUrl: string;
      mime: string;
      size: number;
      widthPx?: number;
      heightPx?: number;
      dpi?: number;
    }
  > = new Map();
  artworkIdCounter = 1;
  artworkFolders: Array<{ id: string; name: string; parentId: string | null }> = [
    { id: "folder_home", name: "Home", parentId: null },
  ];
  quotes: Map<string, { request: Record<string, unknown>; validUntil: string; total: number }> = new Map();
  quoteIdCounter = 1;
  orders: Map<string, MockOrderRecord> = new Map();
  orderIdCounter = 1;
}

export const store = new MockStore();

// Seed a demo user
store.users.set("demo@bannersin48.com", {
  user: {
    id: "user_demo",
    email: "demo@bannersin48.com",
    fullName: "Demo Customer",
    taxExempt: false,
    taxExemptApproved: false,
    rewardsPoints: 120,
    savedAddresses: [],
    createdAt: new Date().toISOString(),
  },
  password: "demo1234",
});

// Seed Image Zone sample assets in Home folder
store.artwork.set("art_sample_1", {
  id: "art_sample_1",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "grand-opening.png",
  previewUrl: "/mock-artwork-portrait.svg",
  mime: "image/png",
  size: 240_000,
  widthPx: 1800,
  heightPx: 3600,
  dpi: 150,
});
store.artwork.set("art_sample_2", {
  id: "art_sample_2",
  userId: "user_demo",
  folderId: "folder_home",
  filename: "sale-banner.jpg",
  previewUrl: "/mock-artwork-landscape.svg",
  mime: "image/jpeg",
  size: 180_000,
  widthPx: 2400,
  heightPx: 1200,
  dpi: 150,
});
store.artworkIdCounter = 3;
