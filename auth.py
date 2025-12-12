import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from typing import Optional, Tuple

from aiohttp import web


def _load_env_file():
    """Load a local .env next to this file if present (and not already set)."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    try:
        for line in env_path.read_text().splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, val = stripped.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except Exception:
        # Silently skip malformed .env; intentional to avoid breaking startup
        return

_load_env_file()
AUTH_USER = os.getenv("COZYGEN_AUTH_USER", "")
AUTH_PASS = os.getenv("COZYGEN_AUTH_PASS", "")
AUTH_SECRET = os.getenv("COZYGEN_AUTH_SECRET", "")
AUTH_TTL_SECONDS = int(os.getenv("COZYGEN_AUTH_TTL", "86400"))
DEFAULT_PLACEHOLDER = "change-me"
_SECRET = AUTH_SECRET.encode() if AUTH_SECRET else os.urandom(32)

PROTECTED_PREFIXES = (
    "/cozygen/api",
    "/cozygen/workflows",
    "/cozygen/get_choices",
    "/cozygen/upload_image",
    "/cozygen/input",
    "/prompt",
)
UNPROTECTED_PATHS = {
    "/cozygen/api/login",
    "/cozygen/api/auth_status",
    "/cozygen/api/logout",
    "/cozygen/assets",
    "/cozygen",
    "/cozygen/",
}


def auth_enabled() -> bool:
    return bool(AUTH_USER or AUTH_PASS)


def default_credentials_in_use() -> bool:
    if not auth_enabled():
        return False
    return AUTH_USER == DEFAULT_PLACEHOLDER or AUTH_PASS == DEFAULT_PLACEHOLDER


def _get_secret() -> bytes:
    # If not provided, use a process-local secret (tokens reset on restart).
    return _SECRET


def sign_token(username: str, ttl: Optional[int] = None) -> str:
    exp = int(time.time()) + int(ttl or AUTH_TTL_SECONDS)
    payload = json.dumps({"u": username, "exp": exp}, separators=(",", ":")).encode()
    sig = hmac.new(_get_secret(), payload, hashlib.sha256).digest()
    return f"{base64.urlsafe_b64encode(payload).decode()}.{base64.urlsafe_b64encode(sig).decode()}"


def verify_token(token: str) -> Optional[Tuple[str, int]]:
    if not token:
        return None
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload = base64.urlsafe_b64decode(payload_b64.encode())
        sig = base64.urlsafe_b64decode(sig_b64.encode())
        expected = hmac.new(_get_secret(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(payload.decode())
        username = data.get("u")
        exp = int(data.get("exp", 0))
        if not username or exp < int(time.time()):
            return None
        return username, exp
    except Exception:
        return None


def extract_token(request: web.Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    cookie = request.cookies.get("cozygen_token", "")
    return cookie or ""


@web.middleware
async def cozygen_auth_middleware(request: web.Request, handler):
    if not auth_enabled():
        return await handler(request)

    path = request.path or ""
    # Allow list: login, auth status, static assets (to load the UI bundle)
    for allowed in UNPROTECTED_PATHS:
        if path == allowed or path.startswith(f"{allowed}/"):
            return await handler(request)

    if not any(path.startswith(p) for p in PROTECTED_PREFIXES):
        return await handler(request)

    token = extract_token(request)
    verified = verify_token(token)
    if verified:
        return await handler(request)

    return web.json_response({"error": "unauthorized"}, status=401)
