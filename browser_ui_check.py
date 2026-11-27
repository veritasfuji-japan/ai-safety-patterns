"""Real Chromium checks. Optional test-only dependency: playwright."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parent / "demo"
with ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(root))) as server:
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for width in (390, 1280):
                page = browser.new_page(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                errors = []
                page.on("pageerror", lambda err: errors.append(str(err)))
                page.goto(url)
                expect(page.locator(".tile")).to_have_count(5)
                for slug, cases in (
                    ("bound-authority", [("ALLOW","ALLOW")] + [("ALLOW","DENY")]*4),
                    ("revocation-race", [("ALLOW","DENY"),("ALLOW","ALLOW")]),
                    ("human-approval", [("ALLOW","DENY"),("ALLOW","ALLOW"),("DENY","DENY"),("ALLOW","ALLOW")]),
                    ("outcome-evidence", [("CONFIRMED","UNKNOWN"),("CONFIRMED","CONFIRMED"),("CONFIRMED","UNKNOWN"),("UNKNOWN","UNKNOWN"),("UNKNOWN","CONFIRMED")]),
                ):
                    page.locator(f'a[href="#{slug}"]').click()
                    expect(page.locator("#lab")).to_be_visible()
                    for i, (bad, good) in enumerate(cases):
                        page.locator("#choice").select_option(str(i))
                        page.locator("#run").click()
                        expect(page.locator("#bad-result")).to_have_text(bad)
                        expect(page.locator("#good-result")).to_have_text(good)
                        if slug == "bound-authority":
                            expect(page.locator(".diff-table .changed")).to_have_count(int(i != 0))
                        if bad == good:
                            assert "risk" not in page.locator("#bad-result").get_attribute("class")
                    page.locator("#reset").click()
                    expect(page.locator("#bad-result")).to_have_text("—")
                page.goto(url + "?lang=ja#bound-authority")
                expect(page.locator("#lab-title")).to_have_text("実行対象の紐付け")
                page.locator("#choice").select_option("2")
                page.locator("#run").click()
                expect(page.locator("#good-result")).to_have_text("拒否")
                page.locator("#lang").click()
                expect(page.locator("#good-result")).to_have_text("DENY")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                page.goto(url + "?lang=ja")
                page.locator('a[href="single-use.html?lang=ja"]').click()
                expect(page.locator("html")).to_have_attribute("lang","ja")
                for n in (2,8,32,64):
                    page.locator("#n").select_option(str(n))
                    page.locator("#run").click()
                    expect(page.locator("#uc")).to_have_text(f"{n} / {n} 許可")
                    expect(page.locator("#sc")).to_have_text(f"1 / {n} 許可")
                page.locator("#all-labs").click()
                expect(page.locator("html")).to_have_attribute("lang","ja")
                assert not errors, errors
                print(f"Chromium {width}px: PASS")
                page.close()
            browser.close()
    finally:
        server.shutdown()
        thread.join()
