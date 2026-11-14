// 把 site/data/pricing.json 同步成 site/data/pricing.js（双击 index.html 打开时浏览器不允许读 json）
const fs = require('fs'), p = require('path');
const j = fs.readFileSync(p.join(__dirname, 'site/data/pricing.json'), 'utf8'); JSON.parse(j);
fs.writeFileSync(p.join(__dirname, 'site/data/pricing.js'), '/* 自动生成，请改 pricing.json 后运行 node build-pricing.js */\nwindow.RIDE_PRICING = ' + j.trim() + ';\n');
console.log('ok');
