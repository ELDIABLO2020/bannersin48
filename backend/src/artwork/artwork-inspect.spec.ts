import { inspectDimensions, sniffMime } from "./artwork-inspect";

/** Build minimal magic-byte buffers per format. */
function jpegBuf(w = 100, h = 50): Buffer {
  // Minimal JFIF: SOI + APP0 (v1.1, units=inches, 150 dpi) + SOF0 + EOI.
  const app0Content = Buffer.concat([
    Buffer.from("JFIF\0"),
    Buffer.from([0x01, 0x01]), // version
    Buffer.from([0x01]), // density units = dots per inch
    (b => (b.writeUInt16BE(150, 0), b))(Buffer.alloc(2)),
    (b => (b.writeUInt16BE(150, 0), b))(Buffer.alloc(2)),
    Buffer.from([0x00, 0x00]), // no thumbnail
  ]);
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0]),
    (b => (b.writeUInt16BE(app0Content.length + 2, 0), b))(Buffer.alloc(2)),
    app0Content,
  ]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03, 0x00, 0x22, 0x11, 0x00, 0x22, 0x11, 0x00]);
  sof.writeUInt16BE(h, 5);
  sof.writeUInt16BE(w, 7);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}

describe("artwork MIME sniffing (magic bytes)", () => {
  it("detects the V1 JPEG/PNG/PDF formats", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(Buffer.from("%PDF-1.7\n…"))).toBe("application/pdf");
  });

  it("rejects TIFF and EPS until trustworthy review derivatives exist", () => {
    expect(sniffMime(Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x00]))).toBeNull();
    expect(sniffMime(Buffer.from([0x4d, 0x4d, 0x00, 0x2a, 0x00]))).toBeNull();
    expect(sniffMime(Buffer.from("%!PS-Adobe-3.0 EPSF-3.0"))).toBeNull();
    expect(sniffMime(Buffer.from([0xc5, 0xd0, 0xd3, 0xc6]))).toBeNull();
  });

  it("rejects disallowed or spoofed files", () => {
    const gif = Buffer.from("GIF89a" + "x".repeat(32));
    const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    const spoofed = Buffer.concat([Buffer.from("<html><body>"), Buffer.from([0xff, 0xd8, 0xff])]); // jpeg tag inside html
    expect(sniffMime(gif)).toBeNull();
    expect(sniffMime(exe)).toBeNull();
    expect(sniffMime(spoofed)).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });
});

describe("dimension/DPI inspection", () => {
  it("parses PNG IHDR + pHYs", () => {
    const ihdrEnd = 8 + 4 + 4 + 13;
    const chunk = Buffer.alloc(ihdrEnd + 4); // + CRC
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(chunk, 0);
    chunk.writeUInt32BE(13, 8);
    chunk.write("IHDR", 12, "latin1");
    chunk.writeUInt32BE(1200, 16); // width
    chunk.writeUInt32BE(600, 20); // height

    const physChunk = (() => {
      const b = Buffer.alloc(4 + 4 + 9 + 4);
      b.writeUInt32BE(9, 0);
      b.write("pHYs", 4, "latin1");
      b.writeUInt32BE(5669, 8);
      b.writeUInt32BE(5669, 12);
      b.writeUInt8(1, 16); // unit = metre
      return b;
    })();

    const buf = Buffer.concat([chunk, physChunk]);
    const dims = inspectDimensions("image/png", buf);
    expect(dims.widthPx).toBe(1200);
    expect(dims.heightPx).toBe(600);
    expect(dims.dpi).toBe(144);
  });

  it("parses JPEG SOF dimensions and JFIF density", () => {
    const dims = inspectDimensions("image/jpeg", jpegBuf(2400, 600));
    expect(dims.widthPx).toBe(2400);
    expect(dims.heightPx).toBe(600);
    expect(dims.dpi).toBe(150);
  });

  it("extracts PDF MediaBox points", () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n/MediaBox [0 0 612 792]\nendobj\n");
    const dims = inspectDimensions("application/pdf", pdf);
    expect(dims.report.widthPt).toBeCloseTo(612);
    expect(dims.report.heightPt).toBeCloseTo(792);
    expect(dims.widthPx).toBeUndefined();
  });

  it("never throws on garbage input", () => {
    expect(() => inspectDimensions("image/png", Buffer.from("garbage"))).not.toThrow();
  });
});
