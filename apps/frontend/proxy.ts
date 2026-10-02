import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Server layouts cannot read searchParams. Forward the URL for auth redirects.
  // Overwrite incoming values so the browser cannot choose a different URL here.
  requestHeaders.set(
    "x-auth-request-url",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/signin",
    "/signup",
    "/dashboard/:path*",
    "/invitations/:path*",
    "/workspaces/:path*",
  ],
};
