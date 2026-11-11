# 云析直链 · 网盘直链下载助手（Tampermonkey）

把 [YunX（云析）](https://github.com/CYQawa/YunX) 的分享解析原理搬到浏览器里，做成一个 **篡改猴（Tampermonkey）脚本**：
打开网盘分享页 → 自动列出文件 → 取直链 → **多线程分片下载（可暂停、可断点续传）**，或者把链接推给 IDM / Aria2。

界面参考「网盘直链下载助手」，但**没有口令、没有授权码、没有激活弹窗**，装完即用。

---

## 一、安装

1. 浏览器安装 **Tampermonkey**（篡改猴）扩展；
2. 打开 Tampermonkey 面板 → 「添加新脚本」；
3. 删掉模板，把 `云析直链.user.js` 全文粘进去 → `Ctrl+S` 保存；
   也可以直接把 `.user.js` 文件拖进浏览器窗口，按提示安装。
4. 打开任意夸克 / UC / 123 / 115 / 天翼 / 移动 / 百度 / 迅雷 / 阿里 分享页，右下角会出现蓝色 **⚡** 悬浮球。

> 需要 Tampermonkey 4.19 以上（用到 `GM_cookie` 读 HttpOnly 登录态；读不到会退化成游客链路，不影响使用）。

**手机上装**：用支持用户脚本的浏览器（X 浏览器 / Via / 夸克自带脚本管理等），直接导入同一个 `.user.js` 即可。这类环境通常没有 `GM_xmlhttpRequest`，脚本会自动切到 `fetch` + `localStorage`，下载交给系统浏览器 —— 不会再出现 `GM_xmlhttpRequest is not defined` 的白板。

### 从 GitHub 安装（推荐，带自动更新）

```
https://raw.githubusercontent.com/zjkl0330/tampermonkey/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js
```

浏览器直接打开这个地址，篡改猴会弹安装页。用这个地址装的脚本**会自己检查更新**：

| 机制 | 行为 |
| --- | --- |
| `@updateURL` / `@downloadURL` | 已写进脚本头，篡改猴默认每 24 小时拉一次新版本，有更新时扩展图标亮红点 |
| 面板「设置 → 检查更新」 | 手动查：显示 `版本 v1.9.0 → v2.0.0 可更新`，确认后直接跳安装页 |
| 静默日检 | 每次打开页面时，距上次检查超过 24 小时才查一次；没新版不弹任何东西 |
| 版本对照 | 设置面板底部显示当前版本，仓库 `js/云析直链.user.js` 头部是同一份 `@version` |

更新失败时脚本会**说出原因**（HTTP 码 / 网络不通 / 域名没授权），不会只丢一句「网络错误」。

> `raw.githubusercontent.com` 在国内偶尔连不上。连不上就把 `@updateURL` / `@downloadURL` 换成镜像：
> `https://gh.zjkl0330.dpdns.org/zjkl0330/tampermonkey/raw/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js`
> 或者直接重新下载覆盖安装，设置（含百度令牌）存在扩展里，不会丢。
>
> 注意：镜像会把文件里的 `github.com` 改写成自己的域，`@namespace` 跟着变，篡改猴可能提示「脚本已存在，是否覆盖」——点覆盖即可，仍然是一个脚本。
> 镜像响应不带 `Access-Control-Allow-Origin`，所以**不能**当自动检查更新的数据源（浏览器会 CORS 拦掉），只能用来下载安装。

### 运行范围（v1.9.0 起收窄）

早期版本是「域名级全站匹配」，连登录页、会员页都会挂悬浮球。现在只在**分享页**注入：

| 平台 | 启用的路径 |
| --- | --- |
| 夸克 | `pan.quark.cn/`、`pan.quark.cn/s/*` |
| UC | `drive.uc.cn/s/*` |
| 123 云盘 | `www.123865.com/s/*`、`www.123pan.com/s/*`、`www.123pan.cn/s/*`、`yun.123pan.cn/*`、`share.123pan.cn/123pan/*` |
| 115 | `115.com/s/*`、`115cdn.com/s/*`、`115rc.com/s/*` |
| 天翼 | `cloud.189.cn/t/*`、`cloud.189.cn/web/share*` |
| 移动 | `yun.139.com/*`、`caiyun.139.com/*`（分享走 hash 路由，路径太多，保留全域） |
| 百度 | `pan.baidu.com/s/*`、`pan.baidu.com/share/*`、`yun.baidu.com/s/*`、`openapi.baidu.com/*`（授权页） |
| 迅雷 | `pan.xunlei.com/s/*` |
| 阿里 | `www.alipan.com/s/*`、`www.aliyundrive.com/s/*` |
| 城通 | `*.ctfile.com/*`、`*.ctfile.net/*`、`*.545c.com/*` |

另外统一排除：`/passport/*`、`/login*`、`/register*`、`/reg.html*`、`/vip*`、`/pay*`、`/about/*`、`/help*`。

**连接域**（`@connect`）也一并从 `*` 收紧成具体域 + 通配：百度 / 迅雷 / 夸克 / UC / 123 / 115 / 天翼 / 移动 / 阿里 / 城通的接口域与 CDN，加 GitHub raw（更新用）。真遇到某个 CDN 不在清单里，下载会明确提示「域名未授权：…（该 CDN 不在 @connect 列表）」，在篡改猴弹窗点「总是允许」即可，不会再假报「网络错误」。


## 二、使用

| 操作 | 说明 |
| --- | --- |
| 打开分享页 | 自动预解析，⚡ 上显示文件数徽标 |
| 点 ⚡ | 打开面板：文件列表、大小、选择框 |
| 页面「直链下载」按钮 | 会自动挂在「保存到网盘 / 下载 / 打开 APP」旁边，点它直接开面板（设置里可关） |
| 下载（手机） | 直接交给浏览器：文件进系统「下载」列表，跟你自己点链接下载一模一样 |
| 下载（电脑油猴） | 默认走**分片下载**：8 连接并发、实时百分比 + 速度，再点一次变「暂停」，暂停后点「继续」从断点接着下 |
| 复制 | 把直链写入剪贴板（可在设置里改成 Aria2 / cURL / IDM 命令） |
| ⋯ | 复制直链 / **IDM 命令** / Aria2 命令 / cURL 命令 / 浏览器打开 / 复制文件名 / 暂停 / 继续 / 取消并清理缓存 |
| 全选 + 复制已选 | 批量取链（间隔 220ms，避免触发频控） |
| 导出 Aria2 | 生成带 `--header` 的脚本，Aria2 直接 `sh` 或粘进命令行 |
| ⇄ | 解析其它链接（也能直接粘整段分享文案，自动识别提取码） |
| ⚙ | 设置：自动解析、悬浮球、页面按钮接管、复制内容、下载方式、**并发连接数** |
| 解析失败 | 错误区直接给「提取码 + 重试」，不用重开面板 |
| 去广告 | 自动隐藏分享页的广告 / 推广浮层（设置里可关；也能填自己的选择器补规则） |

### 手机 / 没有油猴的环境

手机浏览器（夸克、UC、Via、X 浏览器等）大多**不提供 `GM_xmlhttpRequest`**，直接装脚本会报 `GM_xmlhttpRequest is not defined`，面板一片空白。v1.2.0 起脚本自带降级层：

| 能力 | 油猴环境 | 手机 / 无 GM 环境 |
| --- | --- | --- |
| 取文件列表 | `GM_xmlhttpRequest` | `fetch`（`credentials: include`，夸克接口允许跨域） |
| 登录态 / 游客 Cookie | GM Cookie + 自动种 `__pugs` | 浏览器自己管，同站请求自动带 |
| 设置存储 | `GM_setValue` | `localStorage` |
| 下载 | 分片引擎（暂停 / 续传） | 交给浏览器下载器，进度看系统「下载」 |
| 剪贴板 | `GM_setClipboard` | `execCommand('copy')` |

实测：Pixel 5 尺寸、**不开 `--disable-web-security`**、页面上完全没有 GM API 的情况下，面板能正常列出目录并下载，文件 SHA-256 与源文件一致。

> **百度、迅雷** 1.6.0 起不再依赖 `GM_xmlhttpRequest`：百度接口与分享页同源、迅雷接口与分享页同站且放行 CORS，脚本改用页面内 `fetch`（`credentials: include`），Cookie 由浏览器自动带，手机浏览器也能直接跑。其余七个平台仍然需要自定义 UA，走 `GM_xmlhttpRequest`。


## 三、多线程 / 断点续传是怎么做的

和 IDM、aria2 一个思路，全在浏览器里完成，不装任何软件：

```
1. 探测：HEAD 看 Accept-Ranges；不给就退化成 1 字节 GET 探，再不行就降级
2. 切片：按文件大小自适应块大小（1MB~16MB），块数控制在 3000 以内
3. 并发：N 个连接各领一片，带 Range: bytes=start-end
4. 落盘：每片回来就写进 OPFS 缓存文件的对应偏移量（navigator.storage）
5. 暂停：掐掉在途请求，已落盘的分片保留；继续时只补缺失的片
6. 完成：把缓存文件交给 <a download> 另存，60 秒后清缓存
```

- **断点续传能跨刷新**：进度（分片完成位图 + 块大小 + 文件大小）写在 `GM_setValue`，缓存文件在 OPFS 里。暂停后刷新页面、甚至关掉标签页再回来，列表里那一行仍显示「已暂停 xx%」，点「继续」重新取一条新直链，只下缺的片。
- **进度不虚标**：暂停时按「已落盘的分片」重算百分比，半截分片直接作废，显示的数字就是真实的续传起点。
- **不支持 Range 的直链**（部分第三方 CDN）：≤200MB 自动退回单连接代下，更大的提示改用 IDM / Aria2，不会卡在那里不动。
- **多人多任务**：同时下多个文件时自动平分连接数，避免一口气铺开几十个连接被风控。

### 交给 IDM / Aria2

| 出口 | 命令 | 说明 |
| --- | --- | --- |
| IDM | `idman.exe /d "URL" /f "文件名" /p "%USERPROFILE%\Downloads" /q` | IDM 默认 8 线程 + 断点续传。**夸克/UC 的游客链需要 Referer 和 `__pugs`**，IDM 的命令行带不了，请在「选项 → 站点管理」给对应域名加请求头，或改用 Aria2 |
| Aria2 | `aria2c -c -x16 -s16 -k1M --header="Referer: …" --header="Cookie: __pugs=…" -o "文件名" "URL"` | `-c` 就是断点续传，`-x/-s` 是分片数 |
| cURL | `curl -L -C - -H "…" -o "文件名" "URL"` | `-C -` 续传 |

> 123 云盘、蓝奏这类不校验 Referer 的直链，IDM 命令可以直接用；夸克 / UC 建议用 Aria2 那条（命令里已经带好 header）。

## 四、支持情况（都是实际跑过的）

| 平台 | 列目录 | 取直链 | 说明 |
| --- | --- | --- | --- |
| 夸克网盘 `pan.quark.cn/s/xxx` | ✅ 游客 | ✅ 游客 | 列表 → 取链 → Range 分片，端到端跑通（含文件夹分享） |
| UC 网盘 `drive.uc.cn/s/xxx` | ✅ 游客 | ✅ 游客 | 取链后 CDN 200，`Content-Length` 与文件大小一致 |
| 123 云盘 `123865.com/s/xxx` 等 | ✅ 匿名 | ⚠️ 需登录 | 匿名列表可读；下载接口统一返回 `5112 您需要注册登录或付费后下载`，登录后从 `localStorage.authorToken` 自动取 |
| 115 网盘 `115.com/s/swxxx` | ✅ 游客 | ⚠️ 需登录 | `share/snap` 游客可用；`share/downurl` 游客返回 `990001 登录超时` |
| 天翼云盘 `cloud.189.cn/t/xxx` | ⚠️ 需登录 | ⚠️ 需登录 | 游客 `sessionKey=null`，登录后同源请求自动带 Cookie |
| 移动云盘 `yun.139.com/w/#/w/i/xxx` | ✅ 游客 | ⚠️ 需登录 | 请求体 AES-CBC 加密（key `PVGDwmcvfs1uV3d1`，IV 前置，响应可能 gzip），浏览器 Web Crypto 实测 `resultCode: 0`；取链返回 `200000401 IP鉴权失败、用户账号鉴权失败` |
| 阿里云盘 `alipan.com/s/xxx` | ✅ 游客 | ⚠️ 需登录 | 匿名 `share_token` 可列目录；`get_download_url` 返回 `AccessTokenInvalid` |
| 百度网盘 `pan.baidu.com/s/1xxx` | ⚠️ 列目录需登录 | ✅ 授权后可用 | 一键 OAuth 拿 `access_token` → `xpan/multimedia?method=filemetas`；下载必须 `UA: pan.baidu.com` + `access_token` 参数 |
| 迅雷云盘 `pan.xunlei.com/s/xxx` | ✅ 游客可浏览全目录 | ⚠️ 下载需登录（转存后取链） | 9 层 md5 换 `X-Captcha-Token`，匿名可列目录，`web_content_link` 匿名为空 |
| 城通网盘 `url95.ctfile.com/f/xxx` | ✅ 游客 | ✅ 游客 | ALTCHA-PBKDF2 人机验证本地可解（0.5s）；单连接限速 30KB/s，多连接实测 8 路 1.4MB/s |

> **「需登录」是什么意思**：脚本在你已经登录的网盘页面里运行，用同源请求自动带上浏览器里的登录 Cookie —— 你不需要在弹出的面板里再输一次账号，也不会有任何账号信息离开你的浏览器。没登录时脚本会直接告诉你「请先在 xxx 登录」，不会假装成功。

暂不支持，只有两个：

| 平台 | 卡点（实测原文） |
| --- | --- |
| 蓝奏云 `lanzou*.com/iXXXX` | 第一道 `acw_sc__v2` 能算对（40 位 `arg1` 按固定 40 项重排，与 mask `3000176000856006061501533003690027800375` 逐字节异或，服务端认可），但下载入口换成 `lanrar.com` + **第二道「系统发现您的网络异常，需要验证后下载文件」**，`/file/ajax.php` 返回 `{"zt":1,"url":"?SignError"}` |
| 光鸭云盘 `guangyapan.com/s/xxx` | 登录 + 短信验证码，无法自动化 |

> 蓝奏这条不是算法问题：cookie 算对了、服务端也认，卡的是人为加的 IP 绑定人机验证。硬做只会变成「按钮点了报错」，所以不做。

## 五、解析原理（各平台链路）

### 夸克 / UC（同一套 clouddrive 协议，仅域名与 UA 不同）

```
1. POST /1/clouddrive/share/sharepage/token      {pwd_id, passcode}        → stoken
2. GET/POST detail（夸克 sharepage/detail，UC transfer_share/detail）
                                                 → list[{fid, file_name, size, dir, share_fid_token}]
3. POST /1/clouddrive/file/download              {fids, fids_token, pwd_id, stoken}
                                                 → data[0].download_url
```

两个坑，都在代码里处理了：

- **游客态 Cookie**：取链响应会下发 `__pugs`，缺它 CDN 直接 412。脚本会抓住它、写进下载请求头，并顺手落到站点域上，让浏览器直接点链接也能下载。
- **UC 的 token 要「绑定」**：`sharepage/v2/detail` 返回的 `share_fid_token` 拿去换直链会报 41020（token 校验异常），必须改用 `transfer_share/detail`（GET + stoken）拿列表。夸克没有这个问题。

### 123 云盘

```
1. GET  /b/api/share/get?shareKey=…&ParentFileId=0&Page=1   （UA 必须是 Dart/3.12）
2. POST /b/api/share/download/info  {ShareKey, FileID, S3KeyFlag, Size, Etag}
        headers: authorization: Bearer <localStorage.authorToken>
                 auth-key / auth-value = crc32 签名（时间 +16h，逐位替换表）
3. data.DownloadURL → base64 / params= 解码 → 真实 CDN 地址（下载带 Referer: https://yun.123pan.cn/）
```

签名算法照着网页端逐字还原，服务端认可签名（返回的是业务错误码，不是签名错误）。

### 移动云盘（请求体整段加密）

```
1. POST share-kd-njs.yun.139.com/.../IOutLink/getOutLinkInfoV6
   body = base64( IV(16B) + AES-CBC(JSON, key="PVGDwmcvfs1uV3d1") )
   headers: hcy-cool-flag:1 / x-deviceinfo / x-huawei-channelsrc / x-mm-source
2. 同一接口换 pCaID 进子目录（根目录传 "root"，eNum 上限 200，传 300 会报「远程服务器操作失败」）
3. POST .../dlFromOutLinkV3  {linkID, coIDLst.item, commonAccountInfo}
```

响应可能 gzip：解密后前两字节是 `1f 8b` 就用 `DecompressionStream('gzip')` 再解一次。浏览器里用 Web Crypto 实测 `resultCode: 0`，三级目录全部列通。

### 百度网盘（AccessToken 主路线 + 免转存兜底）

百度是十家里最麻烦的一家：2023 年关掉游客取链后，网页端所有取链接口都只认登录 Cookie，而最关键的两个值（`BDUSS`）又是 **HttpOnly**，脚本根本读不到。2026-11 这版改成**开放平台 OAuth 令牌**，把这条死路绕开了。

**路线 0 · 一键授权（推荐，v1.8.0 新增）**

```
1. 面板点「一键授权百度网盘」
   → 打开 openapi.baidu.com/oauth/2.0/authorize?response_type=token
             &scope=basic,netdisk&client_id=<公开 client_id>&redirect_uri=oob
2. 授权页由脚本自动点「允许」（登录框状态下会提示你先登录）
3. 跳转 login_success#access_token=xxx → 脚本抓 token 存本地（30 天有效）
4. GET /rest/2.0/xpan/nas?method=uinfo&access_token=   → 校验 + 显示账号名
```

拿到令牌后，取链和下载都只认它，**不再依赖 bdstoken，也不怕页面改版**：

```
5. GET /rest/2.0/xpan/multimedia?method=filemetas&dlink=1
       &fsids=[fsid]&access_token=            → list[0].dlink
6. 下载：GET {dlink}&access_token=xxx
       Header: User-Agent: pan.baidu.com      ← 少了这个必 403
```

> **两条硬性约束**（百度开放平台官方文档原文，不是经验之谈）：
> ① `access_token` 必须**拼在 dlink 的查询串上**，不是 Header；
> ② `User-Agent` 必须是 `pan.baidu.com`。
> 官方错误码：`31045` 令牌失效 / `31362` 签名错误 / `31326` 命中防盗链（UA 不对）/ `31360` 链接过期（dlink 8 小时）。
> 之前「百度用不了」的根因就在这里：浏览器直接点 dlink 时 UA 是 Chrome，超过 50MB 会被判防盗链 403。

**路线 A · 免转存（分享直下，登录态可用时先试）**

```
1. 页面上下文取 bdstoken / jsToken / share_uk / shareid / sekey
   （window.locals.dump() + window.jsToken + window.currentSekey）
   读不到就退到同域 GET /api/gettemplatevariable?fields=["bdstoken"]
2. GET  /share/tplconfig?fields=sign,timestamp&surl=1xxxx&bdstoken=&logid=
                                                             → sign / timestamp
3. POST /api/sharedownload?sign=&timestamp=&bdstoken=&logid=&jsToken=
        Header: User-Agent: netdisk;            ← 网页 UA 会被拒
        encrypt=0&product=share&uk=&primaryid=&fid_list=[fsid]&extra={"sekey":""}
                                                             → list[0].dlink
```

不写入网盘、不占空间，链接约 8 小时有效。`list` 返回字符串时表示「文件过大，需转存后下载」。

**路线 B · 转存兜底（A 失败才走）**

有令牌时走开放接口（更稳）：

```
4. POST /rest/2.0/xpan/share?method=transfer&access_token=&shareid=&from=uk&sekey=
        fsidlist=[fsid]&path=/yunx                      → list[0].to_fsid
5. GET  /rest/2.0/xpan/multimedia?method=filemetas&dlink=1&fsids=[新fsid]
```

没令牌时退回网页接口：`api/create?a=commit` 建目录 → `share/transfer` → `api/filemetas?dlink=1`。

其他坑：
- 子目录 `root` 必须 `0`，根目录 `1`；
- 子目录必须带 `BDCLND` Cookie（= 提取码换来的 `randsk`），否则 `errno=2`；
- `BDUSS` 是 **HttpOnly**，`document.cookie` 和 `GM_cookie` 都读不到，所以**不能用 Cookie 判断登录态**——这正是旧版「明明登录了却提示未登录」的原因，现在改用 `locals.loginstate` + 接口回包兜底；
- 下载走分片引擎，而不是交给浏览器：只有 `GM_xmlhttpRequest` 才能把 UA 改成 `pan.baidu.com`，顺带拿到断点续传和多线程。

### 迅雷云盘（captcha 签名）

```
1. sign = "1." + md5×9( client_id + "1.93.10" + "pan.xunlei.com" + device_id + ts + salt[i] )
2. POST xluser-ssl.xunlei.com/v1/shield/captcha/init   → captcha_token（300s）
3. GET  api-pan.xunlei.com/drive/v1/share?share_id=&pass_code=&limit=100
        headers 必须带 X-Client-Id / X-Captcha-Token / X-Device-Id
4. GET  .../share/detail?share_id=&parent_id=&pass_code_token=      （子目录）
5. POST .../share/restore  → trace_file_ids[老id] = 新id             （需登录）
6. GET  .../drive/v1/files/{新id}  → links["application/octet-stream"].url
```

MD5 是脚本内自带的实现（零依赖），已和 Node 的 `crypto` 逐条比对通过（含中文与长字符串）。

实测（2026-11-09，`pan.xunlei.com/s/VOn6f4Fs...`）：

- 游客态签名换 token → `200`，`captcha_token` 743 字符；
- `GET /drive/v1/share` → `share_status: OK`，`title` 正确；
- `GET /drive/v1/share/detail?parent_id=` → 逐层进子目录正常（根 → 8 项 → 子目录 8 项 → 文件）；
- 文件对象 `web_content_link` 为空、`links` 为空 → **匿名拿不到直链**，转存是官方唯一路径；
- 结论：**游客可浏览任意层级目录，下载必须登录**。脚本已按此实现，未登录时按钮会直接引导登录。

### 阿里云盘（匿名 share_token）

```
1. POST api.aliyundrive.com/adrive/v3/share_link/get_share_by_anonymous  {share_id}
2. POST /v2/share_link/get_share_token  {share_id, share_pwd}   → 2 小时有效的 share_token
3. POST /adrive/v3/file/list  {parent_file_id:"root", limit:100}  headers: x-share-token
4. POST /v2/file/get_download_url  {drive_id, file_id}          （需 Authorization: Bearer）
```

阿里接口的 CORS 对 `alipan.com` 完全开放（`allow-headers: content-type, x-share-token`），所以**手机浏览器也能列目录**，不需要油猴。

### 城通网盘（单文件分享，游客可取链）

```
1. GET  /api/v2/captcha/altcha?captcha_action=share_passcode
        → {parameters:{algorithm:"PBKDF2/SHA-256", cost, keyLength,
                       keyPrefix, nonce, salt}, signature}
2. 本地解 PoW（不是图形验证码）：
        derivedKey = PBKDF2-HMAC-SHA256(
            password   = hexToBytes(nonce) || uint32_be(counter),
            salt       = hexToBytes(salt),
            iterations = cost, dkLen = keyLength)
        命中条件：hex(derivedKey).startsWith(keyPrefix)，counter 从 0 递增
        → altcha_token = base64(JSON{challenge, solution:{counter, derivedKey, time}})
3. GET  /api/v2/resource?kind=file&id=<fid>&folder_id=0&passcode=&type_id=0&altcha_token=
        → data.file{file_name, file_size_bytes, file_id, userid, file_chk, verifycode}
          data.access_pass
4. POST /api/v2/download
        {context:{kind,id,folder_id,fk,passcode,type_id,access_pass},
         app:false, verifycode,
         original_file:{file_id,userid,file_chk,start_time,wait_seconds}, carrier:0}
        → data.downurl
```

五个坑，全踩过：

- **`verifycode` / `file_chk` 必须原样带回**。它们是第 3 步那次响应里下发的、每次请求都不一样；漏掉就会收到 `403 Download signature is invalid`，看起来像「参数没传全」，其实是被当成签名不对。
- **`altcha_token` 一次性**，同一个 token 用第二次直接 423。每次解析都要重新解一遍 PoW（实测 0.5s，64 路批量 `deriveBits`）。
- **直链绑 IP**：`ctp=` 是请求方 IP 的十六进制（`111A229A174A181` = 111.229.174.181）。换网络/换设备重新取链。
- **改参数会被拒**：把 `spd=30000` 改成 `spd=9999999` → `503`；删掉 `limit=2` → `400`。服务端认这两个值。
- **单连接限速 30KB/s** 是写死的（`download_estimate.limit_speed_bytes`），但**限速是按连接算的**，多连接能叠加。

加速实测（同一文件，805MB，`spd=30000`）：

| 并发 | 实测总速度 | 倍数 |
| --- | --- | --- |
| 1 | 29.8 KB/s | 1× |
| 4 | 407 KB/s | 13.6× |
| 8 | 881 / 710 / 1555 KB/s（三轮） | 30–50× |

越过 `threshold_bytes`（200MB）之后测 300MB 处的分片，速度不降，说明不是「前 200MB 高速」的套路。

> **但城通有流量配额**：连续测了几 GB 之后，同一 IP 的所有 CDN 请求（含 Python 直连、换节点）统一返回 `503 Service Temporarily Unavailable`。所以脚本给城通设了 `maxThreads: 4`（既保留加速，又不容易撞限流），并且**不要拿它刷大文件**。

## 六、实测记录

| 项目 | 结果 |
| --- | --- |
| 分片下载（24MB 测试文件） | 8 连接 / 24 片，约 6.5MB/s；下完 **25,165,824 字节**，SHA-256 与源文件逐字节一致 |
| 暂停 → 刷新 → 续传 | 暂停在 65%（真实落盘 50%），刷新页面后面板仍显示「已暂停 50%」，点继续从 50% 补完，最终哈希一致 |
| 无 Range 直链 | 自动降级为单连接代下，仍得到 25,165,824 字节且哈希一致 |
| 夸克分享 `fe29d0d39745` | 列目录 4 文件 + 1 文件夹；取链成功；脚本代下与接口 `size` 一致 |
| UC 分享 `f11974bdb56e4` | 列目录成功；取链后 CDN 返回 **200**，`Content-Length: 3046953491`，文件名 `94本UI设计电子书.zip` |
| 123 分享 `2785Vv-T4Ded` | 匿名列目录成功（1 文件夹 / 1 文件 132KB）；`download/info` 匿名请求返回 `{"code":5112,"message":"您需要注册登录或付费后下载"}` |
| 子目录 / 返回 | 进入文件夹、面包屑返回均正常 |
| 整段文案粘贴 | `…分享 https://drive.uc.cn/s/… 提取码: abcd` 可正确识别链接与提取码 |
| 夸克分享 `1f678cebc200`（文件夹分享） | 根目录 1 个文件夹 → 进入后 3 文件（19MB APK / 2.4KB sh / 5.5MB zip）；3 个文件全部下载成功，字节数与接口 `size` 逐一相等 |
| 同一链接的 SHA-256 交叉校验 | `提权文件.zip` = `c98263b8…`、`.sh` = `cc30399f…`、`.apk` = `def0fa33…`，脚本代下与 Python 直连结果完全一致 |
| 8 路并发 Range（同一 zip） | 8 个分片全部 `206`，重组后 SHA-256 与整文件一致；单片刻 2–25s 不等，属 CDN 冷启动限速 |
| 游客链直链单独外发 | 不带 `__pugs` 时 CDN 一律 **412**；带 Cookie 后 `206` 且 `Content-Range` 正常 |
| 手机无 GM 环境（Pixel 5 视口，不开跨域豁免） | 面板正常列出「月虹提权助手」3 个文件；点「下载」触发浏览器原生下载，落盘 `.sh` **2,432 字节**，SHA-256 与源文件一致 |
| 页面按钮接管 | 在「保存到网盘」「下载」旁注入「直链下载」，全页只挂一个不溢出；点击直接开面板 |
| 移动云盘 `2sUfCssC2FJnw` | 根目录 1 文件夹 → 二级 3 文件夹 → 三级 6 文件夹 → 四级 22 个 flac；标题、大小、面包屑全部正确 |
| 移动云盘加密 | 浏览器 `crypto.subtle` AES-CBC 加密后 `getOutLinkInfoV6` 返回 `{"resultCode":"0","success":true}`，三级目录递归成功 |
| 阿里云盘 `FUh4ciwFesR` | 匿名 `share_token` 列目录成功：`20231226.[Android] Easy Voice Recorder v2.8.7高级录音(9mb) .rar`，6.6MB |
| 阿里取链（游客） | `get_download_url` 返回 `{"code":"AccessTokenInvalid","message":"access token is blank"}`，脚本提示「请先登录」 |
| 百度分享（游客） | `xpan/share` 返回 `errno=-6`；面板显示「一键授权百度网盘 / 我已登录，重试」 |
| 百度直链 | `locatedownload` 的写死 `psign` 已废弃 → 改用 `api/filemetas?dlink=1`；新增 `api/sharedownload` 免转存通道 |
| 百度 OAuth 授权页 | 实测 `openapi.baidu.com/oauth/2.0/authorize` 返回 200、应用名显示 `OpenList`（client_id 未被封）；未登录时为登录框，脚本按 DOM 判断并提示先登录 |
| 百度令牌抓取 | 构造 `login_success#access_token=…` 页面实测：脚本抓到令牌并写入 GM 存储，无 JS 报错 |
| 百度自动授权 | 注入 `button#auth-allow` 后 2.5s 内被自动点中，横幅切换为「已自动点击允许」 |
| 百度下载头 | 官方文档：`GET {dlink}&access_token=xxx` + `User-Agent: pan.baidu.com` 必填；UA 不符 → `31326` / 403 |
| 迅雷游客全链路 | 自算签名换 token → `crypto` 比对一致；`share` 与 `share/detail` 逐层列目录全通（根→子→文件）；文件 `web_content_link` 为空，故下载必须登录 |
| 迅雷 CORS | 之前 `fetch` 带 `Origin` / `X-Client-Version` 触发预检失败（`Access-Control-Allow-Headers` 不含），删掉后 `200` |

> 测试方式：本地起 HTTPS 测试站，用 `--host-resolver-rules` 把 `pan.quark.cn` / `drive.uc.cn` / `www.123865.com` / `yun.139.com` / `www.alipan.com` / `pan.baidu.com` / `pan.xunlei.com` 指到本地，`GM_xmlhttpRequest` 代理到真实接口（下载链路用本地 Range 文件服务 + 限速），在 Chromium 里跑完整交互并逐字节校验。
>
> `1f678cebc200` 这组是在**纯代理、零 mock** 的测试台上跑的，页面上能直接看到真实目录，下载引擎跑完后从 OPFS 读回文件算哈希。

## 七、关于「123 云盘网页会员」

网上流传的「123 云盘会员青春版」那类脚本，原理是把网页端 JS 里的 `vip / svip / level / endtime` 改成 `true`，再改头像、昵称、会员角标。

它改的只是**前端显示**：

- 服务端鉴权用的是 `authorToken` 里的真实账号信息，改本地变量改不动；
- 下载接口 `download/info` 现在直接回 `5112 您需要注册登录或付费后下载`，请求还没到「校验会员」那一步就被拦了，前端怎么伪装都拿不到链；
- 唯一有点实际作用的是「放行 >1GB 匿名下载请求」这一处，属于绕过付费限制，这部分我不做。

所以本脚本走的是另一条路：**你登录 123 账号，脚本用你真实的登录态取链**（免费的也行），再用 8 线程分片把带宽吃满——这才是能真正提速的部分。顺带一提，LinkSwift 的作者在 README 里也写明了「不能也不会破解限速」，这类工具的价值在「省掉客户端和转存」，不在「变出会员」。

## 八、常见问题

**点下载浏览器报 412 / 403？**
游客直链必须带 `__pugs` 与 `Referer`。分片引擎会自动带上这两个头；如果直链被单独开在标签页里，可能被拦——改用 `⋯ → 复制 Aria2 命令`。

**提示「游客链有大小限制」？**
夸克对未登录用户限制单文件约 50MB。在 `pan.quark.cn` 登录后再点一次即可；登录态下走的是「免转存取链」，不会往你网盘里塞临时文件。

**123 提示「需要注册登录或付费」？**
这是 123 服务端的策略，脚本绕不过去。在 `www.123865.com` 登录后刷新分享页，脚本会从 `localStorage.authorToken` 自动取 token。

**下载到一半关掉页面会怎样？**
进度存在 `GM_setValue`、数据存在 OPFS，回来打开同一个分享页，那一行还是「已暂停」，点「继续」即可。缓存超过 60 秒未使用会被清掉（下完自动清）。

**磁盘空间不够 / 提示无法写入缓存？**
浏览器给每个站点的存储配额有限。脚本会自动降级为单连接代下（≤200MB），更大的文件请用 IDM / Aria2。

**面板挡住了页面？**
`Esc` 关闭；设置里可以关掉悬浮球，用油猴菜单「⚡ 打开直链面板」唤起。

**为什么网盘首页没有悬浮球了？**
v1.9.0 起只在分享页注入（`/s/…`、`/t/…`、`/f/…`），登录页、会员页、个人盘不再运行。要解析分享链接，直接打开分享页即可。

**检查更新报「拉取失败 / 网络不通」？**
`raw.githubusercontent.com` 在国内不稳定，多试一次通常就好。长期不通就把脚本头里 `@updateURL`、`@downloadURL` 两行换成镜像
`https://gh.zjkl0330.dpdns.org/zjkl0330/tampermonkey/raw/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js`；
或者手动下载覆盖安装——设置和百度令牌存在扩展里，不会丢。

**下载提示「域名未授权：…」？**
v1.9.0 把 `@connect` 从 `*` 收紧成了具体 CDN 列表。碰到没列进去的域，篡改猴会弹「是否允许」，点「总是允许」即可；这条提示就是为了让你知道是权限问题，而不是网络问题。

## 九、和 YunX App 的区别

| | YunX App | 本脚本 |
| --- | --- | --- |
| 登录态 | App 内 WebView 登录 | 复用浏览器当前站点的 Cookie / localStorage |
| 取链方式 | 游客 / 免转存 / 转存兜底 | 游客 + 免转存（不写你的网盘） |
| 下载 | 内置 Range 分片、断点续传 | 内置 OPFS 分片 + 断点续传，也可导出给 IDM / Aria2 |
| 平台数量 | 10 个网盘 + 7 个视频站 | 9 个网盘（夸克 / UC / 123 / 115 / 天翼 / 移动 / 百度 / 迅雷 / 阿里） |

## 十、免责声明

- 解析原理来自 [YunX](https://github.com/CYQawa/YunX)（AGPL-3.0），本脚本同样以 **AGPL-3.0** 开放；
- 仅供个人学习与技术交流，请勿用于商业用途；下载内容版权归原作者，请在 24 小时内删除；
- 接口随时可能变更，失效属正常现象，欢迎提 issue。
