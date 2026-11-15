"""CDP screencast walkthrough of the NTX Asia site — desktop or mobile take.

usage: python record3.py desktop|mobile

Targets the localised route (/zh) and covers the current build: favicon-era shell,
in-formation chapter map, both ecosystem pager steps, the community photo strip,
the contact dialog, and a real navigation into the legal page before looping home.
Frames land in <scratch>/vidcap3/<mode>/ with stamps.json beside them.
"""
import asyncio, base64, json, os, shutil, subprocess, sys, time, urllib.request

import websockets

MODE = sys.argv[1] if len(sys.argv) > 1 else "desktop"
URL = "http://localhost:3100/zh"
PORT = 9334
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE = os.path.expanduser("~/.hermes/cache/scratch/vidcap3")
FRAMES = os.path.join(BASE, MODE)
PROFILE = os.path.join(BASE, f"profile-{MODE}")

if MODE == "mobile":
    VW, VH, DSF = 390, 844, 2
    UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
          "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
else:
    VW, VH, DSF = 1440, 900, 1
    UA = None


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
    state = {"seq": 0, "n": 0, "t0": 0.0, "stamps": []}
    pending = {}

    async def send(method, params=None):
        state["seq"] += 1
        mid = state["seq"]
        await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        fut = asyncio.get_event_loop().create_future()
        pending[mid] = fut
        return await fut

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
                   {"width": VW, "height": VH, "deviceScaleFactor": DSF, "mobile": MODE == "mobile"})
        if UA:
            await send("Network.setUserAgentOverride", {"userAgent": UA,
                       "screenOrientation": {"type": "portraitPrimary", "angle": 0}})
        if MODE == "mobile":
            await send("Emulation.setTouchEmulationEnabled", {"enabled": True, "maxTouchPoints": 1})

        async def load(url, gate="#join"):
            """Navigate and gate on a selector — never on a fixed sleep."""
            for attempt in range(2):
                await send("Page.navigate", {"url": url})
                for _ in range(25):
                    await asyncio.sleep(1.0)
                    if await ev(f"!!document.querySelector({json.dumps(gate)})"):
                        return True
                print(f"   gate {gate} missing, reloading", flush=True)
            raise SystemExit(f"selector {gate} never appeared")

        await load(URL)
        await ev("document.documentElement.style.scrollBehavior='smooth';"
                 "try{localStorage.removeItem('ntx-theme')}catch(e){};"
                 "try{document.cookie='ntx-lang=zh; path=/; max-age=60'}catch(e){};1")

        ring = 22 if MODE == "desktop" else 34
        await ev(f"""(() => {{
          if (document.getElementById('__cur')) return 1;
          const d = document.createElement('div');
          d.id = '__cur';
          d.style.cssText = 'position:fixed;left:{VW//2}px;top:{VH//2}px;width:{ring}px;height:{ring}px;'
            + 'border-radius:50%;border:2px solid rgba(34,211,238,.95);'
            + 'background:rgba(34,211,238,{0.2 if MODE=='desktop' else 0.28});'
            + 'box-shadow:0 0 18px rgba(34,211,238,.7);pointer-events:none;z-index:2147483647;'
            + 'transform:translate(-50%,-50%);opacity:0;transition:opacity .25s ease';
          document.body.appendChild(d);
          return 1 }})()""")

        cx, cy = VW // 2, VH // 2

        async def cursor(x, y, dur=0.55):
            nonlocal cx, cy
            await ev(f"""(() => {{ const d=document.getElementById('__cur'); if(!d) return 0;
              d.style.transition='left {dur}s cubic-bezier(.45,0,.2,1), top {dur}s cubic-bezier(.45,0,.2,1), opacity .25s';
              d.style.left='{x}px'; d.style.top='{y}px'; d.style.opacity='1'; return 1 }})()""")
            for i in range(1, 5):
                t = i / 4
                await send("Input.dispatchMouseEvent",
                           {"type": "mouseMoved", "x": cx + (x - cx) * t, "y": cy + (y - cy) * t, "buttons": 0})
                await asyncio.sleep(dur / 4)
            cx, cy = x, y

        async def press(x, y):
            if MODE == "mobile":
                await send("Input.dispatchTouchEvent",
                           {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "radiusX": 12, "radiusY": 12}]})
                await asyncio.sleep(0.07)
                await send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
            else:
                await send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y,
                                                        "button": "left", "clickCount": 1})
                await asyncio.sleep(0.06)
                await send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y,
                                                        "button": "left", "clickCount": 1})
            await ev("(()=>{const d=document.getElementById('__cur');if(!d)return 0;"
                     "d.style.transform='translate(-50%,-50%) scale(1.5)';"
                     "setTimeout(()=>d.style.transform='translate(-50%,-50%) scale(1)',150);return 1})()")

        async def tap(x, y, dur=0.5):
            await cursor(x, y, dur)
            await press(x, y)

        async def centre(sel, idx=0):
            v = await ev(f"(()=>{{const e=document.querySelectorAll({json.dumps(sel)})[{idx}];if(!e)return null;"
                         f"const b=e.getBoundingClientRect();if(!b.width&&!b.height)return null;"
                         f"return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)]}})()")
            return tuple(v) if v else None

        async def click_text(sel, pattern, flags="i"):
            """Click the first element matching sel whose text matches — locale-proof."""
            v = await ev(f"""(()=>{{
              const re = new RegExp({json.dumps(pattern)}, {json.dumps(flags)});
              const els = [...document.querySelectorAll({json.dumps(sel)})]
                .filter(e => e.offsetParent !== null || e.getClientRects().length);
              const el = els.find(e => re.test((e.getAttribute('aria-label')||'') + ' ' + (e.textContent||'')));
              if (!el) return null;
              el.scrollIntoView({{block:'center'}});
              const b = el.getBoundingClientRect();
              return [Math.round(b.x+b.width/2), Math.round(b.y+b.height/2)];
            }})()""")
            if v:
                await asyncio.sleep(0.7)
                v = await ev(f"""(()=>{{
                  const re = new RegExp({json.dumps(pattern)}, {json.dumps(flags)});
                  const els = [...document.querySelectorAll({json.dumps(sel)})]
                    .filter(e => e.offsetParent !== null || e.getClientRects().length);
                  const el = els.find(e => re.test((e.getAttribute('aria-label')||'') + ' ' + (e.textContent||'')));
                  if (!el) return null;
                  const b = el.getBoundingClientRect();
                  return [Math.round(b.x+b.width/2), Math.round(b.y+b.height/2)];
                }})()""")
            return tuple(v) if v else None

        async def tap_until(sel_text, expect, tries=2):
            """Tap a control until the expected substring shows up in location.pathname."""
            for _ in range(tries):
                c = await centre(sel_text)
                if not c:
                    return False
                await tap(*c)
                await asyncio.sleep(2.0)
                if expect in (await ev("location.pathname") or ""):
                    return True
            return False

        async def pager():
            return await ev("(()=>{const t=document.querySelector('#map .overflow-hidden > div');"
                            "if(!t)return null;const m=/translateX\\(-?([0-9.]+)%\\)/.exec(t.style.transform||'');"
                            "return m?Math.round(parseFloat(m[1])/100):0})()")

        await send("Page.startScreencast", {"format": "jpeg", "quality": 88,
                                            "maxWidth": VW * DSF, "maxHeight": VH * DSF,
                                            "everyNthFrame": 1})
        state["t0"] = time.time()
        await asyncio.sleep(1.5)

        async def nav(name):
            c = await centre(f'header a[href="#{name}"]')
            if not c:
                c = await ev(f"""(()=>{{const a=[...document.querySelectorAll('a[href="#{name}"]')]
                    .filter(e=>e.offsetParent!==null)[0]; if(!a) return null;
                    const b=a.getBoundingClientRect();return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)]}})()""")
                c = tuple(c) if c else None
            if c:
                await tap(*c)
            return bool(c)

        if MODE == "desktop":
            print("1 hero", flush=True)
            await cursor(700, 300, 0.6); await asyncio.sleep(1.0)
            p = await centre(".hero-podcast")
            if p:
                await cursor(*p, 0.6)
            await asyncio.sleep(1.5)

            print("2 light mode", flush=True)
            t = await centre(".theme-toggle")
            await tap(*t); await asyncio.sleep(2.4)
            print("   theme:", await ev("document.documentElement.dataset.theme"), flush=True)
            await tap(*t); await asyncio.sleep(1.6)

            print("3 pillars", flush=True)
            await ev("document.querySelector('#pillars').scrollIntoView({block:'center',behavior:'smooth'})")
            await asyncio.sleep(2.3)

            print("4 chapters / map", flush=True)
            await nav("chapters"); await asyncio.sleep(2.6)
            print("   forming:", await ev("[...document.querySelectorAll('.chapter-dot-pulse')].length"), flush=True)
            await asyncio.sleep(1.2)

            print("5 english", flush=True)
            lg = await click_text("header button[aria-label]", "Switch to English")
            if lg:
                await tap(*lg)
            await asyncio.sleep(2.6)
            print("   path:", await ev("location.pathname"), "| lang:", await ev("document.documentElement.lang"), flush=True)

            print("6 ecosystem pager", flush=True)
            await nav("map"); await asyncio.sleep(1.9)
            idx = await ev("(()=>{const b=[...document.querySelectorAll('#map .carousel-arrow')];"
                           "return b.findIndex(x=>/next|下一页|Next/i.test(x.getAttribute('aria-label')||''))})()")
            idx = idx if isinstance(idx, int) and idx >= 0 else 1
            for _ in range(2):
                await ev(f"(()=>{{const e=document.querySelectorAll('#map .carousel-arrow')[{idx}];"
                         f"e.scrollIntoView({{block:'center'}});return 1}})()")
                await asyncio.sleep(0.9)
                a = await ev(f"(()=>{{const e=document.querySelectorAll('#map .carousel-arrow')[{idx}];"
                             f"const b=e.getBoundingClientRect();return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)]}})()")
                before = await pager()
                await tap(*a)
                await asyncio.sleep(1.4)
                print(f"   page {before} -> {await pager()}", flush=True)

            print("7 events", flush=True)
            await nav("events"); await asyncio.sleep(2.4)

            print("8 podcast", flush=True)
            await nav("podcast"); await asyncio.sleep(1.9)
            c = await centre('#podcast a[href="/card"]')
            if c:
                await cursor(*c, 0.5); await asyncio.sleep(1.2)

            print("9 join gallery + contact dialog", flush=True)
            await nav("join"); await asyncio.sleep(2.2)
            dlg = await centre("#join .btn-primary")
            if dlg:
                await tap(*dlg); await asyncio.sleep(2.6)
                print("   dialog open:", await ev("!!document.querySelector('[aria-labelledby=\"contact-title\"]')"), flush=True)
                close = await centre("button.contact-close")
                if close:
                    await tap(*close, 0.4)
                await asyncio.sleep(1.4)

            print("10 legal page", flush=True)
            await ev("document.querySelector('footer').scrollIntoView({block:'end',behavior:'smooth'})")
            await asyncio.sleep(1.4)
            await ev("document.querySelector('footer a[href$=\"/privacy\"]')?.scrollIntoView({block:'center'})")
            await asyncio.sleep(1.2)
            ok = await tap_until('footer a[href$="/privacy"]', "/privacy")
            print("   legal page reached:", ok, "| path:", await ev("location.pathname"), flush=True)
            await ev("window.scrollBy({top:420,behavior:'smooth'})")
            await asyncio.sleep(2.0)
            await ev("history.back()")
            await asyncio.sleep(2.2)

            print("11 back to hero", flush=True)
            await ev("window.scrollTo({top:0,behavior:'smooth'})")
            await asyncio.sleep(2.4)

        else:
            print("1 mobile hero", flush=True)
            await cursor(195, 620, 0.6); await asyncio.sleep(1.8)

            print("2 light mode", flush=True)
            t = await centre(".theme-toggle")
            await tap(*t); await asyncio.sleep(2.3)
            await tap(*t); await asyncio.sleep(1.6)

            print("3 menu drawer", flush=True)
            mb = await centre('header button[aria-label="Menu"]')
            if mb:
                await tap(*mb); await asyncio.sleep(1.7)
            item = await click_text('header a[href="#chapters"]', "Chapters|分会")
            if item:
                await tap(*item, 0.5)
            await asyncio.sleep(2.5)

            print("3b pillars", flush=True)
            await ev("document.querySelector('#pillars').scrollIntoView({block:'center',behavior:'smooth'})")
            await asyncio.sleep(2.1)

            print("4 fields", flush=True)
            await ev("window.scrollBy({top:560,behavior:'smooth'})")
            await asyncio.sleep(1.8)

            print("5 ecosystem pager", flush=True)
            await ev("document.querySelector('#map').scrollIntoView({block:'start',behavior:'smooth'})")
            await asyncio.sleep(1.9)
            idx = await ev("(()=>{const b=[...document.querySelectorAll('#map .carousel-arrow')];"
                           "return b.findIndex(x=>/next|下一页|Next/i.test(x.getAttribute('aria-label')||''))})()")
            idx = idx if isinstance(idx, int) and idx >= 0 else 1
            for _ in range(2):
                await ev(f"(()=>{{const e=document.querySelectorAll('#map .carousel-arrow')[{idx}];"
                         f"e.scrollIntoView({{block:'center'}});return 1}})()")
                await asyncio.sleep(0.9)
                a = await ev(f"(()=>{{const e=document.querySelectorAll('#map .carousel-arrow')[{idx}];"
                             f"const b=e.getBoundingClientRect();return [Math.round(b.x+b.width/2),Math.round(b.y+b.height/2)]}})()")
                before = await pager()
                await tap(*a)
                await asyncio.sleep(1.4)
                print(f"   page {before} -> {await pager()}", flush=True)

            print("6 events", flush=True)
            await ev("document.querySelector('#events').scrollIntoView({block:'start',behavior:'smooth'})")
            await asyncio.sleep(2.2)

            print("7 podcast", flush=True)
            await ev("document.querySelector('#podcast').scrollIntoView({block:'start',behavior:'smooth'})")
            await asyncio.sleep(2.0)
            c = await centre('#podcast a[href="/card"]')
            if c:
                await cursor(*c, 0.5); await asyncio.sleep(1.3)

            print("8 join gallery", flush=True)
            await ev("document.querySelector('#join').scrollIntoView({block:'start',behavior:'smooth'})")
            await asyncio.sleep(2.3)
            dlg = await centre("#join .btn-primary")
            if dlg:
                await tap(*dlg); await asyncio.sleep(2.6)
                print("   dialog open:", await ev("!!document.querySelector('[aria-labelledby=\"contact-title\"]')"), flush=True)
                close = await centre("button.contact-close")
                if close:
                    await tap(*close, 0.4)
                await asyncio.sleep(1.6)

            print("9 legal page", flush=True)
            await ev("document.querySelector('footer').scrollIntoView({block:'end',behavior:'smooth'})")
            await asyncio.sleep(1.4)
            await ev("document.querySelector('footer a[href$=\"/privacy\"]')?.scrollIntoView({block:'center'})")
            await asyncio.sleep(1.2)
            ok = await tap_until('footer a[href$="/privacy"]', "/privacy")
            print("   legal page reached:", ok, "| path:", await ev("location.pathname"), flush=True)
            await ev("window.scrollBy({top:380,behavior:'smooth'})")
            await asyncio.sleep(1.8)
            await ev("history.back()")
            await asyncio.sleep(2.1)

            print("10 back to hero", flush=True)
            await ev("window.scrollTo({top:0,behavior:'smooth'})")
            await asyncio.sleep(2.2)

        await send("Page.stopScreencast")
        await asyncio.sleep(0.3)
        pump_task.cancel()

    chrome.terminate()
    try:
        chrome.wait(timeout=10)
    except Exception:
        chrome.kill()

    json.dump(state["stamps"], open(os.path.join(FRAMES, "stamps.json"), "w"))
    dur = time.time() - state["t0"]
    print(f"done {MODE}: {state['n']} frames in {dur:.1f}s ({state['n']/max(0.01,dur):.1f} fps)")


asyncio.run(main())
