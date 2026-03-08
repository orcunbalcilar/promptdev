#!/usr/bin/env python3
import json

with open('coverage/coverage-summary.json') as f:
    data = json.load(f)

gaps = []
for path, cov in data.items():
    if path == 'total':
        continue
    lines = cov.get('lines', {})
    branches = cov.get('branches', {})
    functions = cov.get('functions', {})
    stmts = cov.get('statements', {})
    pct_l = lines.get('pct', 100)
    pct_b = branches.get('pct', 100)
    pct_f = functions.get('pct', 100)
    pct_s = stmts.get('pct', 100)
    if pct_l < 100 or pct_b < 100 or pct_f < 100 or pct_s < 100:
        short = path.replace('/Users/orcun/projects/promptdev/promptdev-frontend/', '')
        uncov_l = lines.get('total', 0) - lines.get('covered', 0)
        uncov_b = branches.get('total', 0) - branches.get('covered', 0)
        uncov_f = functions.get('total', 0) - functions.get('covered', 0)
        gaps.append((uncov_l + uncov_b + uncov_f, short, pct_l, pct_b, pct_f, uncov_l, uncov_b, uncov_f))

gaps.sort(reverse=True)
print(f'Total gaps: {len(gaps)} files')
print(f'Sum uncovered: L={sum(g[5] for g in gaps)}, B={sum(g[6] for g in gaps)}, F={sum(g[7] for g in gaps)}')
print()
for total, path, pl, pb, pf, ul, ub, uf in gaps:
    print(f'  {path}: L={pl}%({ul}uncov) B={pb}%({ub}uncov) F={pf}%({uf}uncov)')
