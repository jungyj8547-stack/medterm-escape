import type { Room, Term } from '../types';

const modules = import.meta.glob('../../data/rooms/*.json', { eager: true }) as Record<
  string,
  { default: Room }
>;

export const ROOMS: Room[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.order - b.order);

export const ROOM_BY_ID: Record<string, Room> = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

export const ALL_TERMS: Term[] = ROOMS.flatMap((r) => r.terms);
export const TERM_BY_ID: Record<string, Term> = Object.fromEntries(ALL_TERMS.map((t) => [t.id, t]));

export function roomOfTerm(termId: string): Room | undefined {
  return ROOMS.find((r) => r.terms.some((t) => t.id === termId));
}

export const LEARN_MINUTES = 18;
export const ESCAPE_SECONDS = 40 * 60;
export const HINTS_PER_ROOM = 3;
