import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const proxy = clerkMiddleware();

export default function handler(req: NextRequest) {
  return proxy(req);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
