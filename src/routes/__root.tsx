import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const APP_NAME = "Chambers";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#FF4D00" },
      {
        name: "description",
        content:
          "Resume and cover letter studio in beta. Letter-width paper, ATS readiness check, tailor from your facts. Your resume stays on this device.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: "hairline !bg-paper !text-ink !rounded-md !shadow-chambers !font-sans",
          }}
        />
        <Scripts />
      </body>
    </html>
  ),
});
