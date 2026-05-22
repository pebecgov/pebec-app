# SABER Agent Portal — Screenshot Pack

Screenshots for `docs/saber-agent-portal-tutorial.md`.

## Status

| File | Screen | Status |
|------|--------|--------|
| `00-sign-in.png` | Sign-in page | Done |
| `01-dashboard.png` | Dashboard | Needs login |
| `02-dli-list.png` | Saber → DLIs | Needs login |
| `03-dli-workspace.png` | One DLI in progress | Needs login |
| `04-saber-overview.png` | Saber → Overview | Needs login |
| `05-materials.png` | Saber → Materials | Needs login |
| `06-submit-report.png` | Submit Report (tabs visible) | Needs login |
| `07-dmo-report.png` | DMO Report form | Needs login |
| `08-send-letters.png` | Send a Letter/Files list | Needs login |
| `09-send-letter-modal.png` | “Send New Letter” popup | Needs login |
| `10-received-letters.png` | Received Letters inbox | Needs login |
| `11-profile.png` | Profile | Needs login |
| `12-sidebar-menu.png` | Full sidebar (desktop width) | Needs login |

## Why most shots are blocked

`/saber_agent/*` is protected by Clerk middleware. Without a session whose role is **`saber_agent`**, the site redirects to the public homepage — so automated capture cannot see the agent UI.

## How to complete the pack (pick one)

### Option A — You log in, I capture (fastest in Cursor)

1. Open the **Browser** panel in Cursor.
2. Go to `https://www.pebec.gov.ng/sign-in` and sign in with a **SABER agent training account**.
3. Navigate to `https://www.pebec.gov.ng/saber_agent`.
4. Reply in chat: **“logged in, capture screenshots”**.

I will walk each menu item and save the remaining PNGs into this folder.

### Option B — Manual capture (no credentials shared)

Use a **training/test agent account** (not a real state’s production data if avoidable). For each row in the table above:

1. Sign in → open the URL in the tutorial.
2. Resize browser to **1440×900** (desktop) for sidebar shots; use **390×844** for one optional mobile sidebar shot.
3. Hide personal data if needed (blur in an editor).
4. Save PNG here with the exact filename from the table.
5. On modals (send letter, EC popup), capture **after** opening the dialog.

### Option C — Local dev

```bash
yarn dev
```

Sign in at `http://localhost:3000/sign-in` with a local Clerk user that has `publicMetadata.role = saber_agent`, then capture the same URLs under `/saber_agent/...`.

## Naming convention

- Prefix: two-digit order matching tutorial parts.
- Format: PNG, full viewport or full page for long forms.
- Desktop width **≥ 1280px** so the left sidebar is visible.
