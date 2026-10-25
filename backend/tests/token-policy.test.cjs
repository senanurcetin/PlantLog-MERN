const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { getTokenLifetimeSeconds, tokenIssuer, tokenAudience } =
    require('../dist/utils/generateToken.js');
const generateToken = require('../dist/utils/generateToken.js').default;

test('JWT lifetimes are bounded and do not default to month-long sessions', () => {
    assert.equal(getTokenLifetimeSeconds(undefined), 8 * 3600);
    for (const [str, seconds] of [
        ['15m', 900], ['24h', 86400], ['8h', 28800], ['1d', 86400],
    ]) assert.equal(getTokenLifetimeSeconds(str), seconds);
    for (const bad of ['14m','25h','2d','1000d','0m','3600','30d','8 h','1w']) {
        assert.throws(() => getTokenLifetimeSeconds(bad), /JWT_EXPIRE/);
    }
});

test('signed tokens carry role and revocation version with strict API audience', () => {
    const previousSecret = process.env.JWT_SECRET;
    const previousExpiry = process.env.JWT_EXPIRE;
    try {
        process.env.JWT_SECRET = 'ci-disposable-test-key-not-used-outside-local-ci-12345';
        delete process.env.JWT_EXPIRE;
        const token = generateToken('synthetic-user', 7, 'operator');
        const claims = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'], issuer: tokenIssuer, audience: tokenAudience,
        });
        assert.equal(claims.id, 'synthetic-user');
        assert.equal(claims.ver, 7);
        assert.equal(claims.role, 'operator');
        assert.equal(claims.exp - claims.iat, 28800);
        assert.throws(() => jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'], issuer: tokenIssuer, audience: 'unrelated-api',
        }), /audience/);
        for (const value of [-1, 1.5, NaN]) {
            assert.throws(() => generateToken('synthetic-user', value, 'operator'),
                /invalid session version/);
        }
    } finally {
        if (previousSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousSecret;
        if (previousExpiry === undefined) delete process.env.JWT_EXPIRE;
        else process.env.JWT_EXPIRE = previousExpiry;
    }
});
