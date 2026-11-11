# 云析直链 · 研究记录（2026-11）

针对国内 9 家网盘分享链接的直链获取做的一轮完整逆向与实测。

## 文档

| 文件 | 内容 |
| --- | --- |
| [01-平台协议实录](01-平台协议实录.md) | 9 个平台的接口链路、必填头、错误码、坑位。**想复刻的人看这份** |
| [02-逆向过程与调试方法](02-逆向过程与调试方法.md) | 怎么判断签名对不对、CORS 三步排错、HttpOnly 误判、化石参数识别、测试台搭建。**下次接口改版看这份** |
| [03-参考资料](03-参考资料.md) | 参考文献、出处、使用程度、免责声明 |
| [04-百度令牌通道](04-百度令牌通道.md) | 百度为什么怎么调都 403：BDUSS 读不到、psign 已废弃、sharedownload 有大小墙；官方 OAuth + `UA: pan.baidu.com` 的完整链路与实测 |
| [05-运行域与自动更新](05-运行域与自动更新.md) | v1.9.0 把 `@match` 收到分享页、`@connect` 去掉 `*` 的依据与断言方法；GitHub raw 自动更新的三层实现，以及 CORS 凭据、预检头、Range 取头三个坑 |

## 验证脚本

`probe/` 下是可以直接跑的探针，依赖 `playwright`：

| 脚本 | 作用 |
| --- | --- |
| `xunlei_sign_verify.py` | 纯 Python 复刻迅雷 9 层 md5 签名，验证算法正确性（不依赖浏览器） |
| `xunlei_token_hook.py` | 在迅雷页面注入 hook，截获页面自己生成的 `x-captcha-token` |
| `cors_probe.py` | 探测迅雷 / 百度的 CORS 行为与允许的请求头 |
| `baidu_context_dump.py` | dump 百度分享页的 `window.locals` / `jsToken` / `currentSekey` |
| `e2e_panel.py` | 把用户脚本注入真实分享页，点开面板，断言文件列表渲染成功 |

跑法：

```bash
pip install playwright && playwright install chromium
cd probe && python3 xunlei_sign_verify.py
```

## 一句话结论

> 除夸克 / UC 外，其余平台的下载接口都要求登录态。第三方解析站能「免登录」是因为它们有账号池跑在服务端，纯前端做不到——脚本能做的是让「登录一次」之后的体验足够顺，而不是假装绕过。
