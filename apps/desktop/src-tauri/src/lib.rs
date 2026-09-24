use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Listener, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

/// Persisted shell state — one field, the deployment to load.
#[derive(Default, Serialize, Deserialize)]
struct DesktopConfig {
    server_url: Option<String>,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|dir| dir.join("config.json"))
        .map_err(|e| e.to_string())
}

fn load_config(app: &AppHandle) -> DesktopConfig {
    config_path(app)
        .ok()
        .and_then(|path| std::fs::read_to_string(path).ok())
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

fn save_config(app: &AppHandle, config: &DesktopConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_server_url(app: AppHandle) -> Option<String> {
    load_config(&app).server_url
}

#[tauri::command]
fn set_server_url(app: AppHandle, url: String) -> Result<(), String> {
    let parsed = tauri::Url::parse(url.trim()).map_err(|_| "That is not a valid URL.".to_string())?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("Only http:// and https:// URLs are supported.".to_string()),
    }
    if parsed.host_str().is_none() {
        return Err("The URL needs a host.".to_string());
    }
    let mut normalized = parsed.to_string();
    while normalized.ends_with('/') {
        normalized.pop();
    }
    save_config(&app, &DesktopConfig { server_url: Some(normalized) })
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_vault(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("vault") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "vault", WebviewUrl::App("vault.html".into()))
        .title("Primora — Secrets Vault")
        .inner_size(780.0, 620.0)
        .min_inner_size(560.0, 420.0)
        .center()
        .build();
}

/// The vault lives in the CLI — the desktop proxies the `primora` binary so
/// both surfaces operate on the same vault file, one crypto implementation.
/// Passwords travel via env, secret values via stdin; never via argv.
fn run_cli(args: &[&str], stdin_data: Option<&str>, password: Option<&str>) -> Result<String, String> {
    let bin = std::env::var("PRIMORA_CLI").unwrap_or_else(|_| "primora".into());
    let mut cmd = Command::new(&bin);
    cmd.args(args)
        .stdin(if stdin_data.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(pw) = password {
        cmd.env("PRIMORA_VAULT_PASSWORD", pw);
    }
    let mut child = cmd.spawn().map_err(|_| {
        "primora CLI not found on PATH — install it: npm i -g @primora/cli".to_string()
    })?;
    if let Some(data) = stdin_data {
        child
            .stdin
            .as_mut()
            .ok_or("failed to open child stdin")?
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[tauri::command]
fn vault_probe() -> bool {
    let bin = std::env::var("PRIMORA_CLI").unwrap_or_else(|_| "primora".into());
    Command::new(bin)
        .arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[tauri::command]
fn vault_status() -> Result<Value, String> {
    let out = run_cli(&["vault", "status", "--json"], None, None)?;
    serde_json::from_str(&out).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_secrets() -> Result<Value, String> {
    let out = run_cli(&["secrets", "list", "--json"], None, None)?;
    serde_json::from_str(&out).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_reveal(name: String) -> Result<String, String> {
    run_cli(&["secrets", "get", &name], None, None)
}

#[tauri::command]
fn vault_init(password: String) -> Result<(), String> {
    run_cli(&["vault", "init"], None, Some(&password)).map(|_| ())
}

#[tauri::command]
fn vault_unlock(password: String, ttl: u32) -> Result<(), String> {
    let ttl = ttl.clamp(60, 86400).to_string();
    run_cli(&["vault", "unlock", "--ttl", &ttl], None, Some(&password)).map(|_| ())
}

#[tauri::command]
fn vault_lock() -> Result<(), String> {
    run_cli(&["vault", "lock"], None, None).map(|_| ())
}

#[tauri::command]
fn vault_set(
    name: String,
    value: String,
    url: Option<String>,
    notes: Option<String>,
) -> Result<(), String> {
    let mut args = vec!["secrets", "set", name.as_str()];
    if let Some(u) = url.as_deref().filter(|s| !s.is_empty()) {
        args.extend(["--url", u]);
    }
    if let Some(n) = notes.as_deref().filter(|s| !s.is_empty()) {
        args.extend(["--notes", n]);
    }
    run_cli(&args, Some(&value), None).map(|_| ())
}

#[tauri::command]
fn vault_rm(name: String) -> Result<(), String> {
    run_cli(&["secrets", "rm", &name, "--yes"], None, None).map(|_| ())
}

#[tauri::command]
fn vault_import(path: String, overwrite: bool) -> Result<String, String> {
    let mut args = vec!["secrets", "import", path.as_str()];
    if overwrite {
        args.push("--overwrite");
    }
    run_cli(&args, None, None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .invoke_handler(tauri::generate_handler![
            get_server_url,
            set_server_url,
            vault_probe,
            vault_status,
            vault_secrets,
            vault_reveal,
            vault_init,
            vault_unlock,
            vault_lock,
            vault_set,
            vault_rm,
            vault_import,
        ])
        .setup(|app| {
            let show = MenuItem::with_id(app, "show", "Show Primora", true, None::<&str>)?;
            let vault_item = MenuItem::with_id(app, "vault", "Secrets Vault…", true, None::<&str>)?;
            let change = MenuItem::with_id(app, "change_server", "Change Server…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &vault_item, &change, &quit])?;

            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Primora")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => show_main(app),
                    "vault" => open_vault(app),
                    "change_server" => {
                        // Clearing the URL and restarting lands back on the connect screen.
                        let _ = save_config(app, &DesktopConfig { server_url: None });
                        app.restart();
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            let _tray = tray.build(app)?;

            // The connect screen links here — "open the local Secrets Vault".
            let handle = app.handle().clone();
            app.listen("open-vault", move |_| open_vault(&handle));

            // Close hides to the tray instead of quitting — Quit is on the menu.
            if let Some(window) = app.get_webview_window("main") {
                let handle = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = handle.hide();
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Primora desktop");
}
