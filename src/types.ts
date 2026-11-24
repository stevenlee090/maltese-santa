export interface Rule {
  type: 'must' | 'mustNot';
  targetParticipantId: string;
}

export interface Participant {
  id: string;
  name: string;
  /** Gift ideas for this person (shown to their Secret Santa). */
  wishes?: string;
  rules: Rule[];
}

export type Participants = Record<string, Participant>;

/** What a giver sees once they open their envelope. */
export interface Assignment {
  from: string;
  to: string;
  wishes?: string;
}

/** Contents of the group link shared after the draw. */
export interface DrawBundle {
  v: 2;
  /** Draw id on the claim-once server. */
  id: string;
  /** Giver name → encrypted assignment. The key to open it is on the server. */
  envelopes: Record<string, string>;
  /** Organiser's note: date, budget, etc. */
  info?: string;
}

export interface SlotStatus {
  name: string;
  claimed: boolean;
}
