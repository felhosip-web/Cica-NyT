const fs = require('fs');

const file = fs.readFileSync('src/components/CatDetailModal.tsx', 'utf-8');
const lines = file.split('\n');

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('export const CatDetailModal')) {
    console.log(`Component starts at line: ${i+1}`);
  }
}
