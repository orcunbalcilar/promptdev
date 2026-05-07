import { readFileSync } from 'fs';

const raw = readFileSync('coverage/coverage-final.json', 'utf8');
const data = JSON.parse(raw);
const targets = [
  'code-block.tsx', 'stack-trace.tsx', 'context.tsx', 'mic-selector.tsx',
  'persona.tsx', 'edge.tsx', 'environment-variables.tsx', 'message.tsx',
  'speech-input.tsx', 'prompt-input.tsx'
];

console.log('Total files in coverage:', Object.keys(data).length);

for (const [path, cov] of Object.entries(data)) {
  for (const t of targets) {
    // Match path ending with /ai-elements/<target> (not __tests__)
    if (path.includes('/ai-elements/' + t) && !path.includes('__tests__')) {
      const s = cov.s, b = cov.b, f = cov.f;
      const stmtTotal = Object.keys(s).length;
      const stmtHit = Object.values(s).filter(v => v > 0).length;
      const branchTotal = Object.values(b).reduce((a, c) => a + c.length, 0);
      const branchHit = Object.values(b).reduce((a, c) => a + c.filter(v => v > 0).length, 0);
      const fnTotal = Object.keys(f).length;
      const fnHit = Object.values(f).filter(v => v > 0).length;

      const sm = cov.statementMap;
      const uncovStmts = Object.keys(s).filter(k => s[k] === 0).map(k => sm[k].start.line);
      const bm = cov.branchMap;
      const uncovBranches = [];
      for (const [k, arr] of Object.entries(b)) {
        arr.forEach((v, i) => {
          if (v === 0) uncovBranches.push(bm[k].loc.start.line + ':b' + i);
        });
      }
      const fm = cov.fnMap;
      const uncovFns = Object.keys(f).filter(k => f[k] === 0).map(k => fm[k].loc.start.line);

      console.log(`\n${t}:`);
      console.log(`  Stmts: ${stmtHit}/${stmtTotal} (${(100 * stmtHit / stmtTotal).toFixed(1)}%)`);
      console.log(`  Branches: ${branchHit}/${branchTotal} (${(100 * branchHit / branchTotal).toFixed(1)}%)`);
      console.log(`  Functions: ${fnHit}/${fnTotal} (${(100 * fnHit / fnTotal).toFixed(1)}%)`);
      if (uncovStmts.length) console.log(`  Uncovered stmts: ${[...new Set(uncovStmts)].sort((a, b) => a - b).join(', ')}`);
      if (uncovBranches.length) console.log(`  Uncovered branches: ${uncovBranches.join(', ')}`);
      if (uncovFns.length) console.log(`  Uncovered fns: ${uncovFns.join(', ')}`);
    }
  }
}
