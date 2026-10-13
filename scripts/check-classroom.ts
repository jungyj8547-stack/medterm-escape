import assert from 'node:assert/strict';
import { makeTeamPlan, lessonTeams, teamStandings } from '../src/engine/classroom';

for (const [total, count] of [[31, 6], [40, 8], [4, 4], [1, 1], [200, 20]]) {
  const plan = makeTeamPlan(total, count, () => .42);
  assert.equal(plan.slots.length, total);
  assert.equal(plan.cards.length, count);
  assert.equal(plan.cards.reduce((sum, c) => sum + c.capacity, 0), total);
  assert.ok(Math.max(...plan.cards.map(c => c.capacity)) - Math.min(...plan.cards.map(c => c.capacity)) <= 1);
  for (const card of plan.cards) assert.equal(plan.slots.filter(id => id === card.id).length, card.capacity);
}
assert.throws(() => makeTeamPlan(3, 4));
assert.throws(() => makeTeamPlan(0, 1));
const a = makeTeamPlan(4, 2);
a.assignments = { alice: { teamId: 'team-1' }, bob: { teamId: 'team-1' }, cat: { teamId: 'team-2' }, dog: { teamId: 'team-2' } };
const roster = lessonTeams(a);
const board = teamStandings(roster, [
  { uid: 'alice', teamId: 'team-1', score: 2000, escaped: true, timeUsedSec: 100 },
  { uid: 'cat', teamId: 'team-2', score: 1400, escaped: true, timeUsedSec: 100 },
  { uid: 'dog', teamId: 'team-2', score: 1400, escaped: true, timeUsedSec: 100 },
  { uid: 'outsider', teamId: 'team-1', score: 2400, escaped: true, timeUsedSec: 1 },
]);
assert.equal(board[0].teamId, 'team-2');
assert.equal(board[0].average, 1400);
assert.equal(board[1].average, 1000); // incomplete Bob remains in denominator
assert.equal(board[1].completed, 1);
assert.equal(board[1].total, 2000); // another class/student cannot add points
assert.equal(teamStandings(roster, [{ uid: 'alice', teamId: 'team-2', score: 2400, escaped: true, timeUsedSec: 1 }])[0].total, 0);
assert.equal(teamStandings(roster, [{ uid: 'alice', teamId: 'team-1', score: 0, escaped: false, timeUsedSec: 2400 }])[0].completed, 0);
console.log('Classroom: balanced decks, frozen denominator, incomplete zero, membership and class isolation passed');
