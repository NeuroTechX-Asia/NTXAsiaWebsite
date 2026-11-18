"""CDP screencast: a ~60 s tour of every surface that carries the background animation.

usage: python scripts/record_backgrounds.py

Four scenes, camera mostly still so the activity wave is the motion:
  hero      /zh          full-bleed connectome, density 1
  events    /zh#events   the claim card band, density 0.85
  podcast   /zh#podcast  the podcast band, density 0.75
  card      /card        the standalone intro card, density prop

Frames land in <scratch>/vidcap-bg/desktop/ with stamps.json; the encoder at the
bottom writes ~/Downloads/neurotechx-asia-backgrounds-<STAMP>.mp4 from the real
frame timestamps.
"""
import asyncio
import base64
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

import websockets

URL = "http://localhost:3100"
PORT = 9335
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = os.path.expanduser("~/.hermes/cache/scratch/vidcap-bg")
FRAMES = os.path.join(BASE, "desktop")
PROFILE = os.path.join(BASE, "profile")
VW, VH, DSF = 1440, 900, 1

# scene list: (label, url, selector to gate on, seconds to hold, scroll target or None)
SCENES = [
    ("hero", URL + "/zh", "canvas", 13.0, None),
    ("events", URL + "/zh#events", "#events", 10.0, "#events"),
    ("podcast", URL + "/zh#podcast", "#podcast", 10.0, "#podcast"),
    ("card", URL + "/card", "canvas", 12.0, None),
]


def target_ws():
    for _ in range(60):
        try:
            data = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list"))
            for t in data:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    return t["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.5)
    raise SystemExit("no CDP target")


async def main():
    shutil.rmtree(FRAMES, ignore_errors=True)
    os.makedirs(FRAMES, exist_ok=True)
    shutil.rmtree(PROFILE, ignore_errors=True)

    chrome = subprocess.Popen(
        [CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
         f"--window-size={VW},{VH}", f"--user-data-dir={PROFILE}",
         "--hide-scrollbars", f"--force-device-scale-factor={DSF}",
         "--no-first-run", "--no-default-browser-check", "--disable-extensions",
         "--force-color-profile=srgb", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    ws_url = target_ws()
    state = {"seq": 0, "n": 0, "stamps": []}
    pending = {}

    async def send(method, params=None):
        state["seq"] += 1
        mid = state["seq"]
        await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        fut = asyncio.get_event_loop().create_future()
        pending[mid] = fut
        return await fut

    try:
        async with websockets.connect(ws_url, max_size=64 * 1024 * 1024) as ws:

            async def pump():
                async for raw in ws:
                    msg = json.loads(raw)
                    mid = msg.get("id")
                    if mid and mid in pending:
                        pending.pop(mid).set_result(msg.get("result", {}))
                        continue
                    if msg.get("method") == "Page.screencastFrame":
                        p = msg["params"]
                        state["n"] += 1
                        state["stamps"].append(time.time())
                        with open(os.path.join(FRAMES, f"f{state['n']:05d}.jpg"), "wb") as fh:
                            fh.write(base64.b64decode(p["data"]))
                        await ws.send(json.dumps({"id": 900000 + state["n"],
                                                  "method": "Page.screencastFrameAck",
                                                  "params": {"sessionId": p["sessionId"]}}))

            pump_task = asyncio.create_task(pump())

            async def ev(expr):
                r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True})
                return r.get("result", {}).get("value")

            await send("Page.enable")
            await send("Runtime.enable")
            await send("Emulation.setDeviceMetricsOverride",
                       {"width": VW, "height": VH, "deviceScaleFactor": DSF, "mobile": False})

            async def load(url, gate):
                """Gate on a selector, never on a sleep — and prove the canvas is running."""
                for _ in range(2):
                    await send("Page.navigate", {"url": url})
                    for _ in range(25):
                        await asyncio.sleep(1.0)
                        if await ev(f"!!document.querySelector({json.dumps(gate)})"):
                            # the connectome paints on the next animation frame
                            await asyncio.sleep(1.2)
                            return True
                    print(f"   gate {gate} missing, reloading", flush=True)
                raise SystemExit(f"selector {gate} never appeared")

            await send("Page.startScreencast", {"format": "jpeg", "quality": 88,
                                                "maxWidth": VW * DSF, "maxHeight": VH * DSF,
                                                "everyNthFrame": 1})
            await asyncio.sleep(1.0)

            for label, url, gate, hold, scroll in SCENES:
                await load(url, gate)
                await ev("document.documentElement.style.scrollBehavior='smooth';1")
                if scroll:
                    # let the smooth scroll settle before the hold, or the camera
                    # watches a blur instead of the background
                    await ev(f"(()=>{{const e=document.querySelector({json.dumps(scroll)});"
                             f"if(e) e.scrollIntoView({{block:'center',behavior:'smooth'}});return 1}})()")
                    await asyncio.sleep(2.2)
                info = await ev("""(() => {
                  const list = [...document.querySelectorAll('canvas')].filter(c => c.width > 200);
                  const c = list[0];
                  const r = c ? c.getBoundingClientRect() : null;
                  return { canvases: list.length,
                           css: r ? [Math.round(r.width), Math.round(r.height)] : null,
                           fps: window.__ntxConnectomeFps ?? null,
                           err: window.__ntxConnectomeError ?? null,
                           path: location.pathname + location.hash };
                })()""")
                print(f"[{label}] {json.dumps(info)}", flush=True)
                if not info.get("canvases"):
                    print(f"   !! no running canvas on {url}", flush=True)
                t_end = time.time() + hold
                while time.time() < t_end:
                    await asyncio.sleep(0.5)

            print(f"frames: {state['n']}", flush=True)
            await send("Page.stopScreencast")
            pump_task.cancel()
    finally:
        chrome.terminate()

    stamps = state["stamps"]
    with open(os.path.join(FRAMES, "stamps.json"), "w") as fh:
        json.dump(stamps, fh)
    span = stamps[-1] - stamps[0] if stamps else 0
    print(f"captured {len(stamps)} frames over {span:.1f}s", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
