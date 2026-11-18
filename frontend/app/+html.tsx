// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="theme-color" content="#173C2C" />
        <link rel="manifest" href="./manifest.webmanifest" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
        
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function () {
        if (!("serviceWorker" in navigator)) return;

        window.addEventListener("load", async function () {
          try {
            var appRoot = new URL("./", window.location.href);
            var swUrl = new URL("sw.js", appRoot);

            var registration = await navigator.serviceWorker.register(
              swUrl.href,
              {
                scope: appRoot.pathname,
                updateViaCache: "none"
              }
            );

            console.log(
              "[SVKD COIR] Service worker registered:",
              registration.scope
            );

            await registration.update();
          } catch (error) {
            console.error(
              "[SVKD COIR] Service worker registration failed:",
              error
            );
          }
        });
      })();
    `,
  }}
/>

          
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
