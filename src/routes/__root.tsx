import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { InstallPrompt } from "~/components/install-prompt";
import appCss from "~/styles/app.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "FED — Are you FED up? Get FED." },
      {
        name: "description",
        content:
          "FED helps you get your energy back with a warm plan for food, movement, and energy. Take the 2-minute quiz: Are you FED up? Get FED.",
      },
      { name: "theme-color", content: "#C1673C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "default",
      },
      { name: "apple-mobile-web-app-title", content: "FED" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "manifest",
        href: "/manifest.webmanifest",
        // the manifest and SW must load regardless of the app's content-type
      },
      { rel: "icon", type: "image/png", href: "/static/fed-icon-192.png" },
      { rel: "shortcut icon", href: "/static/fed-icon-192.png" },
      { rel: "apple-touch-icon", href: "/static/fed-icon-180.png" },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center text-ink-soft">
      Page not found
    </div>
  ),
  component: RootComponent,
});
function RootComponent() {
  // Register the service worker from the client (after hydration). This is the
  // app's installability/offline entry point — runs only in the browser.
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("[FED] SW registration failed", err));
    }
  }, []);
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <InstallPrompt />
        <Scripts />
      </body>
    </html>
  );
}
