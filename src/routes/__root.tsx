import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "~/styles/app.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FED — Are you FED up? Get FED." },
      {
        name: "description",
        content:
          "FED helps you get your energy back with a plan that finally fits. Take the 2-minute quiz: Are you FED up? Get FED.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect x='3' y='3' width='34' height='34' rx='9' fill='%23191614' stroke='%23E8B86B' stroke-width='2'/%3E%3Ctext x='20' y='27' font-size='16' font-weight='bold' text-anchor='middle' fill='%23E8B86B'%3EF%3C/text%3E%3C/svg%3E",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center text-[#9a8f82]">
      Page not found
    </div>
  ),
  component: RootComponent,
});
function RootComponent() {
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
        <Scripts />
      </body>
    </html>
  );
}
