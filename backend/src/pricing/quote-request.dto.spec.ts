import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { MAX_GROMMET_POINTS } from "@bannersin48/shared";
import { QuoteRequestDto } from "./quote-request.dto";

/** Same options as the global ValidationPipe (bootstrap.ts). */
async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(QuoteRequestDto, body, { enableImplicitConversion: false });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
  return { dto, errors: JSON.stringify(errors.map((e) => e.toString())), count: errors.length };
}

const base = {
  productId: "HD_BANNER",
  material: "VINYL_13OZ_SINGLE",
  dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
  quantity: 1,
};

const points = (n: number, xIn = 1, yIn = 1) => Array.from({ length: n }, () => ({ xIn, yIn }));

describe("QuoteRequestDto (H1)", () => {
  it("accepts a normal builder request with custom grommets", async () => {
    const { count } = await check({
      ...base,
      finishing: {
        grommets: true,
        grommetPreset: "CUSTOM",
        grommetSpacing: "EVERY_2FT",
        grommetPoints: points(MAX_GROMMET_POINTS, 0.5, 47.5),
      },
    });
    expect(count).toBe(0);
  });

  it(`rejects more than ${MAX_GROMMET_POINTS} grommet points`, async () => {
    const { count, errors } = await check({ ...base, finishing: { grommetPoints: points(MAX_GROMMET_POINTS + 1) } });
    expect(count).toBeGreaterThan(0);
    expect(errors).toMatch(/grommetPoints/);
  });

  it.each([
    ["a negative coordinate", { xIn: -1, yIn: 2 }],
    ["a coordinate past 11 ft 11 in", { xIn: 144, yIn: 2 }],
    ["a string coordinate", { xIn: "3", yIn: 2 }],
    ["NaN", { xIn: Number.NaN, yIn: 2 }],
    ["a missing coordinate", { xIn: 3 }],
    ["a non-object point", 7],
  ])("rejects grommet points with %s", async (_label, point) => {
    const { count } = await check({ ...base, finishing: { grommetPoints: [point] } });
    expect(count).toBeGreaterThan(0);
  });

  it("rejects grommetPoints that is not an array", async () => {
    expect((await check({ ...base, finishing: { grommetPoints: { xIn: 1, yIn: 1 } } })).count).toBeGreaterThan(0);
  });

  it("strips unknown keys inside nested grommet points (whitelist reaches nested objects)", async () => {
    const { dto, count } = await check({ ...base, finishing: { grommetPoints: [{ xIn: 1, yIn: 2, blob: "x".repeat(50_000) }] } });
    expect(count).toBe(0);
    expect(dto.finishing?.grommetPoints?.[0]).toEqual({ xIn: 1, yIn: 2 });
  });

  it.each([
    ["polePocketPlacement", "SIDEWAYS"],
    ["ropePlacement", "LEFT"],
    ["grommetPreset", "EVERYWHERE"],
    ["grommetSpacing", "EVERY_10FT"],
  ])("only allows the shared enum values for %s", async (key, value) => {
    expect((await check({ ...base, finishing: { [key]: value } })).count).toBeGreaterThan(0);
  });

  it("bounds free strings", async () => {
    expect((await check({ ...base, material: "M".repeat(61) })).count).toBeGreaterThan(0);
    expect((await check({ ...base, productId: "P".repeat(61) })).count).toBeGreaterThan(0);
    expect((await check({ ...base, material: "M".repeat(60) })).count).toBe(0);
  });

  it("keeps the existing numeric bounds", async () => {
    expect((await check({ ...base, quantity: 11 })).count).toBeGreaterThan(0);
    expect((await check({ ...base, dimensions: { ...base.dimensions, widthIn: 12 } })).count).toBeGreaterThan(0);
    expect((await check({ ...base, finishing: { polePocketDepthIn: 5 } })).count).toBeGreaterThan(0);
  });
});
