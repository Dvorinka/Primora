# Primora — Working list

## Phase 5 — Distribution (shipped, `deb56d9`)

- [x] PWA: vite-plugin-pwa + manifest + icons + install banner; SW precaches
      the shell, `/api` `/auth` `/mailpit` stay NetworkOnly
- [x] `apps/desktop`: Tauri 2 thin shell — connect screen, tray
      (Show / Change Server / Quit), close-to-tray, single-instance
- [x] `release.yml`: desktop bundle matrix (linux/macOS/windows) attached to
      GitHub Releases
- [x] Workspace bumped to `0.5.0`, lockfile synced
- [x] CHANGELOG + ROADMAP + README updated
- [x] Gates: backend tests, frontend typecheck, workspace build, cargo check,
      `check:generated` — all green
- [x] Smoke: desktop shell rendered the compose deployment's dashboard
      (tauri-driver + WebKitWebDriver)

## Up next / future

- [x] Tag `v0.5.0` + push — release workflow fires on tag push
- [ ] Verify macOS/Windows desktop bundles from CI artifacts once the tag run
      lands (host-verified on Linux only)
- [ ] Capacitor native shells — only if push notifications become a real
      requirement
- [ ] Docs site / `docs/` folder — once the API surface stops moving per-phase
      (revisit at `v1.0.0`)
- [ ] Desktop bundle signing + auto-updater — unsigned artifacts today; add
      when distribution matures
