import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('No Legacy Branding Verification', () => {
  it('ensures no references to E-Cell, SVNIT, Surat, RMS, ECEL, or PSYCH remain in project files', () => {
    const legacyRegex = /e-?cell|svnit|surat|\brms\b|\becel\b|psych/i;
    const allowedExtensions = new Set(['.ts', '.tsx', '.css', '.html', '.md']);

    function collectFiles(dir: string): string[] {
      let results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(collectFiles(fullPath));
        } else if (allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const filesToCheck = [
      ...collectFiles('src'),
      'index.html',
      'README.md',
      '.env.example',
      'tailwind.config.js',
      'package.json',
    ];

    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of filesToCheck) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (legacyRegex.test(line)) {
          violations.push({
            file: filePath.replace(/\\/g, '/'),
            line: index + 1,
            match: line.trim(),
          });
        }
      });
    }

    const failureMessage = violations
      .map((v) => `${v.file}:${v.line} -> ${v.match}`)
      .join('\n');

    expect(
      violations,
      `Found legacy branding matches in the following files:\n${failureMessage}`,
    ).toEqual([]);
  });
});

