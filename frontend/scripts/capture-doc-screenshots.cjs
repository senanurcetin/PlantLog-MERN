/**
 * Deterministic, browser-rendered NEXUS PlantLog screenshot capture.
 * Captures only the public synthetic guest demo; no credentials or live APIs.
 *
 * Prerequisites: VITE_PUBLIC_DEMO_ONLY=true npm run build,
 * playwright@1.56.1 and its Chromium runtime.
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const assert = require('node:assert/strict');

const frontend = path.resolve(__dirname, '..');
const repo = path.resolve(frontend, '..');
const outputDir = path.join(repo, 'docs', 'screenshots');
const base = 'http://127.0.0.1:4173';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
    for (let i = 0; i < 120; i++) {
        try {
            const response = await fetch(base + '/demo');
            if (response.status === 200) return;
        } catch { /* local Vite preview is starting */ }
        await sleep(250);
    }
    throw new Error('The production-equivalent preview failed to start');
}

const captures = [
    { file: 'nexus-demo-overview.png', viewport: [1440, 900], tab: 'Overview', title: 'Know what needs attention.' },
    { file: 'nexus-demo-assets.png', viewport: [1440, 900], tab: 'Asset registry', title: 'Asset registry' },
    { file: 'nexus-demo-logs.png', viewport: [1440, 900], tab: 'Maintenance log', title: 'Shift and maintenance records.' },
    { file: 'nexus-demo-insights.png', viewport: [1440, 900], tab: 'Demo insights', title: 'Synthetic data quality and provenance', lab: 'Controlled comparisons', labTitle: 'Controlled fictional case comparisons' },
    { file: 'nexus-demo-insights-mobile.png', viewport: [390, 844], tab: 'Demo insights', title: 'Synthetic data quality and provenance', lab: 'Controlled comparisons', labTitle: 'Controlled fictional case comparisons' },
    { file: 'nexus-lab-utc.png', viewport: [1440, 900], tab: 'Demo insights', title: 'Synthetic data quality and provenance', lab: 'UTC boundary cases', labTitle: 'UTC boundary & chronology laboratory' },
    { file: 'nexus-lab-evidence-matrix.png', viewport: [1440, 900], tab: 'Demo insights', title: 'Synthetic data quality and provenance', lab: 'Six-cell evidence matrix', labTitle: 'Dual-axis evidence and eligibility matrix' },
    { file: 'nexus-lab-review-workbench.png', viewport: [1440, 900], tab: 'Demo insights', title: 'Synthetic data quality and provenance', lab: 'Document review workbench', labTitle: 'Synthetic evidence review workbench' },
    { file: 'nexus-scenario-lab-desktop.png', viewport: [1440, 900], tab: 'Scenario lab', title: 'Explore a maintenance case lifecycle', scenario: true },
    { file: 'nexus-scenario-lab-mobile.png', viewport: [390, 844], tab: 'Scenario lab', title: 'Explore a maintenance case lifecycle', scenario: true },
    { file: 'nexus-demo-mobile.png', viewport: [390, 844], tab: 'Overview', title: 'Know what needs attention.' },
];

