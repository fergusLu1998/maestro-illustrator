"""Regression audit using a user-supplied project; no input data is copied."""
import json, sys, time
from pathlib import Path
import schrodinger_bridge as bridge

p = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
rec = p['receptors'][p.get('receptorIndex', 0)]
def restore(s):
    return bridge.restore_structure(dict(id=s['nativeId'], title=s['title'], atoms=s['atoms']))
restore(rec)
cached_key, cached = next(iter(p['interactionCache'].items()))
lig = next(s for s in p['poses'].values() if s['nativeId'] == cached_key.split('|')[1])
restore(lig)
t = time.monotonic()
result = bridge.calculate(rec['nativeId'], lig['nativeId'])
assert not result['errors'], result['errors']
def signature(pair):
    return (pair['type'], pair['a']['label'], pair['b']['label'], round(pair['distance'], 5))
assert sorted(map(signature, cached['pairs'])) == sorted(map(signature, result['pairs'])), (cached['pairs'], result['pairs'])
print(json.dumps(dict(test='cached_interaction_reproduction', pairs=len(result['pairs']), seconds=round(time.monotonic()-t, 2), hydrogens=result['hydrogens'])))
for key in ['r0', 'r1000', 'r2675']:
    s = p['poses'][key]
    restore(s)
    r = bridge.calculate(rec['nativeId'], s['nativeId'])
    assert not r['errors'], r['errors']
    print(json.dumps(dict(test='restored_pose', key=key, pairs=len(r['pairs']), types=sorted(set(x['type'] for x in r['pairs'])))))

if '--all' in sys.argv:
    total_pairs = 0
    errors = []
    started = time.monotonic()
    for i, (key, s) in enumerate(p['poses'].items(), 1):
        restore(s)
        r = bridge.calculate(rec['nativeId'], s['nativeId'])
        p['interactionCache'][rec['nativeId']+'|'+s['nativeId']] = r
        total_pairs += len(r['pairs'])
        if r['errors']: errors.append(dict(pose=key, errors=r['errors']))
        if i % 250 == 0: print(json.dumps(dict(processed=i, total=len(p['poses']))), flush=True)
    output = Path('outputs/PocketAtlas_TRPC6_verified.json')
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(p, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    report = dict(poses=len(p['poses']), pairs=total_pairs, failed=errors, seconds=round(time.monotonic()-started, 2), output=str(output))
    Path('outputs/native-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report),flush=True)
