// 아이콘 PNG 일괄 생성기.
// assets/icon-source.svg, assets/icon-foreground.svg 수정 후 `node scripts/build-icons.js`.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const fullSvg = fs.readFileSync(path.join(ASSETS, 'icon-source.svg'));
const fgSvg = fs.readFileSync(path.join(ASSETS, 'icon-foreground.svg'));

async function render(svg, size, outPath) {
  await sharp(svg, { density: 600 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log(`✓ ${path.basename(outPath)} (${size}×${size})`);
}

(async () => {
  await render(fullSvg, 1024, path.join(ASSETS, 'icon.png'));
  await render(fgSvg, 1024, path.join(ASSETS, 'adaptive-icon.png'));
  await render(fullSvg, 1024, path.join(ASSETS, 'splash-icon.png'));
  await render(fullSvg, 48, path.join(ASSETS, 'favicon.png'));
  console.log('\n모든 아이콘 생성 완료. app.json의 backgroundColor 확인하세요.');
})();
