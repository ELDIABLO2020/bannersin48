import { describe, it, expect, beforeEach } from "vitest";
import { useConfigurator, hydrateBuilderSession } from "./configurator";
import { DEFAULT_FINISHING } from "@bannersin48/shared";

describe("useConfigurator — multi-sign + finishing", () => {
  beforeEach(() => {
    useConfigurator.getState().reset();
  });

  it("starts in vinyl mode, 13 oz, 4×8 landscape, qty 1, one sign", () => {
    const s = useConfigurator.getState();
    expect(s.productId).toBe("HD_BANNER");
    expect(s.material).toBe("VINYL_13OZ_SINGLE");
    expect(s.size).toEqual({ widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 });
    expect(s.quantity).toBe(1);
    expect(s.finishing.welding).toBe(true);
    expect(s.finishing.grommets).toBe(true);
    expect(s.finishing.polePockets).toBe(false);
    expect(s.finishing.rope).toBe(false);
    expect(s.signs).toHaveLength(1);
  });

  it("setMaterial updates material on active sign", () => {
    useConfigurator.getState().setMaterial("VINYL_18OZ_SINGLE");
    expect(useConfigurator.getState().material).toBe("VINYL_18OZ_SINGLE");
    expect(useConfigurator.getState().signs[0]!.material).toBe("VINYL_18OZ_SINGLE");
  });

  it("togglePolePockets enables pockets, depth, and clears welding + grommets", () => {
    useConfigurator.getState().togglePolePockets(true, "TOP_AND_BOTTOM", 3);
    const s = useConfigurator.getState();
    expect(s.finishing.polePockets).toBe(true);
    expect(s.finishing.polePocketPlacement).toBe("TOP_AND_BOTTOM");
    expect(s.finishing.polePocketDepthIn).toBe(3);
    expect(s.finishing.welding).toBe(false);
    expect(s.finishing.grommets).toBe(false);
    expect(s.lastFinishingMessage).toMatch(/Pole pockets require/);
  });

  it("enabling rope clears grommets", () => {
    useConfigurator.getState().setFinishing({ rope: true });
    const s = useConfigurator.getState();
    expect(s.finishing.rope).toBe(true);
    expect(s.finishing.grommets).toBe(false);
  });

  it("rejects wind slits outside size band", () => {
    useConfigurator.getState().applySize(2, 4);
    useConfigurator.getState().setFinishing({ windSlits: true });
    expect(useConfigurator.getState().finishing.windSlits).toBe(false);
    expect(useConfigurator.getState().lastFinishingMessage).toMatch(/Wind slits/);
  });

  it("setQuantity clamps to 1..10", () => {
    const store = useConfigurator.getState();
    store.setQuantity(0);
    expect(useConfigurator.getState().quantity).toBe(1);
    store.setQuantity(50);
    expect(useConfigurator.getState().quantity).toBe(10);
    store.setQuantity(3);
    expect(useConfigurator.getState().quantity).toBe(3);
  });

  it("setProduct to retractable forces material RETRACTABLE and zeros dimensions", () => {
    useConfigurator.getState().setProduct("RETRACTABLE");
    const s = useConfigurator.getState();
    expect(s.productId).toBe("RETRACTABLE");
    expect(s.material).toBe("RETRACTABLE");
    expect(s.size.widthFt).toBe(0);
  });

  it("restores a valid landscape default size when returning to vinyl", () => {
    useConfigurator.getState().setProduct("RETRACTABLE");
    useConfigurator.getState().setProduct("HD_BANNER");
    expect(useConfigurator.getState().size).toEqual({
      widthFt: 8,
      widthIn: 0,
      heightFt: 4,
      heightIn: 0,
    });
  });

  it("setArtwork stores id, filename, and can auto-size from DPI", () => {
    useConfigurator.getState().setArtwork("art_42", "my-design.png", "/p.png", {
      widthPx: 1800,
      heightPx: 3600,
      dpi: 150,
      autoSize: true,
    });
    const s = useConfigurator.getState();
    expect(s.artworkId).toBe("art_42");
    expect(s.artworkFileName).toBe("my-design.png");
    expect(s.size).toEqual({ widthFt: 1, widthIn: 0, heightFt: 2, heightIn: 0 });
  });

  it("setArtwork skips auto-size on fixed products", () => {
    useConfigurator.getState().setProduct("ECONOSTAND");
    const before = useConfigurator.getState().size;
    useConfigurator.getState().setArtwork("art_42", "stand.png", "/p.png", {
      widthPx: 1800,
      heightPx: 3600,
      dpi: 150,
      autoSize: true,
    });
    const s = useConfigurator.getState();
    expect(s.artworkId).toBe("art_42");
    expect(s.size).toEqual(before);
  });

  it("addSign creates a second sign and selectSign switches mirrors", () => {
    useConfigurator.getState().applySize(5, 8);
    useConfigurator.getState().addSign();
    const s = useConfigurator.getState();
    expect(s.signs).toHaveLength(2);
    expect(s.activeSignId).toBe(s.signs[1]!.id);
    useConfigurator.getState().selectSign(s.signs[0]!.id);
    expect(useConfigurator.getState().size).toEqual({ widthFt: 5, widthIn: 0, heightFt: 8, heightIn: 0 });
  });

  it("removeSign keeps at least one sign", () => {
    useConfigurator.getState().addSign();
    const id = useConfigurator.getState().signs[0]!.id;
    useConfigurator.getState().removeSign(id);
    expect(useConfigurator.getState().signs).toHaveLength(1);
    useConfigurator.getState().removeSign(useConfigurator.getState().signs[0]!.id);
    expect(useConfigurator.getState().signs).toHaveLength(1);
  });

  it("setColorMatching stores PMS notes", () => {
    useConfigurator.getState().setColorMatching("PMS 186 C");
    expect(useConfigurator.getState().colorMatching).toEqual({ pmsNotes: "PMS 186 C" });
    useConfigurator.getState().setColorMatching(null);
    expect(useConfigurator.getState().colorMatching).toBeUndefined();
  });

  it("setGrommetPoints forces CUSTOM preset", () => {
    useConfigurator.getState().setGrommetPoints([
      { xIn: 1, yIn: 1 },
      { xIn: 47, yIn: 1 },
    ]);
    const f = useConfigurator.getState().finishing;
    expect(f.grommetPreset).toBe("CUSTOM");
    expect(f.grommetPoints).toHaveLength(2);
    expect(f.grommets).toBe(true);
  });
});

