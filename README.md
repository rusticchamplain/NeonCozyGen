# CozyGen · Mobile-Friendly ComfyUI Controller

CozyGen gives you a sleek, mobile-ready web UI and custom nodes to drive ComfyUI from any browser. It builds forms from your workflows, queues jobs, streams previews, and browses results—no desktop UI required.

---

## 🌟 What you get
- 📱 Mobile-first React UI (Vite + Tailwind), touch-friendly.
- 🧩 Dynamic forms from `CozyGenDynamicInput` (text/number/boolean/dropdown).
- 🎞️ Image + video outputs (GIF/MP4/WebM) via CozyGen outputs.
- 📸 Live previews & gallery (zoom/pan, pagination).
- 🧙 Aliases to reuse prompt fragments with `$alias$` tokens.
- 🎲 Randomize controls for seeds/numerics.

---

## 🧰 Initial setup (simple)
1) Copy the example settings:
```bash
cp .env.example .env
```
2) Pick a username/password:
- Edit `.env`; set `COZYGEN_AUTH_USER` and `COZYGEN_AUTH_PASS` (use a unique password).
- Optional: set `COZYGEN_AUTH_SECRET` to a long random string so logins survive restarts.
3) Install and build:
```bash
cd js
npm install
npm run build
cd ..
pip install -r requirements.txt
```
4) Restart ComfyUI so it reads `.env`.
5) Open `http://<your-host>:8188/cozygen` and sign in.
6) If you see a “default credentials” warning, change the password in `.env` and restart ComfyUI.

---

## 🔒 Authentication & credential safety
- Required: `COZYGEN_AUTH_USER` / `COZYGEN_AUTH_PASS`.
- Recommended: set `COZYGEN_AUTH_SECRET` so tokens are signed and persist across restarts:
```bash
openssl rand -base64 32
```
- Token TTL: `COZYGEN_AUTH_TTL` (seconds, default 86400).
- Protect your env file (Linux):
```bash
chmod 600 .env
```
- Don’t log env vars; keep service EnvironmentFiles private.
- If exposing beyond localhost, use HTTPS/reverse proxy and firewall port 8188.

---

## 🚀 Quick start (after setup)
```bash
cd /path/to/ComfyUI/custom_nodes/ComfyUI_CozyGen
pip install -r requirements.txt
cd js && npm install && npm run build && cd ..
# start ComfyUI with your env loaded, then open:
# http://<host>:8188/cozygen
```

---

## 🧩 How it works
- Add `CozyGenDynamicInput` to expose parameters (STRING/INT/FLOAT/BOOLEAN/DROPDOWN); use `priority` to order fields.
- Add `CozyGenImageInput` for uploads/selection.
- Use `CozyGenOutput` (images) or `CozyGenVideoOutput` (GIF/MP4/WebM) to emit results and UI events.
- Export workflows (API export) into `workflows/` so the UI can list them.

---

## 🖥️ Usage flow
1) Pick a workflow.
2) Fill generated fields; randomize where available.
3) Upload/select required images for `CozyGenImageInput`.
4) Click **Generate**; watch status/progress and preview.
5) Browse results in Gallery (zoom/pan, paginate).

Tips:
- For dropdowns, set `choice_type` to the models subfolder (e.g., `loras`) to auto-populate.
- Keep the tab active for instant previews; results still land in Gallery regardless.

---

## 🧭 Node reference
- **CozyGenDynamicInput**: typed params with optional randomize; ordered by `priority`.
- **CozyGenImageInput**: uploads/paths -> `IMAGE`/`MASK`.
- **CozyGenOutput**: saves images and notifies UI.
- **CozyGenVideoOutput**: saves GIF/MP4/WebM; notifies UI.
- **Static inputs**: CozyGen Int/Float/String/Choice for persisted defaults.

---

## 🛠️ Development & linting
Python:
```bash
pip install -r requirements.txt -r requirements-dev.txt
python -m ruff check .
python -m mypy .
```
Frontend:
```bash
cd js
npm install
npm run lint
```
Pre-commit (optional):
```bash
pip install pre-commit
PRE_COMMIT_HOME=./.pre-commit-cache pre-commit install
PRE_COMMIT_HOME=./.pre-commit-cache pre-commit run --all-files
```

---

## ❓ FAQ
- **No build found?** Run `npm run build` in `js/`.
- **Dropdown empty?** Set `choice_type` to the correct models subfolder (e.g., `loras`).
- **Previews missing when tab inactive?** Results still save; check Gallery.
- **Network use?** UI calls ComfyUI HTTP/WebSocket at `/cozygen`.

---

## 📄 License
GPL-3.0. See [LICENSE](LICENSE).
