const tauri = window.__TAURI__;
const view = document.getElementById("view");
const pill = document.getElementById("pill");
const lockBtn = document.getElementById("lock-btn");
const pathEl = document.getElementById("path");

let countdownTimer = null;

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
};

const errBox = (msg) => el("p", { class: "err" }, msg);
const dimNote = (msg) => el("p", { class: "hint" }, msg);

function setPill(state, expiresAt) {
  clearInterval(countdownTimer);
  pill.className = "pill";
  lockBtn.hidden = true;
  if (state === "unlocked" && expiresAt) {
    const tick = () => {
      const left = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
      const m = Math.floor(left / 60);
      const s = left % 60;
      pill.textContent = `● unlocked — ${m}m ${String(s).padStart(2, "0")}s`;
      if (!left) refresh();
    };
    pill.classList.add("ok");
    tick();
    countdownTimer = setInterval(tick, 1000);
    lockBtn.hidden = false;
  } else {
    pill.textContent = state === "none" ? "no vault" : "● locked";
    if (state !== "none") pill.classList.add("warn");
  }
}

function card(title, sub, ...children) {
  return el("section", { class: "vcard" },
    el("h2", {}, title),
    sub ? el("p", { class: "sub" }, sub) : "",
    ...children);
}

function busy(btn, label) {
  btn.disabled = true;
  btn.dataset.label = btn.textContent;
  btn.textContent = label;
}
const unbusy = (btn) => {
  btn.disabled = false;
  btn.textContent = btn.dataset.label || btn.textContent;
};

/* ---------- views ---------- */

function renderMissing() {
  setPill("none");
  pathEl.textContent = "";
  view.replaceChildren(card(
    "CLI required",
    "The vault lives in the primora CLI — the desktop app drives the same vault file, so terminal and desktop always agree.",
    el("pre", { class: "codeblock" }, "npm i -g @primora/cli\nprimora vault init"),
    dimNote("Reopen this window after installing.")
  ));
}

function renderInit() {
  setPill("none");
  const pw = el("input", { type: "password", placeholder: "Vault password", autocomplete: "new-password" });
  const pw2 = el("input", { type: "password", placeholder: "Confirm password", autocomplete: "new-password" });
  const err = el("p", { class: "err", hidden: true });
  const btn = el("button", {
    onclick: async () => {
      err.hidden = true;
      if (pw.value.length < 8) { err.textContent = "Use at least 8 characters."; err.hidden = false; return; }
      if (pw.value !== pw2.value) { err.textContent = "Passwords do not match."; err.hidden = false; return; }
      busy(btn, "Creating…");
      try { await tauri.core.invoke("vault_init", { password: pw.value }); }
      catch (e) { err.textContent = String(e); err.hidden = false; unbusy(btn); return; }
      refresh();
    },
  }, "Create vault");
  view.replaceChildren(card(
    "Create your vault",
    "Local, encrypted, Argon2id + XChaCha20-Poly1305. The password is not recoverable — lose it and the contents are gone.",
    pw, pw2, btn, err
  ));
}

function renderLocked() {
  setPill("locked");
  const pw = el("input", { type: "password", placeholder: "Vault password", autocomplete: "current-password", autofocus: true });
  const ttl = el("select", {},
    el("option", { value: "900" }, "Unlock for 15 minutes"),
    el("option", { value: "3600" }, "Unlock for 1 hour"),
    el("option", { value: "28800" }, "Unlock for 8 hours"),
    el("option", { value: "86400" }, "Unlock for 24 hours"));
  const err = el("p", { class: "err", hidden: true });
  const btn = el("button", {
    onclick: async () => {
      err.hidden = true;
      busy(btn, "Unlocking…");
      try { await tauri.core.invoke("vault_unlock", { password: pw.value, ttl: Number(ttl.value) }); }
      catch (e) { err.textContent = String(e); err.hidden = false; unbusy(btn); return; }
      refresh();
    },
  }, "Unlock");
  pw.addEventListener("keydown", (e) => { if (e.key === "Enter") btn.click(); });
  view.replaceChildren(card(
    "Vault is locked",
    "Unlocks a timed session — agents and scripts can use secrets without the password until it expires.",
    pw, ttl, btn, err
  ));
}

