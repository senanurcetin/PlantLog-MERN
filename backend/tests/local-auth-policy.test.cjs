const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalAuthRateLimit } = require('../dist/middlewares/authRateLimit.js');
const { isSelfRegistrationEnabled } = require('../dist/utils/registrationPolicy.js');

test('rate limiter blocks excess attempts, emits Retry-After and resets on window expiry', () => {
    let current = 1000;
    const limiter = createLocalAuthRateLimit(2, 5000, () => current);
    let passed = 0;
    const request = { socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': 'untrusted-ip' } };
    const result = { code: 200, headers: {}, body: null };
    const response = {
        setHeader(name, value) { result.headers[name] = value; },
        status(code) { result.code = code; return this; },
        json(data) { result.body = data; return this; },
    };
    limiter(request, response, () => passed++);
    limiter(request, response, () => passed++);
    assert.equal(passed, 2);
    limiter(request, response, () => passed++);
    assert.equal(passed, 2);
    assert.equal(result.code, 429);
    assert.equal(result.headers['Retry-After'], '5');
    assert.match(result.body.message, /Too many authentication requests/);
    current += 5000;
    limiter(request, response, () => passed++);
    assert.equal(passed, 3);
});
test('registration is opt-in in production and can be explicitly disabled', () => {
    const previousNode = process.env.NODE_ENV;
    const previousSetting = process.env.REGISTRATION_ENABLED;
    try {
        process.env.NODE_ENV = 'production';
        delete process.env.REGISTRATION_ENABLED;
        assert.equal(isSelfRegistrationEnabled(), false);
        process.env.REGISTRATION_ENABLED = 'true';
        assert.equal(isSelfRegistrationEnabled(), true);
        process.env.REGISTRATION_ENABLED = 'false';
        assert.equal(isSelfRegistrationEnabled(), false);
        process.env.NODE_ENV = 'development';
        delete process.env.REGISTRATION_ENABLED;
        assert.equal(isSelfRegistrationEnabled(), true);
    } finally {
        if (previousNode === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNode;
        if (previousSetting === undefined) delete process.env.REGISTRATION_ENABLED;
        else process.env.REGISTRATION_ENABLED = previousSetting;
    }
});
