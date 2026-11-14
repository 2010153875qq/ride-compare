# 🚕 打车比价（高德打车 · 花小猪 · 曹操出行 · T3出行 · 小拉出行 · 滴滴）

输入起点、终点（或公里数、分钟数）→ 按各平台**公开计价规则**估算车费 → 排出最便宜的一家；再把各 App 里看到的**实际报价**填进表格，比真实价格。
纯静态网页，**不叫车、不收款**，数据只存在你自己的浏览器里。

> ⚠️ 这些平台都没有网页叫车，也没有对个人开放的报价接口，所以本站的价格是**估算**（未含动态调价、优惠券、高速/路桥/停车费、节假日服务费），下单前以 App 为准。


## 在线使用
- 网站：https://2010153875qq.github.io/ride-compare/
- 源码：https://github.com/2010153875qq/ride-compare
- 下载整站：[ride-compare.zip](./ride-compare.zip)（解压后打开 `site/index.html` 即可本地使用）

本仓库根目录就是可直接访问的网站（GitHub Pages 从 `main` 分支根目录发布）。压缩包里保留完整项目结构（`site/`、说明和测试）。

## 功能
- 🧮 估算：起步价 + 里程费 + 时长费 + 远途费，平峰 / 高峰 / 不确定三档，显示价格区间和明细
- 🏆 排名：从便宜到贵排序，标出最便宜的；高德打车按「聚合多家运力取最低」估算
- 📲 下单入口：手机上「打开 App」（高德、滴滴），各家官网 / 下载页，一键复制微信小程序名
- ✅ 实际报价表：填 App 报价和优惠，自动算实付、标最低，并和估算对比
- 📜 历史行程：保存、再算
- 🗺️ 自动算距离（可选）：填高德地图 JS API Key 后，输入起终点自动算公里数和分钟数
- 📲 iPhone 可「添加到主屏幕」，像 App 一样全屏打开，没网也能用

## 目录
```
site/
  index.html
  manifest.webmanifest  添加到主屏幕 / PWA 配置（相对路径，可用于子目录）
  sw.js                 离线缓存
  icons/                180（苹果）、192、512 图标
  css/style.css
  js/config.js          ← 高德 Key 填这里（可选）
  js/fare.js            计价引擎
  js/app.js
  js/pwa.js             注册 Service Worker、iPhone 安装提示
  data/pricing.json     ← 计价规则（按城市，可改可加）
  data/pricing.js       由 pricing.json 生成（双击打开网页时用）
build-pricing.js        改完 pricing.json 后运行：node build-pricing.js
test.cjs / test-pwa.cjs 功能测试、PWA / 离线测试（Playwright）
```

## 配置高德 Key（可选）
1. 打开 https://console.amap.com/dev/key/app 注册登录 → 创建应用 → 添加 Key，服务平台选「Web端(JS API)」
2. 把 Key 和「安全密钥」填进 `site/js/config.js` 的 `AMAP_KEY`、`AMAP_SECURITY_CODE`（或网页「设置」里填，只存本机）
3. 在高德控制台给 Key 设置域名白名单（如 `zhourunzheng.com.cn`），防止被盗用
不填也能用：手动输入公里数和分钟数（地图 App 导航页能看到）。

## 修改计价规则
编辑 `site/data/pricing.json`：
- `cities` 下按城市写规则，`inherit` 继承其他城市（没写的平台沿用）
- 每条规则：`base` 起步价 `[平峰, 高峰]`，`baseKm` 起步里程，`baseMin` 起步时长，`perKm` 里程费，`perMin` 时长费，`long` 远途费分段
- 改完运行 `node build-pricing.js`
各地交通局常会公示网约车平台价格（如福州交通局的「网约车平台价格一览表」），可直接抄过来。

## 数据来源（2026-11 查询）
- 福州市交通运输局《福州市网约车平台价格一览表（五一期间）》（滴滴、曹操、T3 及多家小平台）：https://fzjt.fuzhou.gov.cn/zwgk/ztzl/xygl/dlysgl/czcgl/202604/t20260430_5316350.htm
- 花小猪规则（9 元含 3 公里 9 分钟，1.55 元/公里，0.28 元/分钟，远途加收）：https://www.autohome.com.cn/ask/16116098.html
- 小拉出行：官方未公示统一单价（一口价），按媒体报道「10 公里约 14–15 元」反推：https://www.bianews.com/news/details?id=214016
- T3 计价规则页：https://www.t3go.cn/fast-rule.html?ruleType=2
- 高德网约车估价接口（企业接入）：https://developer.amap.com/api/mobility-reference/server/beforeservice/price
「通用」城市为参考值，误差较大，建议改成你所在城市的公示价格。

## 在 iPhone 上添加到主屏幕
用 **Safari** 打开已发布的网址（不要用微信、Chrome 或其他 App 内置浏览器）：
1. 点底栏中间的「分享」按钮（方框加向上箭头）
2. 向下滑动，选「添加到主屏幕」
3. 右上角点「添加」

桌面上会出现「打车比价」图标，点开就是全屏 App，没网也能打开（自动算距离仍需联网和密钥）。如果页面底部出现安装提示，关掉后不会再显示。
「添加到主屏幕」和离线打开需要通过 http(s) 访问，不能靠在手机里直接打开下载的 html 文件。

## 公开部署
本仓库已发布，地址见上方「在线使用」。若要自己再部署一份，部署 `site/` 文件夹即可：
- **GitHub Pages**：新建公开仓库 → 上传 `site/` 里所有文件（含 `.nojekyll`）→ Settings → Pages → `main` / root
- **Gitee Pages**：上传后 服务 → Gitee Pages → 启动（国内访问快，需实名）
- **Vercel / Netlify / Cloudflare Pages**：拖入 `site/` 文件夹，无需构建
- 放到自己域名：复制 `site/` 到网站仓库的 `ride-compare/` 目录

## 开源协议
MIT
