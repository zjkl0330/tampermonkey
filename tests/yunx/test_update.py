import asyncio, pathlib
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = """<!doctype html><html><head><meta charset="utf-8"><title>测试分享页</title></head>
<body><div class="file-list"><div class="file-item">测试文件.txt</div></div></body></html>"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        page = await ctx.new_page()
        page.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        logs = []
        page.on('console', lambda m: logs.append(f'{m.type}: {m.text}'[:200]))
        await page.route('https://pan.quark.cn/**', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML))
        await page.add_init_script(script=SCRIPT)
        await page.goto('https://pan.quark.cn/s/test', wait_until='domcontentloaded')
        await page.wait_for_timeout(2500)

        has = await page.evaluate("() => !!document.getElementById('yunx-panlink-host')")
        print('host 挂载:', has)
        # 打开面板
        opened = await page.evaluate("""() => {
          const host = document.getElementById('yunx-panlink-host');
          if (!host || !host.shadowRoot) return 'no-shadow';
          const fab = host.shadowRoot.querySelector('.fab, .yx-fab, [class*=fab]');
          if (fab) { fab.click(); return 'clicked-fab'; }
          return 'no-fab:' + host.shadowRoot.innerHTML.slice(0,120);
        }""")
        print('打开面板:', opened)
        await page.wait_for_timeout(800)
        state = await page.evaluate("""() => {
          const sr = document.getElementById('yunx-panlink-host').shadowRoot;
          const line = sr.getElementById('yx-update-line');
          const btn = sr.getElementById('yx-check-update');
          return {line: line && line.textContent, hasBtn: !!btn};
        }""")
        print('检查前:', state)
        if state['hasBtn']:
            await page.click('#yunx-panlink-host >> text=设置') if False else None
            await page.evaluate("""() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-check-update').click()""")
            last = None
            for i in range(40):
                await page.wait_for_timeout(500)
                txt = await page.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot; const l=sr.getElementById('yx-update-line'); const t=[...sr.querySelectorAll('.toast')].map(x=>x.textContent).filter(x=>/更新|版本/.test(x)).join(' | '); return (l?l.textContent:'')+' ## '+t; }""")
                if txt != last:
                    print(f'{(i+1)*0.5:.1f}s:', txt)
                    last = txt
                if '正在检查' not in txt:
                    break
        print('console:', logs[-6:])
        await b.close()

asyncio.run(main())
