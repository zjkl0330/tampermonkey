import asyncio, json, pathlib, urllib.parse as up
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'><title>百度网盘</title></head><body><div id='app'><div class='file-list'></div></div></body></html>"

def listing(d):
    items = [
        {'fs_id':111,'path':'/相册','server_filename':'相册','isdir':1,'size':0},
        {'fs_id':222,'path':'/电影.mkv','server_filename':'电影.mkv','isdir':0,'size':104857600},
    ] if d == '/' else [
        {'fs_id':333,'path':'/相册/里面.txt','server_filename':'里面.txt','isdir':0,'size':12},
    ]
    return json.dumps({'errno':0,'list':items,'request_id':1})

async def run(kind):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':420,'height':900}, locale='zh-CN')
        pg = await ctx.new_page()
        calls=[]
        async def handler(route, req):
            u=req.url; calls.append(u.split('?')[0] + ('?' + up.urlparse(u).query[:60] if '?' in u else ''))
            if 'method=uinfo' in u:
                if kind == 'badtoken':
                    return await route.fulfill(status=200, content_type='application/json', body='{"errno":31045,"errmsg":"access token invalid"}')
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'errno':0,'baidu_name':'测试号','netdisk_name':'测试号','uk':123}))
            if 'method=list' in u:
                q=up.parse_qs(up.urlparse(u).query)
                return await route.fulfill(status=200, content_type='application/json', body=listing((q.get('dir') or ['/'])[0]))
            if 'method=filemetas' in u:
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'errno':0,'list':[{'fs_id':222,'dlink':'https://d.pcs.baidu.com/file/abc?fid=222'}]}))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://pan.baidu.com/**', handler)
        await pg.add_init_script(script="try{localStorage.setItem('yx:baidu_access_token', JSON.stringify('bd-fake-token-123456'))}catch(e){}")
        await pg.add_init_script(script="window.__copied=[];const oe=document.execCommand&&document.execCommand.bind(document);document.execCommand=(c)=>{if(c==='copy'){const t=document.querySelector('textarea');if(t)window.__copied.push(t.value);}try{return oe?oe(c):false}catch(e){return false}}")
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.baidu.com/disk/main', wait_until='domcontentloaded')
        await pg.wait_for_timeout(4000)
        st = await pg.evaluate("""() => { const h=document.getElementById('yunx-panlink-host'); if(!h||!h.shadowRoot) return {host:false};
          const sr=h.shadowRoot; return {badge:(sr.getElementById('yx-badge')||{}).textContent,title:(sr.getElementById('yx-title')||{}).textContent,
          sub:(sr.getElementById('yx-sub')||{}).textContent,tag:(sr.getElementById('yx-tag')||{}).textContent}; }""")
        print(f'[{kind}]', st)
        if 'title' in st:
            await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
            await pg.wait_for_timeout(700)
            rows = await pg.evaluate("""() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row[data-fid]')].map(x=>x.dataset.fid+'='+x.querySelector('.txt').textContent)""")
            print(f'[{kind}] 条目:', rows)
            if kind == 'ok' and rows:
                await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
                  const r=[...sr.querySelectorAll('.row[data-fid]')].find(x=>x.dataset.fid==='/相册'); if(r) r.querySelector('.nm').click(); }""")
                await pg.wait_for_timeout(1200)
                print(f'[{kind}] 进目录:', await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
                  return {crumb:(sr.getElementById('yx-crumb')||{}).textContent, rows:[...sr.querySelectorAll('.row[data-fid]')].map(x=>x.dataset.fid)}; }"""))
                # 取链：真实鼠标点复选框
                xy = await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
                  const c=sr.querySelector('.row[data-fid="333"] label.cb'); if(!c) return null; const r=c.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; }""")
                if xy:
                    await pg.mouse.click(xy[0], xy[1]); await pg.wait_for_timeout(300)
                    await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-copy-sel').click()")
                    await pg.wait_for_timeout(2200)
                    print(f'[{kind}] 复制:', await pg.evaluate("() => window.__copied"))
            else:
                print(f'[{kind}] 面板文字:', await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
                  const e=sr.querySelector('.err')||sr.querySelector('.empty'); return e?e.textContent.trim().slice(0,100):''; }"""))
        print(f'[{kind}] 请求:', calls)
        await b.close()

asyncio.run(run('ok'))
asyncio.run(run('badtoken'))
