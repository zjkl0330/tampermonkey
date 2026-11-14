import asyncio, json, pathlib, urllib.parse as up
from playwright.async_api import async_playwright

SCRIPT = (pathlib.Path(__file__).resolve().parents[2] / 'js' / '云析直链.user.js').read_text(encoding='utf-8')
HTML = "<!doctype html><html><head><meta charset='utf-8'><title>迅雷云盘</title></head><body><div id='app'><div class='file-list'></div></div></body></html>"
TOK = 'xl-fake-access-token-1234567890abcdef'

def cors():
    return {'access-control-allow-origin':'https://pan.xunlei.com','access-control-allow-credentials':'true',
            'access-control-allow-headers':'content-type,authorization,x-captcha-token,x-device-id,x-client-id',
            'access-control-allow-methods':'GET,POST,OPTIONS','content-type':'application/json'}

def files_body(parent):
    if parent == '':
        items=[{'id':'111','name':'相册','kind':'drive#folder','size':'0'},
               {'id':'222','name':'电影.mkv','kind':'drive#file','size':'104857600'}]
    else:
        items=[{'id':'333','name':'里面.txt','kind':'drive#file','size':'12'}]
    return json.dumps({'files':items,'next_page_token':''})

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':420,'height':900}, locale='zh-CN')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: print('  [pageerror]', str(e)[:160]))
        calls=[]
        async def handler(route, req):
            u=req.url; calls.append(req.method+' '+u.split('?')[0])
            if req.method=='OPTIONS': return await route.fulfill(status=204, headers=cors())
            if 'captcha/init' in u:
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'captcha_token':'ck.test','expires_in':300}))
            if '/drive/v1/files/' in u:
                fid=u.split('/drive/v1/files/')[1].split('?')[0]
                return await route.fulfill(status=200, headers=cors(), body=json.dumps({'id':fid,'name':'电影.mkv','size':'104857600','web_content_link':'https://dl.xunlei.example/f/222?sig=abc'}))
            if '/drive/v1/files' in u:
                q=up.parse_qs(up.urlparse(u).query)
                return await route.fulfill(status=200, headers=cors(), body=files_body((q.get('parent_id') or [''])[0]))
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
        await pg.route('https://pan.xunlei.com/**', handler)
        await pg.route('https://api-pan.xunlei.com/**', handler)
        await pg.route('https://xluser-ssl.xunlei.com/**', handler)
        await pg.route('https://*.xunlei.com/**', handler)
        await pg.add_init_script(script="try{localStorage.setItem('credentials_Xqp0kJBXWhwaTpB6', JSON.stringify({access_token:'%s',refresh_token:'r',expires_in:7200}))}catch(e){}" % TOK)
        await pg.add_init_script(script="window.__copied=[];const oe=document.execCommand&&document.execCommand.bind(document);document.execCommand=(c)=>{if(c==='copy'){const t=document.querySelector('textarea');if(t)window.__copied.push(t.value);}try{return oe?oe(c):false}catch(e){return false}}")
        await pg.add_init_script(script=SCRIPT)
        await pg.goto('https://pan.xunlei.com/', wait_until='domcontentloaded')
        await pg.wait_for_timeout(4500)
        print('挂载:', await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          return {badge:(sr.getElementById('yx-badge')||{}).textContent,title:(sr.getElementById('yx-title')||{}).textContent,
                  sub:(sr.getElementById('yx-sub')||{}).textContent,tag:(sr.getElementById('yx-tag')||{}).textContent}; }"""))
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.querySelector('[class*=fab]').click()")
        await pg.wait_for_timeout(700)
        print('条目:', await pg.evaluate("""() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row[data-fid]')].map(x=>x.dataset.fid+':'+x.querySelector('.txt').textContent)"""))

        # 真实鼠标点第 2 行复选框
        box = await pg.evaluate("""() => { const sr=document.getElementById('yunx-panlink-host').shadowRoot;
          const cb=sr.querySelector('.row[data-fid="222"] label.cb'); const r=cb.getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; }""")
        await pg.mouse.click(box[0], box[1])
        await pg.wait_for_timeout(400)
        print('勾选后:', await pg.evaluate("""() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.row.sel')].map(x=>x.dataset.fid)"""))
        await pg.evaluate("() => document.getElementById('yunx-panlink-host').shadowRoot.getElementById('yx-copy-sel').click()")
        await pg.wait_for_timeout(2500)
        print('复制:', await pg.evaluate("() => window.__copied"))
        print('提示:', await pg.evaluate("() => [...document.getElementById('yunx-panlink-host').shadowRoot.querySelectorAll('.toast')].map(t=>t.textContent).slice(-3)"))
        print('请求:', calls)
        await b.close()

asyncio.run(main())
