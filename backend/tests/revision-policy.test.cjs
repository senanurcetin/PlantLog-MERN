const test = require('node:test');
const assert = require('node:assert/strict');
const { parseExpectedRevision, revisionEtag } =
    require('../dist/utils/revisionPolicy.js');

test('revision preconditions are strong, bounded and never coerced', () => {
    assert.equal(parseExpectedRevision(undefined), null);
    for (const n of [0, 1, 12, 999999999]) {
        assert.equal(parseExpectedRevision(revisionEtag(n)), n);
    }
    for (const value of [
        null, 0, '"-1"', '"01"', '"1", "2"', 'W/"1"',
        '*', '1', '"1.0"', '""', '"9007199254740992"',
        '"99999999999999999999999999999"', ['"1"'], {},
    ]) assert.throws(() => parseExpectedRevision(value), /If-Match/);
});
