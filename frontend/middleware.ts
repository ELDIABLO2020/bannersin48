import { NextRequest, NextResponse } from "next/server";

function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.DEPLOYMENT_ENV === "production";
}

function unauthorized(): NextResponse {
  return new NextResponse("Internal platform test. Authentication is required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Banners In 48 internal", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export function middleware(request: NextRequest): NextResponse {
  const mode = process.env.NEXT_PUBLIC_COMMERCE_MODE ?? "internal_manual";
  if (mode !== "internal_manual" || !isProductionDeployment()) {
    return NextResponse.next();
  }

  const username = process.env.INTERNAL_ACCESS_USERNAME;
  const password = process.env.INTERNAL_ACCESS_PASSWORD;
  if (!username || !password) return unauthorized();

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    const suppliedUsername = decoded.slice(0, separator);
    const suppliedPassword = decoded.slice(separator + 1);
    if (separator < 0 || suppliedUsername !== username || suppliedPassword !== password) {
      return unauthorized();
    }
  } catch {
    return unauthorized();
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
