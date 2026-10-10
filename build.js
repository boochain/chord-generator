// 将 src/ 下的样式、引擎与界面内联为单文件 index.html
const fs = require('fs');
const r = (f) => fs.readFileSync(__dirname + '/src/' + f, 'utf8');
const html = r('template.html').replace('/*CSS*/', () => r('style.css')).replace('/*ENGINE*/', () => r('engine.js')).replace('/*UI*/', () => r('ui.js'));
fs.writeFileSync(__dirname + '/index.html', html);
console.log('index.html 已生成，' + html.length + ' 字节');
