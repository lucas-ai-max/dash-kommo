import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("auth_token");
    const isLoginPage = request.nextUrl.pathname.startsWith("/login");

    // Allow access to public assets like logo and favicon
    if (
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/api") ||
        request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)
    ) {
        return NextResponse.next();
    }

    // Not logged in and trying to access a protected route
    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Logged in but trying to access login page
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
