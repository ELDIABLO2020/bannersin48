import { NextResponse } from "next/server";

export function middleware(): NextResponse {
  const response = NextResponse.next();
  const mode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? "internal_manual";
  if (mode === "internal_manual") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
