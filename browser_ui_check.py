"""Real Chromium checks. Optional test-only dependency: playwright."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright, expect

def check_paper_theme(page, primary):
    expect(page.locator("body")).to_have_css("background-color", "rgb(243, 239, 228)")
    expect(page.locator("body")).to_have_css("color", "rgb(21, 22, 25)")
    expect(page.locator(primary)).to_have_css("background-color", "rgb(21, 22, 25)")
    expect(page.locator(primary)).to_have_css("color", "rgb(249, 246, 236)")
    # Check palette pairs against WCAG AA normal-text threshold (4.5:1).
    ratios = page.evaluate("""() => {
        const s = getComputedStyle(document.documentElement);
        const rgb = token => s.getPropertyValue(token).trim().match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16)/255);
        const lum = token => rgb(token).map(v => v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4)
            .reduce((a,v,i) => a+v*[0.2126,0.7152,0.0722][i],0);
        return [["--ink","--bg"],["--muted","--bg"],["--muted","--surface"],
                ["--muted","--panel"],["--blue","--bg"],["--blue","--surface"],
                ["--teal","--surface"],["--risk","--panel"],["--risk","--surface"],
                ["--protected","--panel"],["--unknown","--panel"],["--on-solid","--ink"],
                ["--on-solid","--risk"],["--on-solid","--protected"],["--on-solid","--muted"]]
            .map(([a,b]) => [a,b,(Math.max(lum(a),lum(b))+0.05)/(Math.min(lum(a),lum(b))+0.05)]);
    }""")
    assert all(ratio >= 4.5 for _, _, ratio in ratios), ratios


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
                check_paper_theme(page, "#run")
                expect(page.locator(".veritas-brand")).to_have_attribute("href", "https://github.com/veritasfuji-japan/veritas_os")
                expect(page.locator(".veritas-brand img")).to_be_visible()
                page.wait_for_function("document.querySelector('.veritas-brand img').complete && document.querySelector('.veritas-brand img').naturalWidth === 192 && document.querySelector('.veritas-brand img').naturalHeight === 192")
                expect(page.locator('link[rel="icon"]')).to_have_attribute("href", "veritas-mark.png")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
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
                        if bad != good and bad in ("ALLOW", "CONFIRMED"):
                            expect(page.locator("#bad-result")).to_have_css("color", "rgb(161, 38, 55)")
                        if good == "UNKNOWN":
                            expect(page.locator("#good-result")).to_have_css("color", "rgb(85, 89, 96)")
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
                check_paper_theme(page, "#run")
                expect(page.locator(".veritas-brand")).to_have_attribute("href", "https://github.com/veritasfuji-japan/veritas_os")
                expect(page.locator(".veritas-brand img")).to_be_visible()
                page.wait_for_function("document.querySelector('.veritas-brand img').complete && document.querySelector('.veritas-brand img').naturalWidth === 192 && document.querySelector('.veritas-brand img').naturalHeight === 192")
                expect(page.locator('link[rel="icon"]')).to_have_attribute("href", "veritas-mark.png")
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                expect(page.locator("html")).to_have_attribute("lang","ja")
                for n in (2,8,32,64):
                    page.locator("#n").select_option(str(n))
                    page.locator("#run").click()
                    expect(page.locator("#uc")).to_have_text(f"{n} / {n} 許可")
                    expect(page.locator("#sc")).to_have_text(f"1 / {n} 許可")
                    expect(page.locator("#ug .bad")).to_have_count(n)
                    expect(page.locator("#sg .good")).to_have_count(1)
                    expect(page.locator("#sg .denied")).to_have_count(n-1)
                    expect(page.locator("#ug .bad").first).to_have_css("background-color", "rgb(161, 38, 55)")
                    expect(page.locator("#sg .good").first).to_have_css("background-color", "rgb(23, 107, 80)")
                page.locator("#all-labs").click()
                expect(page.locator("html")).to_have_attribute("lang","ja")
                assert not errors, errors
                print(f"Chromium {width}px: PASS")
                page.close()
            browser.close()
    finally:
        server.shutdown()
        thread.join()
