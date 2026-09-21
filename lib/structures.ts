import { Inflate } from 'pako';
export type StructureAtom = {
  x: number;
  y: number;
  z: number;
  elem: string;
  atom: string;
  resn: string;
  resi: number;
  chain: string;
  icode?: string;
  charge: number;
  ss?: string;
  bonds: number[];
  bondOrder: number[];
};
export type Structure = {
  nativeId?: string;
  pdb?: string;
  molblock?: string;
  title: string;
  atoms: StructureAtom[];
  properties: Record<string, string>;
  sourceIndex: number;
  protein: boolean;
};
const elements =
  'X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn'.split(
    ' ',
  );
function tokens(text: string): string[] {
  return Array.from(text.matchAll(/"((?:\\.|[^"\\])*)"|([^\s]+)/g), (m) =>
    m[1] !== undefined ? m[1].replace(/\\(["\\])/g, '$1') : m[2],
  );
}
export function parsePDB(text: string): Structure[] {
  const blocks = text.includes('MODEL ')
    ? text.split(/^MODEL .*$/m).slice(1)
    : [text];
  return blocks.map((block, i) => {
    const pdb = block.split('ENDMDL')[0];
    const atoms: StructureAtom[] = pdb
      .split(/\r?\n/)
      .filter(
        (l) =>
          /^(ATOM  |HETATM)/.test(l) && [' ', 'A', ''].includes(l[16] || ''),
      )
      .map((l) => ({
        atom: l.slice(12, 16).trim(),
        elem:
          l.slice(76, 78).trim() ||
          l.slice(12, 16).trim().replace(/^\d+/, '')[0],
        resn: l.slice(17, 20).trim(),
        chain: l.slice(21, 22).trim(),
        resi: Number(l.slice(22, 26)),
        icode: l.slice(26, 27).trim(),
        x: Number(l.slice(30, 38)),
        y: Number(l.slice(38, 46)),
        z: Number(l.slice(46, 54)),
        charge: 0,
        bonds: [],
        bondOrder: [],
      }));
    if (
      !atoms.length ||
      atoms.some((a) => ![a.x, a.y, a.z].every(Number.isFinite))
    )
      throw Error('PDB 没有有效原子坐标');
    return {
      title: 'PDB model ' + (i + 1),
      pdb,
      atoms,
      sourceIndex: i + 1,
      properties: {},
      protein: true,
    };
  });
}
function table(block: string, name: string) {
  const match = block.match(
    new RegExp('\\b' + name + '\\[(\\d+)\\]\\s*\\{([\\s\\S]*?)\\}'),
  );
  if (!match) return [];
  const parts = match[2].replace(/#.*?#/g, '').split(':::');
  const fields = tokens(parts[0]),
    values = tokens(parts[1] || '');
  if (values.length !== Number(match[1]) * (fields.length + 1))
    throw Error(name + ' 表字段不完整');
  return Array.from({ length: Number(match[1]) }, (_, i) =>
    Object.fromEntries(
      ['_index', ...fields].map((f, j) => [
        f,
        values[i * (fields.length + 1) + j],
      ]),
    ),
  );
}
export function parseMaestro(text: string): Structure[] {
  if (/\bp_m_ct\s*\{/.test(text))
    throw Error(
      '此文件含部分坐标记录 p_m_ct，请先在 Maestro 导出完整结构 MAE 或 SDF。',
    );
  const out: Structure[] = [];
  const starts = Array.from(text.matchAll(/\bf_m_ct\s*\{/g));
  for (let ix = 0; ix < starts.length; ix++) {
    const block = text.slice(
      starts[ix].index! + starts[ix][0].length,
      starts[ix + 1]?.index ?? text.length,
    );
    const head = block.slice(0, block.indexOf('m_atom[')).split(':::');
    const fields = tokens(head[0].replace(/#.*?#/g, '')),
      values = tokens(head[1] || '');
    const props = Object.fromEntries(
      fields.map((f, i) => [f, values[i] === '<>' ? '' : values[i] || '']),
    );
    const source = table(block, 'm_atom');
    const atoms: StructureAtom[] = source.map((a) => ({
      x: Number(a.r_m_x_coord),
      y: Number(a.r_m_y_coord),
      z: Number(a.r_m_z_coord),
      elem: elements[Number(a.i_m_atomic_number)] || 'X',
      atom: (a.s_m_pdb_atom_name && a.s_m_pdb_atom_name !== '<>'
        ? a.s_m_pdb_atom_name
        : a.s_m_atom_name && a.s_m_atom_name !== '<>'
          ? a.s_m_atom_name
          : ''
      ).trim(),
      resn: (a.s_m_pdb_residue_name && a.s_m_pdb_residue_name !== '<>'
        ? a.s_m_pdb_residue_name
        : 'LIG'
      ).trim(),
      resi: Number(a.i_m_residue_number) || 1,
      chain: a.s_m_chain_name === '<>' ? '' : a.s_m_chain_name || '',
      icode: a.s_m_insertion_code === '<>' ? '' : a.s_m_insertion_code || '',
      charge: Number(a.i_m_formal_charge) || 0,
      bonds: [],
      bondOrder: [],
    }));
    if (
      atoms.some(
        (a) => ![a.x, a.y, a.z].every(Number.isFinite) || a.elem === 'X',
      )
    )
      throw Error('第 ' + (ix + 1) + ' 条含不支持的原子或坐标');
    for (const b of table(block, 'm_bond')) {
      const i = Number(b.i_m_from) - 1,
        j = Number(b.i_m_to) - 1,
        o = Number(b.i_m_order);
      if (!atoms[i] || !atoms[j] || ![1, 2, 3].includes(o))
        throw Error('第 ' + (ix + 1) + ' 条含不支持的键记录');
      if (!atoms[i].bonds.includes(j)) {
        atoms[i].bonds.push(j);
        atoms[i].bondOrder.push(o);
        atoms[j].bonds.push(i);
        atoms[j].bondOrder.push(o);
      }
    }
    out.push({
      title: props.s_m_title || 'Structure ' + (ix + 1),
      atoms,
      properties: props,
      sourceIndex: ix + 1,
      protein:
        atoms.filter((a) => a.atom === 'CA' && a.elem === 'C').length >= 5,
    });
  }
  if (!out.length) throw Error('未发现完整 Maestro 结构');
  return out;
}
export function toMolBlock(s: Structure): string {
  if (s.molblock) return s.molblock.split('$$$$')[0];
  const bonds = s.atoms.flatMap((a, i) =>
    a.bonds.flatMap((j, k) => (j > i ? [[i + 1, j + 1, a.bondOrder[k]]] : [])),
  );
  return [
    s.title,
    '  PocketAtlas      3D',
    '',
    '  0  0  0     0  0            999 V3000',
    'M  V30 BEGIN CTAB',
    `M  V30 COUNTS ${s.atoms.length} ${bonds.length} 0 0 0`,
    'M  V30 BEGIN ATOM',
    ...s.atoms.map(
      (a, i) =>
        `M  V30 ${i + 1} ${a.elem} ${a.x} ${a.y} ${a.z} 0${a.charge ? ' CHG=' + a.charge : ''}`,
    ),
    'M  V30 END ATOM',
    'M  V30 BEGIN BOND',
    ...bonds.map((b, i) => `M  V30 ${i + 1} ${b[2]} ${b[0]} ${b[1]}`),
    'M  V30 END BOND',
    'M  V30 END CTAB',
    'M  END',
    '',
  ].join('\n');
}
export function toPDB(s: Structure): string {
  if (s.pdb) return s.pdb;
  return (
    s.atoms
      .map(
        (a, i) =>
          `ATOM  ${String(i + 1).padStart(5)} ${a.atom.padStart(4).slice(0, 4)} ${a.resn.padStart(3).slice(0, 3)} ${a.chain.slice(0, 1) || ' '}${String(a.resi).padStart(4)}${a.icode?.slice(0, 1) || ' '}   ${a.x.toFixed(3).padStart(8)}${a.y.toFixed(3).padStart(8)}${a.z.toFixed(3).padStart(8)}  1.00  0.00          ${a.elem.padStart(2)}`,
      )
      .join('\n') + '\nEND\n'
  );
}
export async function readStructureFile(file: File): Promise<string> {
  if (file.size > 150 * 1024 * 1024) throw Error('结构文件上限为 150 MB');
  if (/\.(maegz|gz)$/i.test(file.name)) {
    const decoder = new TextDecoder();
    let text = '',
      size = 0;
    const inflate = new Inflate();
    inflate.onData = (chunk: Uint8Array) => {
      size += chunk.byteLength;
      if (size > 600 * 1024 * 1024) throw Error('解压内容超过 600 MB');
      text += decoder.decode(chunk, { stream: true });
    };
    inflate.push(new Uint8Array(await file.arrayBuffer()), true);
    if (inflate.err) throw Error('MAEGZ 解压失败：' + inflate.msg);
    return text + decoder.decode();
  }
  return file.text();
}
export function parseSDF(text: string, R: any): Structure[] {
  return text
    .split(/\$\$\$\$/)
    .filter((b) => b.trim())
    .map((block, ix) => {
      const m = R.get_mol(block);
      if (!m) throw Error('SDF 第 ' + (ix + 1) + ' 条解析失败');
      try {
        const j = JSON.parse(m.get_json()),
          molecule = j.molecules[0],
          defaults = j.defaults;
        const coords = molecule.conformers?.[0]?.coords;
        if (!coords) throw Error('SDF 第 ' + (ix + 1) + ' 条没有坐标');
        const atoms: StructureAtom[] = molecule.atoms.map(
          (a: any, i: number) => ({
            x: coords[i][0],
            y: coords[i][1],
            z: coords[i][2] || 0,
            elem: elements[a.z ?? defaults.atom.z],
            atom: '',
            resn: 'LIG',
            resi: 1,
            chain: '',
            charge: a.chg ?? 0,
            bonds: [],
            bondOrder: [],
          }),
        );
        molecule.bonds.forEach((b: any) => {
          const [i, k] = b.atoms;
          atoms[i].bonds.push(k);
          atoms[i].bondOrder.push(b.bo ?? 1);
          atoms[k].bonds.push(i);
          atoms[k].bondOrder.push(b.bo ?? 1);
        });
        const properties = Object.fromEntries(
          Array.from(block.matchAll(/>\s*<([^>]+)>[^\n]*\n([^\n]*)/g), (m) => [
            m[1],
            m[2].trim(),
          ]),
        );
        properties.SMILES = m.get_smiles();
        properties.coordinates = coords.some(
          (c: number[]) => c.length === 3 && Math.abs(c[2]) > 1e-8,
        )
          ? '3D'
          : '2D';
        return {
          title: block.trimStart().split(/\r?\n/)[0] || 'SDF ' + (ix + 1),
          atoms,
          properties,
          sourceIndex: ix + 1,
          protein: false,
        };
      } finally {
        m.delete();
      }
    });
}
