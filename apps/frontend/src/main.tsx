import { render } from "solid-js/web";

import App from "./App";
import "./index.css";

// Reload once when an updated service worker takes control. Without this the
// precached shell keeps serving the previous release until a manual refresh.
// Skipped when the page has no controller yet (first SW install) so first-time
// visitors don't get an extra reload.
if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

render(() => <App />, document.getElementById("root")!);
