const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('apps/web/src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/bg-\[#131315\]/g, 'bg-card/50');
    content = content.replace(/bg-\[#1f1f22\]/g, 'bg-card');
    content = content.replace(/bg-\[#252528\]/g, 'bg-accent');
    content = content.replace(/bg-\[#2c2c2f\]/g, 'bg-secondary');
    
    // borders
    content = content.replace(/border-\[#48474a\]\/\d+/g, 'border-border');
    content = content.replace(/border-\[#48474a\]/g, 'border-border');
    
    // rings
    content = content.replace(/ring-\[#48474a\]\/\d+/g, 'ring-border');
    content = content.replace(/ring-\[#48474a\]/g, 'ring-border');

    // texts
    content = content.replace(/text-\[#acaaad\]/g, 'text-muted-foreground');
    content = content.replace(/text-\[#767577\]/g, 'text-muted-foreground/50');
    content = content.replace(/placeholder-\[#767577\]\/\d+/g, 'placeholder-muted-foreground/50');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated:', filePath);
    }
  }
});
