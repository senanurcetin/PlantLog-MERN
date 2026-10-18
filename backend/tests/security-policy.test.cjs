const test = require('node:test');
const assert = require('node:assert/strict');
const { InvalidPayloadError, sanitizeRegistration, pickAssetUpdate, pickLogUpdate } =
    require('../dist/utils/inputPolicy.js');
const { getJwtSecret } = require('../dist/utils/jwtSecret.js');

test('public registration creates only operators', () => {
    const user = sanitizeRegistration({ name: ' Demo ', email: ' PERSON@EXAMPLE.COM ',
        password: 'a-long-unique-password' });
    assert.equal(user.role, 'operator');
    assert.equal(user.email, 'person@example.com');
});
test('self-assigned admin and supervisor roles are rejected', () => {
    for (const role of ['admin', 'supervisor']) {
        assert.throws(() => sanitizeRegistration({ name: 'Demo', email: 'demo@example.com',
            password: 'a-long-unique-password', role }), InvalidPayloadError);
    }
});
test('invalid registration bodies and weak passwords are rejected', () => {
    assert.throws(() => sanitizeRegistration(null), InvalidPayloadError);
    assert.throws(() => sanitizeRegistration({ name: 'Demo', email: 'a@b.co',
        password: '123456' }), InvalidPayloadError);
});
test('asset update allows valid status and location', () => {
    assert.deepEqual(pickAssetUpdate({ status: 'maintenance', location: 'Bay 1' }),
        { status: 'maintenance', location: 'Bay 1' });
});
test('asset ownership and Mongo operator injection are rejected', () => {
    for (const body of [{ createdBy: 'other' }, { $set: { createdBy: 'other' } },
        { 'createdBy.role': 'admin' }, {}, []]) {
        assert.throws(() => pickAssetUpdate(body), InvalidPayloadError);
    }
});
test('log author and asset reassignment are rejected', () => {
    for (const body of [{ author: 'other' }, { asset: 'other' },
        { $inc: { hoursOperated: 1000 } }, { 'author.role': 'admin' }]) {
        assert.throws(() => pickLogUpdate(body), InvalidPayloadError);
    }
});
test('log status updates remain supported', () => {
    assert.deepEqual(pickLogUpdate({ status: 'resolved' }), { status: 'resolved' });
});
test('metric patches reject unsupported and nonfinite values', () => {
    for (const metrics of [{ unexpected: 1 }, { temperature: 'high' },
        { pressure: Infinity }, { hoursOperated: NaN }, ['bad']]) {
        assert.throws(() => pickLogUpdate({ metrics }), InvalidPayloadError);
    }
    assert.deepEqual(pickLogUpdate({ metrics: { temperature: 42.5 } }),
        { metrics: { temperature: 42.5 } });
});
test('JWT signing requires an explicit non-placeholder secret', () => {
    const previous = process.env.JWT_SECRET;
    try {
        for (const value of [undefined, 'short',
            'supersecretjwtkey_replace_in_production', 'replace-with-a-long-random-secret']) {
            if (value === undefined) delete process.env.JWT_SECRET;
            else process.env.JWT_SECRET = value;
            assert.throws(getJwtSecret);
        }
        process.env.JWT_SECRET = 'this-is-a-unique-test-only-signing-secret-12345';
        assert.equal(getJwtSecret(), process.env.JWT_SECRET);
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
});
