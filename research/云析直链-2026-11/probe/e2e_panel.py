import asyncio, json
from playwright.async_api import async_playwright
SCRIPT = open('../../../js/云析直链.user.js', encoding='utf-8').read()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        ctx = await b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', viewport={'width':1280,'height':900})
        pg = await ctx.new_page()
        errs=[]
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)[:400]))
        pg.on('console', lambda m: errs.append('ERR '+m.text[:300]) if m.type=='error' else None)
        await pg.goto('https://pan.xunlei.com/s/VOn6f4FsZ0dz6iys2DgrGAZnA1?pwd=jzv5', wait_until='domcontentloaded', timeout=40000)
        await pg.wait_for_timeout(1500)
        await pg.add_script_tag(content=SCRIPT)
        await pg.wait_for_timeout(5000)
        r = await pg.evaluate("""()=>{
          const h=document.querySelector('#yunx-panlink-host');
          if(!h) return 'no host';
          const sr=h.shadowRoot;
          const fab=sr.querySelector('#yx-fab'), panel=sr.querySelector('#yx-panel');
          const st=sr.querySelector('#yx-status'), sub=sr.querySelector('#yx-sub');
          const list=sr.querySelector('#yx-list');
          return {fab: fab? getComputedStyle(fab).display:'-', panelClass: panel?panel.className:'-',
                  status: st?st.textContent:'-', sub: sub?sub.textContent:'-',
                  listText: list? list.innerText.slice(0,200):'-'};
        }""")
        print('STATE:', json.dumps(r, ensure_ascii=False)[:800])
        # 点 fab
        await pg.evaluate("()=>document.querySelector('#yunx-panlink-host').shadowRoot.querySelector('#yx-fab').click()")
        await pg.wait_for_timeout(2500)
        r2 = await pg.evaluate("""()=>{const sr=document.querySelector('#yunx-panlink-host').shadowRoot;
          return {panelClass:sr.querySelector('#yx-panel').className,
                  status:sr.querySelector('#yx-status').textContent,
                  listText:sr.querySelector('#yx-list').innerText.slice(0,300)}}""")
        print('AFTER:', json.dumps(r2, ensure_ascii=False)[:700])
        await pg.screenshot(path='./e2e_panel.png')
        print('ERR', errs[:3])
        await b.close()
asyncio.run(main())
