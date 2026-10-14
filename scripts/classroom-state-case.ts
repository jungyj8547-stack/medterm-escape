import assert from 'node:assert/strict';
import { useGame } from '../src/store/gameStore';
const game = useGame.getState;
game().resetAll();
const original = { unlocked: game().unlocked, bestResults: game().bestResults, learnedRooms: game().learnedRooms, weak: game().weak };
assert.equal(game().unlocked.includes('r2'), false);
game().startLesson('r2', { id: 'class-A-round-1', classId: 'A', teamId: 'team-1', teamName: '토끼팀' });
assert.equal(game().session?.roomId, 'r2'); // class entry bypasses personal lock without unlocking it
game().markSeen('r2-01', false);
game().startEscape();
assert.deepEqual(game().session?.weakSnapshot, ['r2-01']);
game().addWrong('r2-02');
game().clearWeak('r2-01');
assert.equal(game().session?.classWeak?.includes('r2-01'), false);
assert.deepEqual(game().weak, original.weak); // classroom review never clears personal review data
for (const p of ['chart', 'monitor', 'locker', 'records'] as const) game().solvePuzzle(p);
assert.equal(game().keypadAttempt('1234', '1234'), true);
assert.equal(game().session?.result?.escaped, true);
assert.deepEqual(game().unlocked, original.unlocked);
assert.deepEqual(game().bestResults, original.bestResults);
assert.deepEqual(game().learnedRooms, original.learnedRooms);
assert.deepEqual(game().weak, original.weak);
game().startRoom('r1');
game().startEscape();
assert.equal(game().keypadAttempt('1111', '1111'), true);
assert.equal(game().unlocked.includes('r2'), true); // original personal progression remains
assert.equal(game().bestResults.r1.escaped, true);
const backup = game().exportProgress();
assert.equal(game().importProgress(backup), true);
for (const invalid of [{v:1,unlocked:[null]}, {v:1,unlocked:['r1'],bestResults:'bad'}, {v:1,unlocked:['r1'],bestResults:{r1:{roomId:'r1',score:1,stars:999999,escaped:true,timeUsedSec:0}}}, {v:1,unlocked:['r1'],weak:[]}, {v:1,unlocked:['r1'],allUnlocked:'false'}]) {
  assert.equal(game().importProgress(JSON.stringify(invalid)), false);
  assert.equal(game().exportProgress(), backup);
}
console.log('Classroom state: locked-room entry, separate weak/score/progression, original solo progression passed');
