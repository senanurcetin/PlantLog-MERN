const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../dist/models/User.js').default;
const Asset = require('../dist/models/Asset.js').default;

test('Mongoose user schema accepts the same long-TLD addresses as HTTP registration', () => {
    const user = new User({
        name: 'Synthetic Reviewer',
        email: 'REVIEWER@EXAMPLE.TECHNOLOGY',
        password: 'test-only-strong-password',
    });
    assert.equal(user.validateSync(), undefined);
    assert.equal(user.email, 'reviewer@example.technology');

    for (const address of ['missing-at', 'reviewer@example', 'bad name@example.org',
        'a'.repeat(255) + '@example.org']) {
        const invalid = new User({
            name: 'Synthetic Reviewer', email: address,
            password: 'test-only-strong-password',
        });
        assert.ok(invalid.validateSync()?.errors.email, address);
    }
});

test('Mongoose asset identity uses an explicit casefold unique database index', () => {
    const serialIndexes = Asset.schema.indexes().filter(([keys]) =>
        Object.keys(keys).length === 1 && keys.serialNumber === 1);
    assert.equal(serialIndexes.length, 1);
    const [keys, options] = serialIndexes[0];
    assert.deepEqual(keys, { serialNumber: 1 });
    assert.equal(options.unique, true);
    assert.equal(options.name, 'serial_number_unique_casefold');
    assert.deepEqual(options.collation, { locale: 'en', strength: 2 });
    assert.equal(Asset.schema.path('serialNumber').options.unique, undefined,
        'Do not create a second, weaker case-sensitive uniqueness index');
});
