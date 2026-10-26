const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const root = path.resolve(__dirname, '..');
const base = 'http://127.0.0.1:4181';
const artifactDir = path.join(root, 'test-artifacts');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
    for (let i = 0; i < 80; i++) {
        try {
            const result = await fetch(base + '/demo');
            if (result.ok) return;
        } catch { /* local process not ready */ }
        await pause(200);
    }
    throw new Error('Local static demo was not ready for accessibility test');
}

test('public synthetic demo has no serious/critical automated accessibility violations', {
    timeout: 120000,
}, async (t) => {
    const vite = spawn(process.execPath, [
        path.join(root, 'node_modules/vite/bin/vite.js'),
        'preview', '--host', '127.0.0.1', '--port', '4181', '--strictPort',
    ], { cwd: root, stdio: 'ignore' });
    t.after(() => { vite.kill(); });
    await waitForServer();

    const browser = await chromium.launch({ headless: true });
    t.after(async () => { await browser.close(); });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const apiCalls = [];
    page.on('request', req => {
        if (new URL(req.url()).pathname.startsWith('/api/')) apiCalls.push(req.url());
    });

    const scans = [];
    async function scan(view, viewport) {
        await page.getByRole('heading', { name: 'Know what needs attention.' }).waitFor();
        const report = await new AxeBuilder({ page }).withTags([
            'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa',
        ]).analyze();
        scans.push({
            view,
            viewport,
            testedRules: report.passes.length,
            incompleteRules: report.incomplete.map(x => x.id),
            violations: report.violations.map(v => ({
                id: v.id, impact: v.impact,
                affectedElements: v.nodes.length,
                selectors: v.nodes.slice(0, 12).map(node => node.target.join(' ')),
            })),
        });
    }

    try {
        for (const width of [1280, 390]) {
            const viewport = width === 390 ? 'mobile-390' : 'desktop-1280';
            await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
            await page.goto(base + '/demo', { waitUntil: 'networkidle' });
            await scan('overview', viewport);
            for (const [button, view] of [
                ['Asset registry', 'assets'],
                ['Maintenance log', 'logs'],
                ['Demo insights', 'insights'],
                ['Scenario lab', 'scenario'],
            ]) {
                await page.getByRole('button', { name: button, exact: true }).click();
                await scan(view, viewport);
            }
        }
    } finally {
        mkdirSync(artifactDir, { recursive: true });
        const violations = scans.flatMap(scan => scan.violations.map(v => ({
            view: scan.view, viewport: scan.viewport, ...v,
        })));
        const blockers = violations.filter(v =>
            v.impact === 'critical' || v.impact === 'serious');
        writeFileSync(path.join(artifactDir, 'accessibility-audit.json'), JSON.stringify({
            schemaVersion: 1,
            scope: 'CI-only static synthetic guest demo; axe WCAG 2/2.1 A/AA heuristic',
            viewports: ['desktop-1280', 'mobile-390'],
            scans,
            summary: {
                completedViewScans: scans.length,
                totalViolations: violations.length,
                seriousOrCritical: blockers.length,
                moderateOrMinor: violations.length - blockers.length,
                externalApiCalls: apiCalls.length,
            },
            certification: false,
            manualScreenReaderAndKeyboardReviewComplete: false,
        }, null, 2) + '\n');
        assert.deepEqual(apiCalls, [], 'Public synthetic demo must never contact an API');
        assert.equal(scans.length, 10, 'Must audit five views at desktop and mobile');
        assert.equal(blockers.length, 0,
            'Automated serious/critical accessibility defects: ' +
            JSON.stringify(blockers.slice(0, 20)));
    }
});
