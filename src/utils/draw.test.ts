import { describe, expect, it } from 'vitest';
import { sealDraw, openEnvelope } from './links';
import { randomToken } from './crypto';
import { Participant } from '../types';

const names = ['Haley', 'Baihan', 'David', 'Millie', 'Murphy', 'Steven'];

function people(): Record<string, Participant> {
  return Object.fromEntries(names.map((name, i) => [`id${i}`, {
    id: `id${i}`, name, wishes: `${name} likes Maltese`, rules: [],
  }]));
}

describe('sealDraw', () => {
  it('seals one envelope per giver that only its own key opens', async () => {
    const sealed = await sealDraw(people(), 'A$30', 'draw1');
    if (typeof sealed === 'string') throw new Error(sealed);

    expect(Object.keys(sealed.bundle.envelopes).sort()).toEqual([...names].sort());
    // The link must not contain keys.
    expect(JSON.stringify(sealed.bundle)).not.toContain(sealed.keys.Haley);

    const receivers = new Set<string>();
    for (const name of names) {
      const assignment = (await openEnvelope(sealed.bundle, name, sealed.keys[name]))!;
      expect(assignment.from).toBe(name);
      expect(assignment.to).not.toBe(name);
      expect(assignment.wishes).toBe(`${assignment.to} likes Maltese`);
      receivers.add(assignment.to);
    }
    expect(receivers.size).toBe(names.length);

    // Someone else's key, or a random key, opens nothing.
    expect(await openEnvelope(sealed.bundle, 'Haley', sealed.keys.Steven)).toBeNull();
    expect(await openEnvelope(sealed.bundle, 'Haley', randomToken())).toBeNull();
  });

  it('rejects duplicate names and tiny groups', async () => {
    const dup = people();
    dup.id1.name = 'haley';
    expect(await sealDraw(dup, '', 'x')).toBe('duplicateNames');
    expect(await sealDraw({ a: { id: 'a', name: 'A', rules: [] }, b: { id: 'b', name: 'B', rules: [] } }, '', 'x'))
      .toBe('needMoreParticipants');
  });
});
