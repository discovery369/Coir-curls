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
                function showStatus(message) {
                  var box = document.getElementById("svkd-sw-status");
                  if (!box) {
                    box = document.createElement("div");
                    box.id = "svkd-sw-status";
                    box.style.cssText =
                      "position:fixed;z-index:999999;top:8px;left:8px;right:8px;padding:12px;background:#173C2C;color:white;font:14px Arial;border-radius:8px;white-space:pre-wrap;";
                    document.body.appendChild(box);
                  }
                  box.textContent = "SVKD COIR Offline Check\\n" + message;
                }

                async function registerWorker() {
                  if (!("serviceWorker" in navigator)) {
                    showStatus("ERROR: Service workers are not supported.");
                    return;
                  }

                  try {
                    showStatus("Checking service worker...");

                    var appRoot = new URL("./", window.location.href);
                    var swUrl = new URL("sw.js", appRoot);

                    showStatus("Registering: " + swUrl.href);

                    var registration =
                      await navigator.serviceWorker.register(
                        swUrl.href,
                        { scope: appRoot.pathname, updateViaCache: "none" }
                      );

                    showStatus(
                      "REGISTRATION SUCCESS\\n" +
                      "Scope: " + registration.scope + "\\n" +
                      "Active: " + !!registration.active + "\\n" +
                      "Waiting: " + !!registration.waiting + "\\n" +
                      "Installing: " + !!registration.installing
                    );
                  } catch (error) {
                    showStatus(
                      "REGISTRATION FAILED\\n" +
                      error.name + ": " + error.message
                    );
                  }
                }

                if (document.readyState === "complete") {
                  registerWorker();
                } else {
                  window.addEventListener("load", registerWorker);
                }
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