function secretRow(s) {
  const copy = el("button", { class: "ghost sm", title: "Copy value" }, "copy");
  copy.addEventListener("click", async () => {
    try {
      const value = await tauri.core.invoke("vault_reveal", { name: s.name });
      await navigator.clipboard.writeText(value.trimEnd());
      copy.textContent = "copied";
      setTimeout(() => (copy.textContent = "copy"), 1200);
    } catch (e) { copy.textContent = "error"; setTimeout(() => (copy.textContent = "copy"), 1500); }
  });
  const del = el("button", { class: "ghost sm danger", title: "Delete" }, "delete");
  del.addEventListener("click", async () => {
    if (del.dataset.armed) {
      try { await tauri.core.invoke("vault_rm", { name: s.name }); } catch {}
      refresh();
      return;
    }
    del.dataset.armed = "1";
    del.textContent = "sure?";
    setTimeout(() => { delete del.dataset.armed; del.textContent = "delete"; }, 2500);
  });
  return el("tr", {},
    el("td", { class: "mono" }, s.name),
    el("td", {}, s.url ? el("span", {
      class: "vlink",
      title: `${s.url} — click to copy`,
      onclick: async () => { await navigator.clipboard.writeText(s.url).catch(() => {}); },
    }, s.url.replace(/^https?:\/\//, "").slice(0, 34)) : "—"),
    el("td", { class: "dimcell", title: s.notes ?? "" }, (s.notes ?? "—").slice(0, 34)),
    el("td", { class: "dimcell" }, (s.updated_at ?? "").slice(0, 10)),
    el("td", { class: "acts" }, copy, del));
}

async function renderUnlocked(st) {
  setPill("unlocked", st.expires_at);
  const secrets = await tauri.core.invoke("vault_secrets").catch(() => []);

  const table = secrets.length
    ? el("table", { class: "vtable" },
        el("thead", {}, el("tr", {},
          el("th", {}, "name"), el("th", {}, "url"), el("th", {}, "notes"),
          el("th", {}, "updated"), el("th", {}, ""))),
        el("tbody", {}, ...secrets.map(secretRow)))
    : dimNote("Empty — add a secret below or import a .env file.");

  // inline add form
  const name = el("input", { placeholder: "NAME", class: "mono", spellcheck: "false" });
  const value = el("input", { type: "password", placeholder: "value", autocomplete: "off" });
  const url = el("input", { placeholder: "url (optional)", inputmode: "url" });
  const notes = el("input", { placeholder: "notes (optional)" });
  const err = el("p", { class: "err", hidden: true });
  const addBtn = el("button", {
    onclick: async () => {
      err.hidden = true;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name.value)) {
        err.textContent = "Name must be env-safe: [A-Za-z_][A-Za-z0-9_]*";
        err.hidden = false; return;
      }
      if (!value.value) { err.textContent = "Value required."; err.hidden = false; return; }
      busy(addBtn, "Encrypting…");
      try {
        await tauri.core.invoke("vault_set", {
          name: name.value, value: value.value, url: url.value || null, notes: notes.value || null,
        });
      } catch (e) { err.textContent = String(e); err.hidden = false; unbusy(addBtn); return; }
      refresh();
    },
  }, "Add secret");

  const importPath = el("input", { placeholder: "/path/to/.env", class: "mono grow" });
  const importBtn = el("button", {
    class: "ghost",
    onclick: async () => {
      err.hidden = true;
      if (!importPath.value.trim()) return;
      busy(importBtn, "Importing…");
      try { await tauri.core.invoke("vault_import", { path: importPath.value.trim(), overwrite: false }); }
      catch (e) { err.textContent = String(e); err.hidden = false; unbusy(importBtn); return; }
      refresh();
    },
  }, "Import .env");

  view.replaceChildren(
    el("section", { class: "vcard" },
      el("h2", {}, `${secrets.length} secret${secrets.length === 1 ? "" : "s"}`),
      table,
      el("div", { class: "vform" }, name, value, url, notes, addBtn),
      el("div", { class: "vform" }, importPath, importBtn),
      err),
    el("p", { class: "hint" },
      "Values are never shown here — copy goes straight to the clipboard. " +
      "Injection and the credential broker stay in the CLI: primora inject / primora agent.")
  );
}

/* ---------- boot ---------- */

async function refresh() {
  if (!tauri) {
    view.replaceChildren(errBox("This page is meant to run inside the Primora desktop app."));
    return;
  }
  const ok = await tauri.core.invoke("vault_probe").catch(() => false);
  if (!ok) return renderMissing();
  const st = await tauri.core.invoke("vault_status").catch((e) => ({ error: String(e) }));
  if (st.error) { view.replaceChildren(errBox(st.error)); return; }
  pathEl.textContent = st.path ?? "";
  if (!st.exists) return renderInit();
  if (!st.unlocked) return renderLocked();
  renderUnlocked(st);
}

lockBtn.addEventListener("click", async () => {
  await tauri.core.invoke("vault_lock").catch(() => {});
  refresh();
});

// Keep the pill/table honest if the session expires while the window sits open.
setInterval(async () => {
  const st = await tauri?.core.invoke("vault_status").catch(() => null);
  if (st && !st.unlocked && !lockBtn.hidden) refresh();
}, 30000);

refresh();
