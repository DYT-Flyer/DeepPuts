const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('./src/app/api', (filePath) => {
  if (!filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/include:\s*\{\s*rawEvent:\s*true/g, 'include: { canonicalEvent: true');
  content = content.replace(/rawEvent:\s*\{\s*headline:/g, 'canonicalEvent: { primaryHeadline:');
  content = content.replace(/rawEvent:\s*\{\s*summary:/g, 'canonicalEvent: { summary:');
  content = content.replace(/rawEvent:\s*\{\s*assetClass/g, 'canonicalEvent: { assetClass');
  content = content.replace(/rawEvent:\s*true/g, 'canonicalEvent: true');
  
  content = content.replace(/\.rawEvent\.headline/g, '.canonicalEvent.primaryHeadline');
  content = content.replace(/\.rawEvent\.summary/g, '.canonicalEvent.summary');
  content = content.replace(/\.rawEvent\.publishedAt/g, '.canonicalEvent.firstSeenAt');
  content = content.replace(/\.rawEvent\.assetClass/g, '.canonicalEvent.assetClass');
  content = content.replace(/\.rawEvent\.id/g, '.canonicalEvent.id');
  
  // For articleUrl which reads from rawJson
  content = content.replace(/articleUrl:\s*\(JSON\.parse\(a\.rawEvent\.rawJson\)[^,]+,/g, 'articleUrl: null,');
  // For source which doesn't exist on CanonicalEvent
  content = content.replace(/source:\s*a\.rawEvent\.source,/g, 'source: "polygon_news",');
  
  // For admin/scheduler/route.ts
  content = content.replace(/prisma\.rawEvent\.count\(\{\s*where:\s*\{\s*analysis:\s*null\s*\}\s*\}\)/g, 'prisma.canonicalEvent.count({ where: { analysis: null } })');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed:', filePath);
  }
});
