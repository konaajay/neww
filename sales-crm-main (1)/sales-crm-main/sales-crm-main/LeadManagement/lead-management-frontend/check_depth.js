
const fs = require('fs');
const content = fs.readFileSync('src/pages/ManagerDashboard.jsx', 'utf8');

let depth = 0;
let maxDepth = 0;
const lines = content.split('\n');

lines.forEach((line, i) => {
  const opens = (line.match(/<div/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  const oldDepth = depth;
  depth += opens - closes;
  if (depth > maxDepth) maxDepth = depth;
  
  if (depth < 0) {
    console.log(`Error: Extra closing tag at line ${i + 1}: depth becomes ${depth}`);
    console.log(`Line content: ${line.trim()}`);
    depth = 0; // Reset to continue searching
  }
});

console.log(`Final depth: ${depth}`);
console.log(`Max depth: ${maxDepth}`);
