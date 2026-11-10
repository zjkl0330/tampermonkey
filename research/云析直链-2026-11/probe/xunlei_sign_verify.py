import hashlib, json, time, urllib.request

CID='Xqp0kJBXWhwaTpB6'; VER='1.93.10'; HOST='pan.xunlei.com'
DEV='78a70629a2b17d0b4302317ffa94807a'
SALTS=['DVM8BRQfJWDsIE0JbH5GCUM0z0jU1yGymBTj4Eyloazv1F+w0G7ig','T',
'a1fUxfjOO1/dW++DpGupRgw9P93L','aktKbp+/lQc3MvlMHIupt65LjAgJOL6ttMFvTKK+7+WKubSf9rT',
'SB/ne9FQUnQmWz4Wuv9KqKfGOBOCUubpHpECxOHfD4hNoMclYA2Yq','sOZFBQ8IMFy3OFjAIf/eA65iqFvS9TIKzLyrhiT6',
'ZhJdLgL7MGh2GanboB0yk','Osf','v']
def md5(s): return hashlib.md5(s.encode()).hexdigest()
ts=str(int(time.time()*1000))
h=CID+VER+HOST+DEV+ts
for s in SALTS: h=md5(h+s)
sign='1.'+h
body={"client_id":CID,"action":"GET:/drive/v1/share","device_id":DEV,
 "meta":{"username":"","phone_number":"","email":"","package_name":HOST,"client_version":VER,
 "captcha_sign":sign,"timestamp":ts,"user_id":""}}
req=urllib.request.Request('https://xluser-ssl.xunlei.com/v1/shield/captcha/init',
 data=json.dumps(body).encode(),
 headers={'Content-Type':'text/plain;charset=UTF-8','Origin':'https://pan.xunlei.com',
 'Referer':'https://pan.xunlei.com/','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
try:
    r=urllib.request.urlopen(req,timeout=15); j=json.loads(r.read())
    print(r.status, json.dumps(j,ensure_ascii=False)[:400])
    tok=j.get('captcha_token','')
    if tok:
        u=f'https://api-pan.xunlei.com/drive/v1/share?share_id=VOn6f4FsZ0dz6iys2DgrGAZnA1&pass_code=jzv5&limit=30&page_token='
        r2=urllib.request.Request(u,headers={'x-captcha-token':tok,'x-device-id':DEV,'x-client-id':CID,
          'Origin':'https://pan.xunlei.com','Referer':'https://pan.xunlei.com/'})
        j2=json.loads(urllib.request.urlopen(r2,timeout=15).read())
        print('LIST:', j2.get('share_status'), len(j2.get('files') or []), (j2.get('files') or [{}])[0].get('name'))
except Exception as e:
    print('ERR', e, getattr(e,'read',lambda:b'')()[:300])
