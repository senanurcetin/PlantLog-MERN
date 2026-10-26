/**
 * Fail-closed repository documentation and generated visual-evidence check.
 * No external HTTP requests, live API, image rewriting or npm dependencies.
 */
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync, readdirSync, statSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const gallery = path.join(docs, 'screenshots');

function collectMarkdown(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const absolute = path.join(dir, entry.name);
        return entry.isDirectory() ? collectMarkdown(absolute)
            : entry.isFile() && entry.name.endsWith('.md') ? [absolute] : [];
    });
}

const markdown = [
    ...['README.md', 'CONTRIBUTING.md', 'SECURITY.md'].map(file => path.join(root, file)),
    ...collectMarkdown(docs),
];
let linkCount = 0;
const missingLinks = [];
for (const file of markdown) {
    const content = readFileSync(file, 'utf8');
    // Local Markdown files deliberately use ordinary, relative Markdown URLs.
    // Fragment anchors and external URLs are beyond this file-existence check.
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        let href = match[1].trim();
        if (href.startsWith('<') && href.endsWith('>')) href = href.slice(1, -1);
        href = href.replace(/\s+["'][^"']+["']$/, '');
        if (!href || /^(https?:|mailto:|data:|#)/i.test(href)) continue;
        const pathname = decodeURIComponent(href.split('#')[0].split('?')[0]);
        if (!pathname) continue;
        const target = path.resolve(path.dirname(file), pathname);
        linkCount++;
        if (!target.startsWith(root + path.sep) || !existsSync(target)) {
            missingLinks.push(path.relative(root, file) + ' -> ' + href);
        }
    }
}
assert.deepEqual(missingLinks, [], 'Broken or escaping relative documentation links');

const manifestFile = path.join(gallery, 'manifest.json');
assert.ok(existsSync(manifestFile), 'Current screenshot manifest is missing');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
assert.match(manifest.captureDateUTC, /^\d{4}-\d{2}-\d{2}$/);
assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/i);
assert.equal(manifest.liveDeploymentVerified, false,
    'Local screenshot captures must not claim a direct live-site verification');
assert.match(manifest.captureMethod, /local browser|local Vite|local production/i);
assert.equal(manifest.captures.length, 11, 'All eleven guest views must be captured');

const listed = new Set();
for (const entry of manifest.captures) {
    assert.match(entry.file, /^nexus-[a-z-]+\.png$/);
    assert.ok(!listed.has(entry.file), 'Duplicate screenshot in manifest: ' + entry.file);
    listed.add(entry.file);
    assert.ok([390, 1440].includes(entry.viewport.width));
    assert.equal(entry.fullPage, true);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    const file = path.join(gallery, entry.file);
    assert.equal(existsSync(file), true, 'Missing screenshot: ' + entry.file);
    const bytes = readFileSync(file);
    assert.ok(bytes.length > 10000, 'Truncated/empty PNG: ' + entry.file);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a',
        'Invalid PNG signature: ' + entry.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256,
        'Screenshot checksum mismatch: ' + entry.file);
}
const onDisk = readdirSync(gallery).filter(name => name.endsWith('.png')).sort();
assert.deepEqual(onDisk, [...listed].sort(), 'Undocumented or missing screenshots');
for (const obsolete of [
    'screenshots-manifest.json',
    'demo-verification-2026-10-21.md',
    'nexus-demo-overview.png',
    'nexus-demo-insights.png',
    'nexus-demo-mobile.png',
]) {
    assert.equal(existsSync(path.join(docs, obsolete)), false,
        'Outdated root-level visual/report document remains: ' + obsolete);
}
assert.ok(markdown.length >= 15, 'Technical reference documentation was unexpectedly removed');
console.log('DOCS_VERIFIED ' + JSON.stringify({
    markdownFiles: markdown.length, localLinks: linkCount,
    screenshots: listed.size, manifestSourceCommit: manifest.sourceCommit,
    imageDigestsValid: true, obsoleteGalleryFiles: 0,
}));
