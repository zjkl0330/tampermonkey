import asyncio, json
from playwright.async_api import async_playwright

INIT = """
(()=>{
  window.__yxCap = window.__yxCap || {};
  const origSet = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(k,v){
    try{ if(/^x-captcha-token$/i.test(k)) window.__yxCap.tok=v;
         if(/^x-device-id$/i.test(k)) window.__yxCap.dev=v;
         if(/^x-client-id$/i.test(k)) window.__yxCap.cid=v; }catch(e){}
    return origSet.apply(this, arguments);
  };
  const of = window.fetch;
  window.fetch = function(input, init){
    try{
      const h = (init&&init.headers)||{};
      const get = (n)=>{ for(const k in h){ if(k.toLowerCase()===n) return h[k]; } return null; };
      const t=get('x-captcha-token'); if(t) window.__yxCap.tok=t;
      const d=get('x-device-id'); if(d) window.__yxCap.dev=d;
      const c=get('x-client-id'); if(c) window.__yxCap.cid=c;
    }catch(e){}
    return of.apply(this, arguments);
  };
})();
"""

URL='https://pan.xunlei.com/s/VOmtGlhQnPLn9UvdUwVK2iLmA1?pwd=gjmj'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox'])
        ctx = await b.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
        await ctx.add_init_script(INIT)
        pg = await ctx.new_page()
        pg.on('console', lambda m: print('[c]', m.text[:120]) if 'yx' in m.text else None)
        try:
            await pg.goto(URL, wait_until='domcontentloaded', timeout=40000)
        except Exception as e: print('goto', e)
        await pg.wait_for_timeout(7000)
        cap = await pg.evaluate("()=>window.__yxCap")
        print('CAP:', json.dumps(cap)[:300])
        if cap.get('tok'):
            res = await pg.evaluate("""async (a)=>{
              const r = await fetch('https://api-pan.xunlei.com/drive/v1/share?share_id='+a.sid+'&pass_code=gjmj&limit=30&pass_code_token=&page_token=',{headers:{'x-captcha-token':a.tok,'x-device-id':a.dev,'x-client-id':a.cid}});
              const t = await r.text();
              return r.status+' :: '+t.slice(0,600);
            }""", {'tok':cap['tok'],'dev':cap.get('dev'),'cid':cap.get('cid'),'sid':'VOmtGlhQnPLn9UvdUwVK2iLmA1'})
            print('API:', res)
        await b.close()
asyncio.run(main())