describe("hydrateBuilderSession — dimension-semantics migration", () => {
  const legacySign = {
    id: "sign_legacy",
    productId: "HD_BANNER",
    size: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
    material: "VINYL_13OZ_SINGLE",
    finishing: DEFAULT_FINISHING,
    quantity: 1,
    artworkId: null,
    artworkFileName: null,
    artworkPreviewUrl: null,
    fitMode: "fit",
    aspectLocked: true,
  };

  it("discards legacy unversioned drafts (portrait-axis convention)", () => {
    const raw = JSON.stringify({ signs: [legacySign], activeSignId: "sign_legacy" });
    expect(hydrateBuilderSession(raw)).toBeNull();
  });

  it("discards v1 drafts below the dimension-semantics version", () => {
    const raw = JSON.stringify({
      version: 1,
      signs: [legacySign],
      activeSignId: "sign_legacy",
    });
    expect(hydrateBuilderSession(raw)).toBeNull();
  });

  it("accepts v2 drafts and normalizes missing fields", () => {
    const raw = JSON.stringify({
      version: 2,
      signs: [{ ...legacySign, id: "sign_v2", size: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 } }],
      activeSignId: "sign_v2",
    });
    const session = hydrateBuilderSession(raw);
    expect(session).not.toBeNull();
    expect(session!.signs[0]!.size).toEqual({ widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 });
    expect(session!.signs[0]!.finishing.webbing).toBe(false);
  });

  it("returns null for malformed JSON", () => {
    expect(hydrateBuilderSession("{not json")).toBeNull();
  });
});
