import logging
import os
import sys

import server  # noqa: F401 - imported for side effects
from aiohttp import web  # Import web for static files

from ComfyUI_CozyGen import auth  # Use relative import
from .api import routes as api_routes
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

logger = logging.getLogger(__name__)

# Register nodes with ComfyUI's global registry (defensive in case of late load)
try:
    import nodes as comfy_nodes

    for name, node_cls in NODE_CLASS_MAPPINGS.items():
        if name not in comfy_nodes.NODE_CLASS_MAPPINGS:
            comfy_nodes.NODE_CLASS_MAPPINGS[name] = node_cls
    comfy_nodes.NODE_DISPLAY_NAME_MAPPINGS.update(NODE_DISPLAY_NAME_MAPPINGS)
except Exception as e:
    logger.error(f"Failed to register nodes with ComfyUI: {e}")

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Mount API routes
for route in api_routes:
    server.PromptServer.instance.app.router.add_route(
        route.method,
        route.path,
        route.handler,
        name=f"cozygen_{route.handler.__name__}",
    )

# Attach auth middleware (front of the chain)
server.PromptServer.instance.app.middlewares.insert(0, auth.cozygen_auth_middleware)


# Handler to serve the React app's index.html
async def serve_cozygen_app(request: web.Request) -> web.Response:
    index_path = os.path.join(os.path.dirname(__file__), "js", "dist", "index.html")
    if not os.path.exists(index_path):
        return web.Response(
            text="CozyGen: Build not found. Please run `npm run build` in the `js` directory.",
            status=500,
        )
    return web.FileResponse(index_path)


# Route to serve the main application
server.PromptServer.instance.app.router.add_get("/cozygen", serve_cozygen_app)
server.PromptServer.instance.app.router.add_get("/cozygen/", serve_cozygen_app)


# Serve the new 'dist' directory which contains the built React app
static_dist_path = os.path.join(os.path.dirname(__file__), "js", "dist")
server.PromptServer.instance.app.router.add_static(
    "/cozygen/assets", path=os.path.join(static_dist_path, "assets"), name="cozygen_assets"
)

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

logger.info("✅ CozyGen API routes mounted.")
logger.info("✅ CozyGen web UI served at /cozygen/")
if auth.auth_enabled():
    logger.info("🔒 CozyGen auth enabled (COZYGEN_AUTH_USER/COZYGEN_AUTH_PASS)")
else:
    logger.info("ℹ️ CozyGen auth disabled (set COZYGEN_AUTH_USER/COZYGEN_AUTH_PASS to enable)")

WEB_DIRECTORY = "./js/web"
