const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const zustand = require('zustand');

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((success, failure) => {
        resolve = success;
        reject = failure;
    });
    return { promise, resolve, reject };
}

function loadStore(file, mockImports) {
    const source = readFileSync(path.join(__dirname, '../src/store/', file), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mod = { exports: {} };
    const localRequire = (name) => {
        if (Object.prototype.hasOwnProperty.call(mockImports, name)) return mockImports[name];
        return require(name);
    };
    new Function('require', 'module', 'exports', compiled)(
        localRequire, mod, mod.exports,
    );
    return mod.exports;
}

function fixture() {
    const pending = [];
    const fakeApi = {
        get(url) { const request = deferred(); pending.push({ url, ...request }); return request.promise; },
        post(url) { const request = deferred(); pending.push({ url, ...request }); return request.promise; },
        put(url) { const request = deferred(); pending.push({ url, ...request }); return request.promise; },
        delete(url) { const request = deferred(); pending.push({ url, ...request }); return request.promise; },
    };
    const authModule = loadStore('authStore.ts', {
        zustand, 'zustand/middleware': { persist: (initializer) => initializer },
    });
    const shared = {
        zustand,
        './authStore': authModule,
        '../services/api': { default: fakeApi },
    };
    const assetModule = loadStore('assetStore.ts', shared);
    const logModule = loadStore('logStore.ts', shared);
    return { auth: authModule.useAuthStore, assets: assetModule.useAssetStore,
        logs: logModule.useLogStore, pending };
}

test('logout clears registry caches and older responses cannot populate a new session', async () => {
    const f = fixture();
    f.auth.getState().setCredentials({ _id: 'a', name: 'A', role: 'operator' }, 'token-A');
    const oldAssets = f.assets.getState().fetchAssets();
    const oldLogs = f.logs.getState().fetchLogs('equipment-A');
    assert.equal(f.pending.length, 2);
    f.auth.getState().logout();
    assert.deepEqual(f.assets.getState().assets, []);
    assert.deepEqual(f.logs.getState().logs, []);
    assert.equal(f.assets.getState().isLoading, false);
    assert.equal(f.logs.getState().isLoading, false);

    f.auth.getState().setCredentials({ _id: 'b', name: 'B', role: 'operator' }, 'token-B');
    const newAssets = f.assets.getState().fetchAssets();
    const newLogs = f.logs.getState().fetchLogs('equipment-B');
    f.pending[0].resolve({ data: [{ _id: 'private-A' }] });
    f.pending[1].resolve({ data: [{ _id: 'log-A' }] });
    await Promise.all([oldAssets, oldLogs]);
    assert.deepEqual(f.assets.getState().assets, []);
    assert.deepEqual(f.logs.getState().logs, []);

    f.pending[2].resolve({ data: [{ _id: 'asset-B' }] });
    f.pending[3].resolve({ data: [{ _id: 'log-B' }] });
    await Promise.all([newAssets, newLogs]);
    assert.deepEqual(f.assets.getState().assets.map(x => x._id), ['asset-B']);
    assert.deepEqual(f.logs.getState().logs.map(x => x._id), ['log-B']);
    f.auth.getState().logout();
    assert.deepEqual(f.assets.getState().assets, []);
    assert.deepEqual(f.logs.getState().logs, []);
});

test('newer asset and log filters win when API responses arrive out of order', async () => {
    const f = fixture();
    f.auth.getState().setCredentials({ _id: 'a' }, 'token-A');
    const firstAssets = f.assets.getState().fetchAssets();
    const latestAssets = f.assets.getState().fetchAssets();
    const firstLogs = f.logs.getState().fetchLogs('asset-one');
    const latestLogs = f.logs.getState().fetchLogs('asset-two');
    assert.equal(f.pending[2].url, '/logs?assetId=asset-one');
    assert.equal(f.pending[3].url, '/logs?assetId=asset-two');

    f.pending[1].resolve({ data: [{ _id: 'latest-asset' }] });
    f.pending[3].resolve({ data: [{ _id: 'latest-log' }] });
    await Promise.all([latestAssets, latestLogs]);
    f.pending[0].resolve({ data: [{ _id: 'stale-asset' }] });
    f.pending[2].resolve({ data: [{ _id: 'stale-log' }] });
    await Promise.all([firstAssets, firstLogs]);
    assert.equal(f.assets.getState().assets[0]._id, 'latest-asset');
    assert.equal(f.logs.getState().logs[0]._id, 'latest-log');
});

test('a mutation finishing after account switch cannot change the new registry', async () => {
    const f = fixture();
    f.auth.getState().setCredentials({ _id: 'a' }, 'token-A');
    const oldWrite = f.assets.getState().addAsset({ name: 'Operator A asset' });
    f.auth.getState().setCredentials({ _id: 'b' }, 'token-B');
    f.pending[0].resolve({ data: { _id: 'a-private-asset' } });
    await oldWrite;
    assert.deepEqual(f.assets.getState().assets, []);
    assert.equal(f.assets.getState().isLoading, false);
});
