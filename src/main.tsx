import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const cleanupDevServiceWorkers = async (): Promise<boolean> => {
  if (!import.meta.env.DEV || !("serviceWorker" in navigator)) return true;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = "caches" in window ? await caches.keys() : [];
    const pwaCacheNames = cacheNames.filter((name) =>
      ["workbox", "static-assets", "api-cache", "google-fonts"].some((prefix) => name.includes(prefix))
    );

    if (registrations.length === 0 && pwaCacheNames.length === 0) return true;

    await Promise.all([
      ...registrations.map((registration) => registration.unregister()),
      ...pwaCacheNames.map((name) => caches.delete(name)),
    ]);

    if (sessionStorage.getItem("grit-dev-sw-cleaned") !== "true") {
      sessionStorage.setItem("grit-dev-sw-cleaned", "true");
      window.location.reload();
      return false;
    }
  } catch (error: unknown) {
    console.warn("Dev service worker cleanup skipped", error);
  }

  return true;
};

const renderApp = (): void => {
  createRoot(document.getElementById("root")!).render(<App />);
};

void cleanupDevServiceWorkers().then((shouldRender) => {
  if (shouldRender) renderApp();
});