async function main() {
    assert.equal(process.env.VITE_PUBLIC_DEMO_ONLY, 'true',
        'Screenshot capture is permitted only in the guest-only production-equivalent build');
    mkdirSync(outputDir, { recursive: true });
    const vite = spawn(process.execPath, [
        path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview',
        '--host', '127.0.0.1', '--port', '4173', '--strictPort',
    ], { cwd: frontend, stdio: 'inherit' });
    let browser;
    try {
        await waitForServer();
        browser = await chromium.launch({
            headless: true,
            ...(process.env.PLANTLOG_BROWSER_CHANNEL
                ? { channel: process.env.PLANTLOG_BROWSER_CHANNEL } : {}),
        });
        const manifest = {
            captureDateUTC: new Date().toISOString().slice(0, 10),
            sourceCommit: process.env.GITHUB_SHA || 'local-development',
            captureMethod: 'isolated local browser from public-demo-only Vite build; not an HTTP screenshot of the live domain',
            mode: 'VITE_PUBLIC_DEMO_ONLY=true; production-equivalent Vite build; local Chromium',
            sourceData: 'frontend/src/demo/fixture.json (8 fictional assets, 12 fictional logs)',
            liveDeploymentVerified: false,
            captures: [],
        };
        for (const capture of captures) {
            const [width, height] = capture.viewport;
            const page = await browser.newPage({
                viewport: { width, height }, deviceScaleFactor: 1,
                reducedMotion: 'reduce', colorScheme: 'light',
            });
            const errors = [];
            const apiRequests = [];
            page.on('pageerror', error => errors.push(String(error)));
            page.on('request', request => {
                if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
            });
            try {
                await page.goto(base + '/demo', { waitUntil: 'networkidle' });
                await page.getByRole('heading', { name: 'Know what needs attention.' }).waitFor();
                if (capture.tab !== 'Overview') {
                    await page.getByRole('button', { name: capture.tab, exact: true }).click();
                }
                await page.getByRole('heading', { name: capture.title, exact: true }).waitFor();
                const brand = page.getByRole('img', { name: 'NEXUS' }).first();
                assert.equal(await brand.evaluate(el => el.complete && el.naturalWidth > 0), true,
                    'Official NEXUS logo failed to load');
                if (capture.tab === 'Demo insights') {
                    assert.equal(await page.getByText('12 / 12 eligible rows').isVisible(), true);
                    assert.equal(await page.getByText('Check passed', { exact: true }).count(), 8);
                    const selector = page.getByRole('group', {
                        name: 'Select synthetic evidence laboratory',
                    });
                    assert.equal(await selector.getByRole('button').count(), 6);
                    await selector.getByRole('button', { name: new RegExp('^' + capture.lab) }).click();
                    await page.getByRole('heading', { name: capture.labTitle }).waitFor();
                    // Lazy components must resolve before capture, not merely render a loader.
                    assert.equal(await page.getByRole('heading', { name: capture.labTitle }).isVisible(), true);
                    assert.equal(await page.locator('#selected-synthetic-laboratory > section').count(), 1);
                }
                if (capture.scenario) {
                    await page.getByRole('button', { name: 'Report fictional incident' }).click();
                    await page.getByRole('button', { name: 'Acknowledge case' }).click();
                    await page.getByRole('button', { name: 'In progress case' }).click();
                    await page.getByText('SIM-001').first().waitFor();
                }
                await page.evaluate(async () => { await document.fonts.ready; });
                const overflow = await page.evaluate(() => ({
                    scrollWidth: document.documentElement.scrollWidth,
                    innerWidth: window.innerWidth,
                }));
                assert.ok(overflow.scrollWidth <= overflow.innerWidth + 1,
                    'Document overflow in ' + capture.file + ': ' + JSON.stringify(overflow));
                assert.deepEqual(apiRequests, [], 'Public fixture capture must not contact the API');
                assert.deepEqual(errors, [], 'Browser errors during ' + capture.file);
                const screenshotPath = path.join(outputDir, capture.file);
                await page.screenshot({
                    path: screenshotPath,
                    fullPage: true,
                    animations: 'disabled',
                    caret: 'hide',
                });
                manifest.captures.push({
                    file: capture.file, tab: capture.tab,
                    viewport: { width, height }, fullPage: true,
                    scenarioPhase: capture.scenario ? 'in_progress' : null,
                    selectedLaboratory: capture.lab || null,
                    sha256: createHash('sha256').update(readFileSync(screenshotPath)).digest('hex'),
                });
                process.stdout.write('CAPTURED ' + capture.file + '\n');
            } finally {
                await page.close();
            }
        }
        writeFileSync(path.join(outputDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2) + '\n');
        assert.equal(manifest.captures.length, captures.length);
    } finally {
        if (browser) await browser.close();
        vite.kill();
    }
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
