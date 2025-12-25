import fs from 'fs';
import path from 'path';

// Recursively find all .tsx files
function findTsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findTsxFiles(filePath, fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const files = findTsxFiles('./src');
let totalFixed = 0;
let filesFixed = 0;

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;

  // Keep replacing until no more duplicates found
  let prevContent;
  do {
    prevContent = content;

    // Pattern to match duplicate className attributes
    // Matches: className="first" className="second"
    content = content.replace(
      /className="([^"]*)"\s+className="([^"]*)"/g,
      (match, first, second) => {
        const merged = `${first} ${second}`.trim();
        fixCount++;
        return `className="${merged}"`;
      }
    );
  } while (content !== prevContent);

  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesFixed++;
    totalFixed += fixCount;
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✓ Fixed ${fixCount} duplicate(s) in ${relativePath}`);
  }
}

console.log(`\n✅ Fixed ${totalFixed} duplicate className attributes in ${filesFixed} files`);
