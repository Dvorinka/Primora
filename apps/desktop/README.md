# @primora/desktop

Tauri 2 shell around a self-hosted Primora deployment. On first run it asks for
the deployment URL; after that the webview renders the same SolidJS console the
server serves. Nothing is embedded — no backend, no database. The self-hosted
model is preserved.

## Prerequisites

- Rust (rustup) and Node.js.
- Linux webview deps:
  `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

## Run

```bash
npm run dev --workspace @primora/desktop      # dev window (debug build)
npm run bundle --workspace @primora/desktop   # release bundles → src-tauri/target/release/bundle
```

## Notes

- Config lives at `~/.config/dev.tdvorak.primora/config.json` — one field, `server_url`.
- System tray: **Show Primora**, **Change Server…** (clears the URL, back to the
  connect screen), **Quit**. Closing the window hides to the tray; a second
  launch focuses the existing window (single-instance).
- The connect screen only checks that the host answers; if the URL turns out not
  to be a Primora deployment, use the tray's Change Server.
- macOS blocks plain-HTTP loads to non-localhost hosts (ATS). Use HTTPS, or
  `http://localhost` for a local deployment.
- Deep links / push notifications: deliberately omitted — nothing needs them yet.
