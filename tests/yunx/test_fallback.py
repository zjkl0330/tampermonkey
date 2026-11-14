import asyncio, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div></body></html>"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        page.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        errs = []
        page.on('requestfailed', lambda r: errs.append(f'{r.url[:60]} :: {r.failure}'))
        await page.route('https://pan.quark.cn/**', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML))
        # 掐掉 raw，模拟国内直连不通
        await page.route('https://raw.githubusercontent.com/**', lambda r: r.abort('timedout'))
        await page.add_init_script(script=SCRIPT)
        await page.goto('https://pan.quark.cn/s/test', wait_until='domcontentloaded')
        await page.wait_for_timeout(3000)
        await page.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()""")
        await page.wait_for_timeout(600)
        await page.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-check-update').click()""")
        last = None
        for i in range(50):
            await page.wait_for_timeout(400)
            txt = await page.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; const l=sr.getElementById('yx-update-line'); const t=[...sr.querySelectorAll('.toast')].map(x=>x.textContent).filter(x=>/更新|版本/.test(x)).join(' | '); return (l?l.textContent:'')+' ## '+t; }""")
            if txt != last:
                print(f'{(i+1)*0.4:.1f}s:', txt); last = txt
            if '正在检查' not in txt:
                break
        print('被拦请求:', errs[:3])
        await b.close()

asyncio.run(main())
