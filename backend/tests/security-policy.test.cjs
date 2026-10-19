const test = require('node:test');
const assert = require('node:assert/strict');
const { InvalidPayloadError, sanitizeRegistration, sanitizeLogin, sanitizeLogCreation, sanitizeAssetCreation, pickAssetUpdate, pickLogUpdate } =
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
test('registration and login share email validity requirements', () => {
    for (const email of ['missing-at-sign', 'not@valid', ' bad name@example.org ',
        'x'.repeat(255) + '@example.org', '', 42]) {
        assert.throws(() => sanitizeRegistration({
            name: 'Valid Person', email, password: 'valid-demo-password-123',
        }), InvalidPayloadError);
    }
    assert.equal(sanitizeRegistration({
        name: 'Valid Person', email: ' PERSON@Example.Org ',
        password: 'valid-demo-password-123',
    }).email, 'person@example.org');
});

test('registration refuses unrecognized attributes and bcrypt-truncated passwords', () => {
    const valid = {
        name: 'Valid Person', email: 'person@example.org',
        password: 'valid-demo-password-123',
    };
    for (const bad of [
        { ...valid, isActive: true }, { ...valid, _id: 'spoof' },
        { ...valid, role: 'supervisor' }, { ...valid, 'role.kind': 'admin' },
        { ...valid, password: 'X'.repeat(73) },
        { ...valid, password: 'é'.repeat(40) },
        { ...valid, name: 'A'.repeat(101) },
    ]) assert.throws(() => sanitizeRegistration(bad), InvalidPayloadError);
    assert.equal(sanitizeRegistration(valid).role, 'operator');
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

test('login rejects Mongo selector payloads and non-string passwords', () => {
    for (const body of [
        { email: { $ne: null }, password: 'something' },
        { email: ['a@example.com'], password: 'something' },
        { email: 'a@example.com', password: { $gt: '' } },
        { email: '', password: 'something' },
        { email: 'a@example.com', password: '' },
        { email: 'a@example.com', password: 'x'.repeat(1025) },
        null,
    ]) assert.throws(() => sanitizeLogin(body), InvalidPayloadError);
    assert.deepEqual(sanitizeLogin({ email: '  USER@Example.Com ', password: 'some-secret' }), {
        email: 'user@example.com', password: 'some-secret',
    });
});

test('log creation accepts only editable fields and validates metric types', () => {
    assert.deepEqual(sanitizeLogCreation({
        assetId: ' 507f1f77bcf86cd799439011 ', type: 'maintenance',
        title: ' Inspect belt ', description: ' Check alignment ', status: 'open',
        metrics: { temperature: 42 },
    }), {
        assetId: '507f1f77bcf86cd799439011', type: 'maintenance',
        title: 'Inspect belt', description: 'Check alignment',
        metrics: { temperature: 42 },
    });
    for (const body of [
        null, [], {}, { assetId: 'x', type: 'incident', title: 'a', description: 'b', author: 'attacker' },
        { assetId: 'x', type: 'incident', title: 'a', description: 'b', reportedAt: '2001-01-01' },
        { assetId: 'x', type: 'incident', title: 'a', description: 'b', statusHistory: [] },
        { assetId: 'x', type: 'incident', title: 'a', description: 'b', $set: { status: 'resolved' } },
        { assetId: {}, type: 'incident', title: 'a', description: 'b' },
        { assetId: 'x', type: { $ne: null }, title: 'a', description: 'b' },
        { assetId: 'x', type: 'incident', title: ' ', description: 'b' },
        { assetId: 'x', type: 'incident', title: 'a', description: 'b', status: 'resolved' },
        { assetId: 'x', type: 'incident', title: 'a', description: 'b', metrics: { temperature: 'warm' } },
    ]) {
        assert.throws(() => sanitizeLogCreation(body), InvalidPayloadError);
    }
});

test('asset creation normalizes strings and enforces operational initial status', () => {
    assert.deepEqual(sanitizeAssetCreation({
        name: '  CNC Mill  ', serialNumber: ' CNC-001 ', category: 'machinery',
        location: ' Bay A ', status: 'operational', purchaseDate: '2024-02-29',
    }), {
        name: 'CNC Mill', serialNumber: 'CNC-001', category: 'machinery',
        location: 'Bay A', status: 'operational',
        purchaseDate: new Date('2024-02-29T00:00:00.000Z'),
    });
    const withoutOptional = sanitizeAssetCreation({
        name: 'Conveyor', serialNumber: 'CONV-002',
        category: 'equipment', location: 'Packing',
    });
    assert.equal(withoutOptional.status, 'operational');
    assert.equal(withoutOptional.purchaseDate, undefined);
});
test('asset creation rejects forged owner, operator payloads and non-operational initial states', () => {
    const valid = { name: 'Pump', serialNumber: 'P-001',
        category: 'equipment', location: 'Station 1' };
    for (const body of [
        null, [], {}, { ...valid, createdBy: 'attacker' },
        { ...valid, _id: 'fake' }, { ...valid, 'createdBy.role': 'admin' },
        { ...valid, $set: { status: 'maintenance' } },
        { ...valid, status: 'maintenance' }, { ...valid, status: 'decommissioned' },
        { ...valid, name: { $gt: '' } }, { ...valid, location: ['Bay'] },
        { ...valid, serialNumber: '' }, { ...valid, category: { $ne: null } },
        { ...valid, category: 'other-kind' }, { ...valid, purchaseDate: '2025-02-29' },
        { ...valid, purchaseDate: 123456 }, { ...valid, purchaseDate: '2024-12-01T00:00:00Z' },
        { ...valid, name: 'n'.repeat(121) }, { ...valid, serialNumber: 'n'.repeat(101) },
    ]) assert.throws(() => sanitizeAssetCreation(body), InvalidPayloadError);
});
