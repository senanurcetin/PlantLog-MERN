const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Actual Chromium smoke test of the built frontend. No backend, database, JWT or real data.
const frontendRoot = path.resolve(__dirname, '..');
const base = 'http://127.0.0.1:4173';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            const response = await fetch(base + '/demo');
            if (response.ok) return;
        } catch { /* Vite is still starting. */ }
        await sleep(200);
    }
    throw new Error('Vite preview did not become healthy on port 4173');
};

test('public portfolio demo works in a browser without API access', { timeout: 90000 }, async (t) => {
    const vite = spawn(process.execPath, [
        path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
        'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort',
    ], { cwd: frontendRoot, stdio: 'ignore' });
    t.after(() => { vite.kill(); });
    await waitForServer();

    const browser = await chromium.launch({
        headless: true,
        ...(process.env.PLANTLOG_BROWSER_CHANNEL ? {channel: process.env.PLANTLOG_BROWSER_CHANNEL} : {}),
    });
    t.after(async () => { await browser.close(); });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const apiCalls = [];
    page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url());
    });

    try {
        const response = await page.goto(base + '/demo', { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        assert.equal(await page.getByRole('heading', { name: 'Know what needs attention.' }).isVisible(), true);
        assert.equal(await page.getByText('READ-ONLY PUBLIC DEMONSTRATION').isVisible(), true);
        const demoLogo = page.getByRole('img', { name: 'NEXUS' }).first();
        await demoLogo.waitFor();
        assert.equal(await demoLogo.evaluate(img => img.complete && img.naturalWidth > 0), true,
            'Official NEXUS wordmark must load in the public demo');

        await page.getByRole('button', { name: 'Asset registry' }).click();
        const searchAssets = page.getByRole('searchbox', { name: 'Search sample assets' });
        await searchAssets.fill('DEMO-CNV-003');
        assert.equal(await page.locator('table tbody tr').count(), 1);
        await page.getByRole('combobox', { name: 'Filter assets by status' }).selectOption('maintenance');
        assert.equal(await page.locator('table tbody tr').count(), 1);
        await page.getByRole('button', { name: /View logs/ }).click();
        assert.equal(await page.getByRole('heading', { name: 'Shift and maintenance records.' }).isVisible(), true);
        assert.equal(await page.getByText('Asset: Conveyor Line C-12').isVisible(), true);

        await page.getByRole('button', { name: 'Maintenance log' }).click();
        await page.getByRole('searchbox', { name: 'Search sample log entries' }).fill('Hydraulic filter');
        assert.equal(await page.getByText('Hydraulic filter replacement completed').isVisible(), true);
        await page.getByText('Example status timeline (4 events)').click();
        assert.equal(await page.getByText('in progress → resolved').isVisible(), true);

        await page.getByRole('searchbox', { name: 'Search sample log entries' }).fill('NO-RECORD-EXISTS');
        assert.equal(await page.getByText('No log entries match the current filters.').isVisible(), true);
        assert.deepEqual(apiCalls, [], 'Public demo must not call the authenticated API');

        // Demo insights must use the same static data and drill into the
        // existing read-only log filter, including on compact viewports.
        await page.getByRole('button', { name: 'Demo insights' }).click();
        assert.equal(await page.getByRole('heading', { name: 'Recorded activity at a glance' }).isVisible(), true);
        assert.equal(await page.getByRole('heading', { name: 'Equipment with unresolved cases' }).isVisible(), true);
        const openCountCard = page.getByRole('heading', { name: 'Open maintenance cases' }).locator('..');
        assert.equal(await openCountCard.getByText('4', { exact: true }).isVisible(), true);
        await page.getByRole('button', { name: 'View history for Conveyor Line C-12' }).click();
        assert.equal(await page.getByText('Asset: Conveyor Line C-12').isVisible(), true);
        await page.setViewportSize({width: 390, height: 844});
        await page.getByRole('button', { name: 'Demo insights' }).click();
        assert.equal(await page.getByRole('heading', { name: 'Recorded intake by UTC date' }).isVisible(), true);
        assert.equal(await page.getByText('4', { exact: true }).count() > 0, true);
        assert.deepEqual(apiCalls, [], 'Insights must remain offline and fixture-only');

        // Guided scenario can advance one fictional case, update the same
        // analytics, and reset without sending writes or persisting data.
        await page.getByRole('button', { name: 'Scenario lab' }).click();
        await page.getByRole('heading', { name: 'Explore a maintenance case lifecycle' }).waitFor();
        await page.getByRole('button', { name: 'Report fictional incident' }).click();
        await page.getByText('SIM-001', { exact: false }).first().waitFor();
        await page.getByRole('button', { name: 'Acknowledge case' }).click();
        await page.getByRole('button', { name: 'In progress case' }).click();
        await page.getByRole('button', { name: 'Resolve case' }).click();
        await page.getByText('Demo case resolved').waitFor();
        await page.getByRole('button', { name: 'Demo insights' }).click();
        const afterResolve = page.getByRole('heading', { name: 'Open maintenance cases' }).locator('..');
        assert.equal(await afterResolve.getByText('4', { exact: true }).isVisible(), true);
        const logTotal = page.getByRole('heading', { name: 'Total log entries' }).locator('..');
        assert.equal(await logTotal.getByText('13', { exact: true }).isVisible(), true);
        await page.getByRole('button', { name: 'Scenario lab' }).click();
        await page.getByRole('button', { name: 'Reset simulation' }).click();
        await page.getByRole('button', { name: 'Demo insights' }).click();
        const originalTotal = page.getByRole('heading', { name: 'Total log entries' }).locator('..');
        assert.equal(await originalTotal.getByText('12', { exact: true }).isVisible(), true);
        assert.deepEqual(apiCalls, [], 'Scenario interactions must never call the API');

        // Standalone public builds intentionally redirect registration to
        // the demo. Local full-stack builds still validate the signup form.
        const publicDemoOnly = await page.getByRole('link', { name: 'View source on GitHub' }).count() === 1;
        await page.goto(base + '/register');
        if (publicDemoOnly) {
            await page.getByRole('heading', { name: 'Know what needs attention.' }).waitFor();
            assert.equal(new URL(page.url()).pathname, '/demo');
        } else {
            await page.getByLabel('Full name').fill('Browser Example');
            await page.getByLabel('Email').fill('browser@example.com');
            await page.getByLabel('Password', { exact: true }).fill('twelvechars1234');
            await page.getByLabel('Confirm password').fill('differentsecret1234');
            await page.getByRole('button', { name: 'Create operator account' }).click();
            assert.equal(await page.getByRole('alert').getByText('Passwords do not match.').isVisible(), true);
        }
        assert.deepEqual(apiCalls, [], 'Static browser walk-through must not send API requests');
    } catch (error) {
        mkdirSync(path.join(frontendRoot, 'test-artifacts'), { recursive: true });
        await page.screenshot({
            path: path.join(frontendRoot, 'test-artifacts', 'browser-smoke-failure.png'),
            fullPage: true,
        }).catch(() => undefined);
        throw error;
    }
});
