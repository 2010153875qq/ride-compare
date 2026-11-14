/* 高德地图 JS API 配置（可选）
 * 1. 到 https://console.amap.com/dev/key/app 创建应用 → 添加 Key，服务平台选「Web端(JS API)」
 * 2. 把 Key 和「安全密钥」填到下面；不填也能用——手动输入公里数和分钟数即可估价
 * 3. 建议在高德控制台给 Key 绑定你的域名白名单，防止被盗用
 */
window.RIDE_CONFIG = {
  AMAP_KEY: '',               // 例如 'a1b2c3...'
  AMAP_SECURITY_CODE: '',     // 安全密钥 securityJsCode
  DEFAULT_CITY: '通用'
};
