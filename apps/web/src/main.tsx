import { RegistryProvider } from "@effect/atom-react";
import "@fontsource/bungee";
import "@fontsource-variable/jetbrains-mono";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { unlockSound } from "./lib/sound";
import { routeTree } from "./routeTree.gen.ts";
import "./styles.css";

const router = createRouter({ routeTree });

for (const gesture of ["pointerdown", "keydown"] as const) {
  window.addEventListener(gesture, unlockSound, { once: true, capture: true });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RegistryProvider>
      <RouterProvider router={router} />
    </RegistryProvider>
  </StrictMode>,
);
