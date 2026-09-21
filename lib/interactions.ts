import type { Structure, StructureAtom } from './structures';
import type { InteractionResult, Interaction } from './local-engine';

export const interactionKinds: Record<string, [string, string]> = {
  hbond: ['氢键', '#1783bd'],
  halogen: ['卤键', '#9861c7'],
  salt: ['盐桥', '#e35959'],
  pipi: ['π–π', '#d49422'],
  pication: ['π–阳离子', '#299c78'],
  contact: ['几何近接', '#7b8fa0'],
};
export const residueKey = (
  a: Pick<StructureAtom, 'chain' | 'resn' | 'resi'> & { icode?: string },
) =>
  `${a.chain || '_'}:${a.resn.toUpperCase()}${a.resi}${a.icode?.trim() || ''}`;
export function endpointResidue(p: Interaction['a']) {
  return p.label.split(':').slice(0, 2).join(':');
}
export function interactionKey(
  protein: Structure | null | undefined,
  ligand: Structure | null | undefined,
) {
  return protein?.nativeId && ligand?.nativeId
    ? protein.nativeId + '|' + ligand.nativeId
    : '';
}
export type InteractionState = 'yes' | 'no' | 'unknown';
export function residueInteractionState(
  result: InteractionResult | undefined,
  residues: string[],
  kind = 'all',
  match = 'any',
): InteractionState {
  if (!result) return 'unknown';
  const pairs = result.pairs.filter(
    (p) => p.type !== 'contact' && (kind === 'all' || p.type === kind),
  );
  const hits = residues.map((residue) =>
    pairs.some((p) => endpointResidue(p.a) === residue),
  );
  if (
    residues.length &&
    (match === 'all' ? hits.every(Boolean) : hits.some(Boolean))
  )
    return 'yes';
  // A failed type is unknown, never evidence of a negative interaction.
  if (result.errors.some((e) => kind === 'all' || e.startsWith(kind + ':')))
    return 'unknown';
  return 'no';
}
