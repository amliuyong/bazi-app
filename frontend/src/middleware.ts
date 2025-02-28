import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Ensure we have a valid secret
const secret = process.env.NEXTAUTH_SECRET || 
  (process.env.NODE_ENV === 'development' ? 'development_secret_key_for_testing_only' : undefined);

export async function middleware(request: NextRequest) {
  // Use the request directly without type assertion
  const token = await getToken({ 
    req: request,
    secret: secret
  });
  
  console.log("Middleware token:", token ? "Authenticated" : "Not authenticated");
  
  // Define protected routes
  const protectedPaths = [
    "/chat",
    "/astrology",
    "/birth",
    "/bone",
    "/bone-weight",
  ];
  
  const path = request.nextUrl.pathname;
  
  // Check if the path is protected and user is not authenticated
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  if (isProtectedPath && !token) {
    console.log(`Redirecting from ${path} to /auth/signin`);
    const url = new URL("/auth/signin", request.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/chat/:path*",
    "/astrology/:path*",
    "/birth/:path*",
    "/bone/:path*",
    "/bone-weight/:path*",
  ],
}; 