# Configuration and Integrations (Current State)

## Environment Variables
- `COZYGEN_AUTH_USER` and `COZYGEN_AUTH_PASS` enable authentication when set. (`auth.py`:32-36, 58-66)
- `COZYGEN_AUTH_SECRET` sets a stable token signing secret; otherwise a random secret is used per process. (`auth.py`:35-38, 68-77)
- `COZYGEN_AUTH_TTL` sets token lifetime in seconds (default 86400). (`auth.py`:36-37, 74-75)
- `.env` is read at startup if present in the extension directory. (`auth.py`:13-32)
- `.env.example` documents the same variables. (`.env.example`:1-11)

## Configuration Files
- `requirements.txt`: runtime Python dependencies. (`requirements.txt`:1-3)
- `requirements-dev.txt`: dev dependencies (empty in this repo). (`requirements-dev.txt`:1)
- `pyproject.toml`: Ruff and Mypy configuration. (`pyproject.toml`:1-16)
- `js/package.json`: frontend scripts and dependencies (React, Vite, Vitest, ESLint). (`js/package.json`:1-23)
- `.pre-commit-config.yaml` and `.gitignore` exist but are not referenced at runtime in code. (`.pre-commit-config.yaml`:1-20; `.gitignore`:1-30)

## External Services and Integrations
- ComfyUI server integration is required; CozyGen registers routes and nodes through `server.PromptServer.instance`. (`__init__.py`:5-39)
- There are no other external network services referenced in the repository. I cannot confirm any external service requirements beyond the ComfyUI runtime. (`__init__.py`:5-39; `api.py`:1-24)
