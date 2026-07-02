const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if(!file.includes('node_modules') && !file.includes('.git')) {
        walk(file, files);
      }
    } else {
      files.push(file);
    }
  }
  return files;
}

const allFiles = walk(__dirname);

let foundIssues = false;

console.log("--- Analyzing HTML Files ---");
allFiles.filter(f => f.endsWith('.html')).forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hrefs = [...content.matchAll(/href=["']([^"']+)["']/g)];
  
  hrefs.forEach(match => {
    const url = match[1];
    if (
      !url.startsWith('http') && 
      !url.startsWith('mailto') && 
      !url.startsWith('tel') && 
      !url.startsWith('#') &&
      !url.endsWith('.html') && 
      !url.endsWith('.css') && 
      !url.endsWith('.js') && 
      !url.endsWith('/') &&
      url !== ''
    ) {
      console.log(`[${path.basename(file)}] Potential broken link: ${url}`);
      foundIssues = true;
    }
  });
});

console.log("\n--- Analyzing JS Files ---");
allFiles.filter(f => f.endsWith('.js')).forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const locs = [...content.matchAll(/location\.href\s*=\s*['"]([^"']+)['"]/g)];
  
  locs.forEach(match => {
    const url = match[1];
    if (!url.startsWith('http') && !url.endsWith('.html') && url !== '/') {
      console.log(`[${path.basename(file)}] Potential bad location redirect: ${url}`);
      foundIssues = true;
    }
  });
});

if(!foundIssues) console.log("No obvious linking issues found.");
