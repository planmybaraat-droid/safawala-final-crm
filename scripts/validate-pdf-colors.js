#!/usr/bin/env node
/**
 * PDF Color Validation Script
 * Checks for hardcoded colors in PDF service files
 */

const fs = require('fs');
const path = require('path');

const COLORS_TO_CHECK = [
  { pattern: /setFillColor\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, name: 'Direct RGB setFillColor' },
  { pattern: /setDrawColor\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, name: 'Direct RGB setDrawColor' },
  { pattern: /setTextColor\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/, name: 'Direct RGB setTextColor' },
  { pattern: /\(\s*255\s*,\s*253\s*,\s*240\s*\)/, name: 'Light gold/yellow (255, 253, 240)' },
  { pattern: /\(\s*220\s*,\s*38\s*,\s*38\s*\)/, name: 'Red color (220, 38, 38)' },
];

const FILES_TO_CHECK = [
  'lib/pdf/pdf-service.ts',
  'lib/pdf/pdf-service-modern.ts',
  'lib/pdf/prepare-quote-pdf.ts',
];

console.log('🔍 PDF Color Validation Report');
console.log('═══════════════════════════════════════════\n');

let totalIssues = 0;
const issuesByFile = {};

FILES_TO_CHECK.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}\n`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    COLORS_TO_CHECK.forEach(colorCheck => {
      if (colorCheck.pattern.test(line)) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          type: colorCheck.name
        });
        totalIssues++;
      }
    });
  });

  if (issues.length > 0) {
    issuesByFile[filePath] = issues;
    console.log(`📄 ${filePath}`);
    console.log(`   Found ${issues.length} hardcoded color(s):\n`);
    
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.type}`);
      console.log(`   Code: ${issue.content}`);
      console.log('');
    });
  } else {
    console.log(`✅ ${filePath} - No hardcoded colors found\n`);
  }
});

console.log('═══════════════════════════════════════════');
console.log(`\n📊 Summary: ${totalIssues} hardcoded color(s) found in ${Object.keys(issuesByFile).length} file(s)\n`);

if (totalIssues > 0) {
  console.log('🎯 Recommendations:');
  console.log('   • Replace hardcoded RGB values with this.colors.primary or this.colors.secondary');
  console.log('   • Use this.colors.white for white backgrounds');
  console.log('   • Use this.colors.lightGray for light backgrounds');
  console.log('   • Use this.colors.lightCream for cream backgrounds');
  console.log('   • Avoid using colors that are not in the branding palette\n');
  process.exit(1);
} else {
  console.log('✅ All colors are using branding palette!\n');
  process.exit(0);
}
