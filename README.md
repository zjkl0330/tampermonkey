# tampermonkey

个人油猴脚本仓库。

## 安装

**云析直链**（Tampermonkey 装好后直接打开这个地址）：

```
https://raw.githubusercontent.com/zjkl0330/tampermonkey/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js
```

装完不用再管：脚本头里写了 `@updateURL` / `@downloadURL`，篡改猴会自己按周期拉新版；面板「设置 → 检查更新」也能手动查、看到 `v1.9.0 → v2.0.0 可更新` 这类提示。

> raw 域名国内偶尔不通，可换镜像：
> `https://gh.zjkl0330.dpdns.org/zjkl0330/tampermonkey/raw/main/js/%E4%BA%91%E6%9E%90%E7%9B%B4%E9%93%BE.user.js`

## 脚本

| 脚本 | 说明 | 文档 |
| --- | --- | --- |
| `js/github-proxy.user.js` | GitHub 访问优化 | — |
| `js/云析直链.user.js` | 夸克 / UC / 123 / 115 / 天翼 / 移动 / 百度 / 迅雷 / 阿里 / 城通 网盘分享直链解析 | [docs/云析直链](docs/云析直链/README.md) |

## 文档

- [云析直链 · 使用说明](docs/云析直链/README.md) —— 安装、支持矩阵、各平台链路、常见问题

## 研究

| 目录 | 内容 |
| --- | --- |
| [`research/云析直链-2026-11/`](research/云析直链-2026-11/) | 10 家网盘接口实测、逆向调试方法、参考资料与验证脚本 |

## 目录约定

```
js/                    用户脚本本体
docs/<脚本名>/          使用文档 + 截图
research/<主题-年月>/    研究过程、协议实录、探针脚本
```

## License

MIT（仓库）；`js/云析直链.user.js` 为 AGPL-3.0-or-later，见脚本头。
