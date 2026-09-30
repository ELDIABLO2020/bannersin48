import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed links are short-lived: long enough to load a preview or start a download. */
export const DOWNLOAD_URL_TTL_SECONDS = 300;
/** Tolerated clock drift for `exp` in the future (the signer is this process, so it is small). */
const MAX_FUTURE_SKEW_SECONDS = 5;

/**
 * `preview`: raster images may be served inline (for <img>); everything else is an attachment.
 * `download`: always an attachment.
 */
export const DOWNLOAD_PURPOSES = ["preview", "download"] as const;
export type DownloadPurpose = (typeof DOWNLOAD_PURPOSES)[number];

export interface SignedDownloadUrl {
  url: string;
  expiresAt: string;
}

export interface DownloadUrlQuery {
  exp?: unknown;
  purpose?: unknown;
  sig?: unknown;
}

function invalid(code: "DOWNLOAD_LINK_INVALID" | "DOWNLOAD_LINK_EXPIRED"): ForbiddenException {
  return new ForbiddenException({
    code,
    message: code === "DOWNLOAD_LINK_EXPIRED" ? "This download link has expired." : "This download link is not valid.",
  });
}

/**
 * Capability URLs for stored files: `/artwork/:id/file?purpose=&exp=&sig=` where
 * sig = HMAC-SHA256(DOWNLOAD_URL_SECRET, `${id}.${exp}.${purpose}`). Access rules are
 * enforced when a URL is minted; the file route only checks the signature, so no
 * bearer token ever appears in a URL.
 */
@Injectable()
export class DownloadUrlService {
  private readonly secret: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>("DOWNLOAD_URL_SECRET");
    this.baseUrl = (config.get<string>("PUBLIC_API_URL") ?? "http://localhost:3001").replace(/\/$/, "");
  }

  sign(fileId: string, purpose: DownloadPurpose, nowMs = Date.now()): SignedDownloadUrl {
    const exp = Math.floor(nowMs / 1000) + DOWNLOAD_URL_TTL_SECONDS;
    const query = new URLSearchParams({ purpose, exp: String(exp), sig: this.mac(fileId, exp, purpose) });
    return {
      url: `${this.baseUrl}/artwork/${encodeURIComponent(fileId)}/file?${query}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  /** Returns the signed purpose, or throws 403. Constant-time signature comparison. */
  verify(fileId: string, query: DownloadUrlQuery, nowMs = Date.now()): DownloadPurpose {
    const { exp, purpose, sig } = query;
    if (
      typeof exp !== "string" ||
      !/^[1-9]\d{0,11}$/.test(exp) ||
      typeof sig !== "string" ||
      !/^[0-9a-f]{64}$/.test(sig) ||
      typeof purpose !== "string" ||
      !(DOWNLOAD_PURPOSES as readonly string[]).includes(purpose)
    ) {
      throw invalid("DOWNLOAD_LINK_INVALID");
    }
    const expected = Buffer.from(this.mac(fileId, Number(exp), purpose), "hex");
    if (!timingSafeEqual(Buffer.from(sig, "hex"), expected)) throw invalid("DOWNLOAD_LINK_INVALID");

    const nowSec = Math.floor(nowMs / 1000);
    const expSec = Number(exp);
    if (expSec < nowSec) throw invalid("DOWNLOAD_LINK_EXPIRED");
    // A valid signature on a far-future expiry can only come from a misconfigured signer.
    if (expSec - nowSec > DOWNLOAD_URL_TTL_SECONDS + MAX_FUTURE_SKEW_SECONDS) throw invalid("DOWNLOAD_LINK_INVALID");
    return purpose as DownloadPurpose;
  }

  private mac(fileId: string, exp: number, purpose: string): string {
    return createHmac("sha256", this.secret).update(`${fileId}.${exp}.${purpose}`).digest("hex");
  }
}
