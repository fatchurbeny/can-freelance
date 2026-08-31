import fs from 'fs';
import path from 'path';

const COMPONENTS_DIR = path.join(process.cwd(), 'src/components');
const MAX_LINES = 300;
const MAX_BYTES = 15 * 1024; // 15KB

function scanDir(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function checkComponentSizes() {
  console.log('🔍 Checking component sizes in src/components/...\n');
  const files = scanDir(COMPONENTS_DIR);
  let oversizedCount = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    const bytes = fs.statSync(filePath).size;
    const relativePath = path.relative(process.cwd(), filePath);

    if (lines > MAX_LINES || bytes > MAX_BYTES) {
      oversizedCount++;
      console.warn(`⚠️  OVERSIZED: ${relativePath}`);
      console.warn(`   Lines: ${lines} (max ${MAX_LINES}) | Size: ${(bytes / 1024).toFixed(1)} KB (max 15.0 KB)`);
      console.warn(`   💡 Tip: Consider refactoring into micro-components!\n`);
    }
  }

  if (oversizedCount === 0) {
    console.log('✅ All components are within line and size limits!');
  } else {
    console.log(`Found ${oversizedCount} component(s) exceeding size thresholds.`);
  }
}

checkComponentSizes();
