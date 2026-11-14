import asyncio, json, pathlib
from playwright.async_api import async_playwright
SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'></head><body><div class='file-list'></div></body></html>"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':420,'height':900}); pg=await ctx.new_page()
        await pg.route('https://pan.baidu.com/**', lambda r: r.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML))
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.baidu.com/disk/main', wait_until='domcontentloaded')
        await pg.wait_for_timeout(3500)
        print('标签:', await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          return {tag:(sr.getElementById('yx-tag')||{}).textContent, sub:(sr.getElementById('yx-sub')||{}).textContent}; }"""))
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(600)
        print('面板:', await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          return {err:(sr.querySelector('.err')||{}).textContent, authBtn: !!sr.getElementById('yx-auth'),
                  relogin: !!sr.getElementById('yx-relogin')}; }"""))
        await b.close()
asyncio.run(main())
