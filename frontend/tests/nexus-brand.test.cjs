const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const contents = (file) => readFileSync(path.join(root, file), 'utf8');
const officialSources = [
    ['src/assets/nexus-logo.svg', '143788fc114348b03bcef5285c134d63135bd7dbd908380e973596f743c9f45b'],
    ['src/assets/nexus-mark.svg', '62b6f2a3b306b4c969098f92dfb578ef7ca20373b202872782c70ec8e1dd1dbe'],
    ['src/assets/nexus-midnight.svg', 'c31c9df29384ea3d75587a757a7b28386e66e41c1b52ce072887df1cbf00d6bd'],
    ['public/nexus-mark.svg', '62b6f2a3b306b4c969098f92dfb578ef7ca20373b202872782c70ec8e1dd1dbe'],
];

test('official NEXUS 2.0 Drive-exported SVG identity is unmodified', () => {
    for (const [file, hash] of officialSources) {
        // Git on Windows may check out SVG text as CRLF. Compare the
        // canonical LF representation so legitimate line-ending conversion
        // does not invalidate the original approved Drive content.
        const canonical = readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
        const digest = createHash('sha256').update(canonical, 'utf8').digest('hex');
        assert.equal(digest, hash, file + ' must match the approved Drive SVG');
    }
});

test('NEXUS logo and product name are available in demo and authenticated screens', () => {
    const brand = contents('src/components/NexusBrand.tsx');
    const shell = contents('src/components/Layout.tsx');
    const demo = contents('src/pages/Demo.tsx');
    const login = contents('src/pages/Login.tsx');
    const register = contents('src/pages/Register.tsx');
    assert.match(brand, /nexus-logo\.svg/);
    assert.match(brand, /nexus-mark\.svg/);
    assert.match(brand, /PlantLog/);
    for (const source of [shell, demo, login, register]) {
        assert.match(source, /<NexusBrand/);
    }
    assert.doesNotMatch(shell, /IND E-LOGBOOK/);
    assert.match(contents('index.html'), /href="\/nexus-mark\.svg"/);
    assert.match(contents('index.html'), /NEXUS \/ PlantLog/);
});

test('approved palette is exposed as central design tokens', () => {
    const theme = contents('tailwind.config.js');
    const css = contents('src/index.css');
    for (const color of ['#0B0F19', '#061524', '#00E0FF',
        '#4EA8FF', '#8F9BFF', '#6E55C6', '#B9C5CE']) {
        assert.ok(theme.includes(color), color + ' missing from Tailwind theme');
        assert.ok(css.includes(color), color + ' missing from base CSS');
    }
});

test('guest-only production deployment cannot expose nonfunctional authentication routes', () => {
    const app = contents('src/App.tsx');
    const demo = contents('src/pages/Demo.tsx');
    assert.match(app, /VITE_PUBLIC_DEMO_ONLY/);
    assert.match(app, /<Route path="\/demo" element={<Demo \/>} \/>/);
    assert.match(app, /<Route path="\*" element={<Navigate to="\/demo" replace \/>} \/>/);
    assert.match(demo, /publicDemoOnly/);
    assert.match(demo, /View source on GitHub/);
    assert.match(demo, /Inspect project code/);
});
