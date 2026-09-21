/* Murcko ring-and-linker core; retain terminal atoms double bonded to the core.
   Acyclic compounds fall back to their full molecular fingerprint, explicitly labelled. */
(function (root) {
  const symbols =
    'X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe'.split(
      ' ',
    );
  root.Scaffolds = {
    get(R, mol, generic) {
      const doc = JSON.parse(mol.get_json()),
        m = doc.molecules[0],
        defaults = doc.defaults;
      const atoms = m.atoms.map((a) => ({ ...defaults.atom, ...a })),
        bonds = m.bonds.map((b) => ({ ...defaults.bond, ...b }));
      const adj = atoms.map(() => []);
      bonds.forEach((b, k) => {
        adj[b.atoms[0]].push(k);
        adj[b.atoms[1]].push(k);
      });
      const keep = atoms.map((a) => a.z !== 1);
      let changed = true;
      while (changed) {
        changed = false;
        const remove = [];
        keep.forEach((v, i) => {
          if (
            v &&
            adj[i].filter((k) => bonds[k].atoms.every((j) => keep[j])).length <
              2
          )
            remove.push(i);
        });
        remove.forEach((i) => {
          keep[i] = false;
          changed = true;
        });
      }
      if (!keep.some(Boolean)) return { smiles: '', mol: null };
      const core = [...keep];
      bonds.forEach((b) => {
        if (b.bo === 2) {
          const [a, c] = b.atoms;
          if (core[a] && !core[c] && adj[c].length === 1) keep[c] = true;
          if (core[c] && !core[a] && adj[a].length === 1) keep[a] = true;
        }
      });
      const map = new Map(),
        selected = [];
      keep.forEach((k, i) => {
        if (k) {
          map.set(i, selected.length + 1);
          selected.push(i);
        }
      });
      const bs = bonds.filter((b) => b.atoms.every((a) => keep[a]));
      const block = [
        'Scaffold',
        '  PocketAtlas',
        '',
        '  0  0  0     0  0            999 V3000',
        'M  V30 BEGIN CTAB',
        `M  V30 COUNTS ${selected.length} ${bs.length} 0 0 0`,
        'M  V30 BEGIN ATOM',
        ...selected.map(
          (i, k) =>
            `M  V30 ${k + 1} ${generic ? 'C' : symbols[atoms[i].z]} 0 0 0 0${!generic && atoms[i].chg ? ' CHG=' + atoms[i].chg : ''}`,
        ),
        'M  V30 END ATOM',
        'M  V30 BEGIN BOND',
        ...bs.map(
          (b, k) =>
            `M  V30 ${k + 1} ${generic ? 1 : b.bo} ${map.get(b.atoms[0])} ${map.get(b.atoms[1])}`,
        ),
        'M  V30 END BOND',
        'M  V30 END CTAB',
        'M  END',
      ].join('\n');
      const scaffold = R.get_mol(block);
      if (!scaffold) throw Error('骨架生成失败');
      return { smiles: scaffold.get_smiles(), mol: scaffold };
    },
  };
})(typeof self !== 'undefined' ? self : globalThis);
