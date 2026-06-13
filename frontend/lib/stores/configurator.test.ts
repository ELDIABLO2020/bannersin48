import { describe, it, expect, beforeEach } from "vitest";
import { useConfigurator } from "./configurator";

describe("useConfigurator — store reducer logic", () => {
  beforeEach(() => {
    useConfigurator.getState().reset();
  });

  it("starts in vinyl mode, 13 oz, 4x8, qty 1", () => {
    const s = useConfigurator.getState();
    expect(s.product).toBe("vinyl");
    expect(s.material).toBe("VINYL_13OZ_SINGLE");
    expect(s.size).toEqual({ widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 });
    expect(s.quantity).toBe(1);
    expect(s.finishing.welding).toBe(true);
    expect(s.finishing.grommets).toBe(true);
    expect(s.finishing.polePockets).toBe(false);
  });

  it("setMaterial updates material", () => {
    useConfigurator.getState().setMaterial("VINYL_18OZ_SINGLE");
    expect(useConfigurator.getState().material).toBe("VINYL_18OZ_SINGLE");
  });

  it("togglePolePockets enables pole pockets and disables welding + grommets with message", () => {
    useConfigurator.getState().togglePolePockets(true, "TOP_AND_BOTTOM");
    const s = useConfigurator.getState();
    expect(s.finishing.polePockets).toBe(true);
    expect(s.finishing.polePocketPlacement).toBe("TOP_AND_BOTTOM");
    expect(s.finishing.welding).toBe(false);
    expect(s.finishing.grommets).toBe(false);
    expect(s.lastFinishingMessage).toMatch(/Pole pockets require/);
  });

  it("turning pole pockets back off leaves welding/grommets at the cleared value", () => {
    // Pole pockets auto-disable welding + grommets (per §8.2). When pole pockets
    // are turned back off, the user must re-enable them manually if desired —
    // the store does not silently restore them.
    const store = useConfigurator.getState();
    store.togglePolePockets(true, "TOP");
    store.togglePolePockets(false);
    const s = useConfigurator.getState();
    expect(s.finishing.polePockets).toBe(false);
    expect(s.finishing.welding).toBe(false);
    expect(s.finishing.grommets).toBe(false);
    expect(s.lastFinishingMessage).toBeNull();
  });

  it("user can re-enable welding after disabling pole pockets", () => {
    const store = useConfigurator.getState();
    store.togglePolePockets(true, "TOP");
    store.togglePolePockets(false);
    store.setFinishing({ welding: true, grommets: true });
    const s = useConfigurator.getState();
    expect(s.finishing.welding).toBe(true);
    expect(s.finishing.grommets).toBe(true);
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
    useConfigurator.getState().setProduct("retractable");
    const s = useConfigurator.getState();
    expect(s.product).toBe("retractable");
    expect(s.material).toBe("RETRACTABLE");
    expect(s.size.widthFt).toBe(0);
  });

  it("setArtwork stores the id and filename", () => {
    useConfigurator.getState().setArtwork("art_42", "my-design.pdf");
    const s = useConfigurator.getState();
    expect(s.artworkId).toBe("art_42");
    expect(s.artworkFileName).toBe("my-design.pdf");
  });
});
