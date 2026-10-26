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
    const experimentChunks = [];
    const chunkLabels = ['ControlledComparisons', 'EligibilitySensitivityLab',
        'LifecycleFaultLab', 'TemporalBoundaryLab', 'EvidenceMatrixLab',
        'EvidenceReviewWorkbench'];
    const loadedExperiments = () => [...new Set(experimentChunks)];
    const pageErrors = [];
    page.on('pageerror', error => { pageErrors.push(error.message); });
    page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) apiCalls.push(request.url());
        for (const label of chunkLabels) {
            if (url.pathname.startsWith('/assets/' + label + '-') &&
                url.pathname.endsWith('.js')) experimentChunks.push(label);
        }
    });
    const labSelector = page.getByRole('group', { name: 'Select synthetic evidence laboratory' });
    const selectLab = async (title) => {
        const button = labSelector.getByRole('button', { name: new RegExp('^' + title) });
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        await page.locator('#selected-synthetic-laboratory > section').waitFor();
        assert.equal(await page.locator('#selected-synthetic-laboratory > section').count(), 1,
            'Exactly one scientific laboratory may be mounted at a time');
    };

    try {
        const response = await page.goto(base + '/demo', { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        assert.deepEqual(loadedExperiments(), [],
            'Overview should not download any of six on-demand experiment bundles');
        assert.equal(await page.getByRole('heading', { name: 'Know what needs attention.' }).isVisible(), true);
        assert.equal(await page.getByText('READ-ONLY PUBLIC DEMONSTRATION').isVisible(), true);
        // Keyboard users can skip the brand/header/nav before entering content.
        await page.keyboard.press('Tab');
        const skip = page.getByRole('link', {name:'Skip to demonstration content'});
        assert.equal(await skip.evaluate(el => el === document.activeElement), true);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#main-demo-content').evaluate(el =>
            el === document.activeElement), true);
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
        await page.getByRole('heading', { name: 'Controlled fictional case comparisons' }).waitFor();
        assert.deepEqual(loadedExperiments(), ['ControlledComparisons'],
            'First Insights visit must download only the default comparison experiment');
        assert.equal(await page.getByRole('heading', { name: 'Recorded activity at a glance' }).isVisible(), true);
        assert.equal(await page.getByRole('heading', { name: 'Equipment with unresolved cases' }).isVisible(), true);
        const openCountCard = page.getByRole('heading', { name: 'Open maintenance cases' }).locator('..');
        assert.equal(await openCountCard.getByText('4', { exact: true }).isVisible(), true);
        await page.getByRole('button', { name: 'View history for Conveyor Line C-12' }).click();
        assert.equal(await page.getByText('Asset: Conveyor Line C-12').isVisible(), true);
        await page.setViewportSize({width: 390, height: 844});
        await page.getByRole('button', { name: 'Demo insights' }).click();
        assert.equal(await page.getByRole('heading', { name: 'Recorded intake by UTC date' }).isVisible(), true);
        await page.getByRole('heading', { name: 'Controlled fictional case comparisons' }).waitFor();
        const comparative = page.getByRole('region', {
            name: 'Controlled example comparison table, scroll horizontally',
        });
        await comparative.focus();
        assert.equal(await comparative.evaluate(node => document.activeElement === node), true);
        const scrollable = page.getByRole('region', {
            name: 'Eight-day recorded intake chart, scroll horizontally for later dates',
        });
        await scrollable.focus();
        assert.equal(await scrollable.evaluate(element => document.activeElement === element), true,
            'The intake chart must be keyboard focusable');
        assert.equal(await page.getByRole('heading', { name: 'Synthetic data quality and provenance' })
            .isVisible(), true);
        assert.equal(await page.getByText('12 / 12 eligible rows').isVisible(), true);
        assert.equal(await page.getByText('Check passed', { exact: true }).count(), 8,
            'Every synthetic quality gate must be represented and pass on the reference fixture');
        assert.equal(await page.getByText('4', { exact: true }).count() > 0, true);
        // Sensitivity analysis is in-memory and recomputes quality-filtered
        // workload separately from raw fictional activity, on mobile too.
        assert.equal(await labSelector.getByRole('button').count(), 6);
        assert.equal(await labSelector.getByRole('button', {
            name: /^Controlled comparisons/,
        }).getAttribute('aria-pressed'), 'true');
        await selectLab('Eligibility sensitivity');
        assert.equal(await page.getByRole('heading', {
            name: 'Controlled fictional case comparisons',
        }).count(), 0, 'Inactive comparison panel must not execute or render');
        const lab = page.locator('section[aria-labelledby="eligibility-lab-heading"]');
        assert.equal(await lab.getByRole('heading', {
            name: 'Scientific sensitivity lab: raw versus eligible records',
        }).isVisible(), true);
        const eligibleMetric = lab.getByText('Eligible rows', { exact: true }).locator('..');
        assert.equal(await eligibleMetric.getByText('12', { exact: true }).isVisible(), true);
        await lab.getByRole('button', { name: 'Broken equipment link' }).click();
        assert.equal(await eligibleMetric.getByText('11', { exact: true }).isVisible(), true);
        assert.equal(await lab.getByText('UNLINKED', { exact: true }).isVisible(), true);
        await lab.getByRole('button', { name: 'Duplicate event ID' }).click();
        assert.equal(await eligibleMetric.getByText('10', { exact: true }).isVisible(), true);
        await lab.getByRole('button', { name: 'Overlapping defects' }).click();
        assert.equal(await eligibleMetric.getByText('11', { exact: true }).isVisible(), true);
        assert.equal(await lab.getByText('INVALID_DATE', { exact: true }).isVisible(), true);
        assert.equal(await lab.getByText('UNKNOWN_STATUS', { exact: true }).isVisible(), true);
        await lab.getByRole('button', { name: 'Baseline', exact: true }).click();
        assert.equal(await eligibleMetric.getByText('12', { exact: true }).isVisible(), true);
        assert.deepEqual(apiCalls, [], 'Sensitivity lab must stay entirely offline');

        // Recent evidence panels require real browser coverage as well as
        // isolated TypeScript checks: select deliberately malformed timelines,
        // confirm independent eligibility, and restore the original view.
        await selectLab('History contradictions');
        const fault = page.locator('section[aria-labelledby="lifecycle-fault-heading"]');
        const faultSelect = fault.getByRole('combobox', { name: 'Fictional experiment' });
        assert.equal(await faultSelect.locator('option').count(), 11);
        await faultSelect.selectOption('overlap');
        await fault.getByText('4 / 9', { exact: true }).waitFor();
        for (const code of ['INVALID_TRANSITION', 'AFTER_SNAPSHOT',
            'MISSING_ACTOR', 'FINAL_STATE_MISMATCH']) {
            assert.equal(await fault.getByText(code, { exact: true }).isVisible(), true);
        }
        assert.equal(await fault.getByText('1 / 1', { exact: true }).isVisible(), true,
            'Faulted timeline may still pass separate basic data checks');
        await faultSelect.selectOption('unrecorded');
        assert.equal(await fault.getByRole('heading', { name: 'Unrecorded history' }).isVisible(), true);
        await fault.getByText('MISSING_HISTORY', { exact: true }).waitFor();
        await faultSelect.selectOption('baseline');
        await fault.getByText('0 / 9', { exact: true }).waitFor();

        await selectLab('UTC boundary cases');
        const chronology = page.locator('section[aria-labelledby="temporal-boundary-heading"]');
        const chronologySelect = chronology.getByRole('combobox', {
            name: 'Synthetic UTC edge case',
        });
        assert.equal(await chronologySelect.locator('option').count(), 12);
        await chronologySelect.selectOption('post-snapshot-transition');
        await chronology.getByText('AFTER_SNAPSHOT', { exact: true }).waitFor();
        assert.equal(await chronology.getByText('Eligible', { exact: true }).isVisible(), true);
        assert.equal(await chronology.getByText('invalid', { exact: true }).isVisible(), true);
        assert.equal(await chronology.getByText('Expected behavior', { exact: true }).isVisible(), true);
        await chronologySelect.selectOption('non-leap-day');
        assert.equal(await chronology.getByText('Excluded', { exact: true }).isVisible(), true);
        await chronology.getByText('INVALID_EVENT_TIMESTAMP', { exact: true }).waitFor();
        await chronologySelect.selectOption('leap-day');
        await chronology.getByText('verified', { exact: true }).waitFor();
        await chronologySelect.selectOption('ordinary');

        await selectLab('Six-cell evidence matrix');
        const matrix = page.locator('section[aria-labelledby="evidence-matrix-heading"]');
        const populations = {
            fixture: matrix.getByRole('button', { name: 'Current fictional records' }),
            probes: matrix.getByRole('button', { name: 'Six controlled contradictions' }),
        };
        const cells = matrix.getByRole('region', {
            name: 'Synthetic evidence by basic eligibility and lifecycle status',
        }).locator('tbody tr');
        const ledger = matrix.getByRole('region', {
            name: 'Individual fictional row classifications and diagnostic reasons',
        }).locator('tbody tr');
        assert.equal(await populations.fixture.getAttribute('aria-pressed'), 'true');
        assert.equal(await cells.count(), 2);
        assert.deepEqual(await cells.nth(0).locator('td').allTextContents(),
            ['3', '9', '0', '12']);
        assert.deepEqual(await cells.nth(1).locator('td').allTextContents(),
            ['0', '0', '0', '0']);
        assert.equal(await ledger.count(), 12);
        await populations.probes.click();
        assert.equal(await populations.probes.getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await cells.nth(0).locator('td').allTextContents(),
            ['1', '1', '1', '3']);
        assert.deepEqual(await cells.nth(1).locator('td').allTextContents(),
            ['1', '1', '1', '3']);
        assert.equal(await ledger.count(), 6);
        assert.equal(await ledger.filter({hasText:'INVALID_TRANSITION'}).count(), 2);
        await populations.fixture.click();
        assert.equal(await ledger.count(), 12);
        const matrixRegions = matrix.getByRole('region');
        assert.equal(await matrixRegions.count(), 2);
        for (let index = 0; index < 2; index++) {
            const region = matrixRegions.nth(index);
            await region.focus();
            assert.equal(await region.evaluate(node => node === document.activeElement), true,
                'Both matrix tables remain keyboard focusable at 390px');
        }
        assert.equal(await page.evaluate(() =>
            document.documentElement.scrollWidth <= window.innerWidth), true,
            'Mobile panels should scroll internally without document overflow');
        // Document-review categories use the existing matrix diagnostics,
        // never an operational risk estimate or an approval action.
        await selectLab('Document review workbench');
        const review = page.locator('section[aria-labelledby="evidence-workbench-heading"]');
        const reviewFilter = review.getByRole('combobox', {
            name: 'Filter by documentary review category',
        });
        const historyFilter = review.getByRole('combobox', {
            name: 'Filter by original history assessment',
        });
        const diagnosticFilter = review.getByRole('combobox', {
            name: 'Filter by independent diagnostic',
        });
        const reviewRows = review.getByRole('region', {
            name: 'Filtered fictional documentary evidence review rows',
        }).locator('tbody tr');
        await review.getByRole('heading', { name: 'Synthetic evidence review workbench' }).waitFor();
        assert.equal(await reviewFilter.locator('option').count(), 5);
        assert.equal(await reviewRows.count(), 12);
        assert.equal(await diagnosticFilter.locator('option').count(), 2);
        await diagnosticFilter.selectOption('MISSING_HISTORY');
        assert.equal(await reviewRows.count(), 9);
        await historyFilter.selectOption('verified');
        assert.equal(await reviewRows.count(), 0);
        await review.getByText(/No fictional row matches all selected documentary checks/).waitFor();
        await historyFilter.selectOption('all');
        await diagnosticFilter.selectOption('all');
        await reviewFilter.selectOption('history-unrecorded');
        assert.equal(await reviewRows.count(), 9);
        await reviewFilter.selectOption('recorded-consistent');
        assert.equal(await reviewRows.count(), 3);
        await review.getByRole('button', { name: 'Six controlled cases' }).click();
        assert.equal(await reviewFilter.inputValue(), 'all');
        assert.equal(await reviewRows.count(), 6);
        await reviewFilter.selectOption('basic-data');
        assert.equal(await reviewRows.count(), 3);
        assert.equal(await diagnosticFilter.locator('option').count(), 4);
        await historyFilter.selectOption('invalid');
        assert.equal(await reviewRows.count(), 1);
        await diagnosticFilter.selectOption('INVALID_TRANSITION');
        assert.equal(await reviewRows.count(), 1);
        await reviewRows.first().getByText('Row 6', { exact: true }).waitFor();
        await diagnosticFilter.selectOption('MISSING_HISTORY');
        assert.equal(await reviewRows.count(), 0);
        await historyFilter.selectOption('all');
        await diagnosticFilter.selectOption('all');
        await reviewFilter.selectOption('history-conflict');
        assert.equal(await reviewRows.count(), 1);
        await reviewRows.first().getByText('INVALID_TRANSITION', { exact: true }).waitFor();
        await review.getByRole('button', { name: 'Current fictional sample' }).click();
        assert.equal(await reviewRows.count(), 12);
        assert.equal(await reviewFilter.inputValue(), 'all');
        assert.equal(await historyFilter.inputValue(), 'all');
        assert.equal(await diagnosticFilter.inputValue(), 'all');
        await review.getByRole('region', {
            name: 'Filtered fictional documentary evidence review rows',
        }).focus();
        assert.equal(await review.getByRole('region', {
            name: 'Filtered fictional documentary evidence review rows',
        }).evaluate(element => element === document.activeElement), true);
        assert.equal(await page.evaluate(() =>
            document.documentElement.scrollWidth <= window.innerWidth), true);
        assert.deepEqual(new Set(loadedExperiments()), new Set(chunkLabels),
            'Every experiment should download at most once, only after its selection');
        for (const label of chunkLabels) {
            assert.equal(experimentChunks.filter(item => item === label).length, 1,
                label + ' should not be downloaded twice');
        }
        assert.deepEqual(apiCalls, [], 'Document review is browser-only');

        assert.deepEqual(apiCalls, [], 'All three evidence labs must stay offline');
        assert.deepEqual(pageErrors, [], 'Synthetic lab controls must not throw in the browser');

        // A reload discards local-only select states and reopens the original
        // fictional fixture; no persisted fault experiment is replayed.
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Demo insights' }).click();
        assert.equal(await labSelector.getByRole('button', {
            name: /^Controlled comparisons/,
        }).getAttribute('aria-pressed'), 'true',
        'A page reload must restore the lightweight default laboratory');
        assert.equal(await page.locator('#lifecycle-fault-case').count(), 0);
        await selectLab('History contradictions');
        assert.equal(await page.locator('#lifecycle-fault-case').inputValue(), 'baseline');
        await selectLab('UTC boundary cases');
        assert.equal(await page.locator('#temporal-boundary-case').inputValue(), 'ordinary');
        await selectLab('Six-cell evidence matrix');
        assert.equal(await page.locator('section[aria-labelledby="evidence-matrix-heading"]')
            .getByRole('button', { name: 'Current fictional records' })
            .getAttribute('aria-pressed'), 'true');
        assert.equal(await page.getByText('12 / 12 eligible rows').isVisible(), true);

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
        // The matrix follows the temporary in-memory simulation while the
        // six controlled example cells remain independent and unchanged.
        await selectLab('Six-cell evidence matrix');
        const activeMatrix = page.locator('section[aria-labelledby="evidence-matrix-heading"]');
        assert.equal(await activeMatrix.getByText('Rows assessed').locator('..')
            .getByText('13', { exact: true }).isVisible(), true);
        assert.deepEqual(await activeMatrix.getByRole('region', {
            name: 'Synthetic evidence by basic eligibility and lifecycle status',
        }).locator('tbody tr').first().locator('td').allTextContents(), ['4','9','0','13']);
        await selectLab('Document review workbench');
        const activeReview = page.locator('section[aria-labelledby="evidence-workbench-heading"]');
        await activeReview.getByText('Rows assessed').locator('..')
            .getByText('13', { exact: true }).waitFor();
        await activeReview.getByText('Internally consistent only').locator('..')
            .getByText('4', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Scenario lab' }).click();
        await page.getByRole('button', { name: 'Reset simulation' }).click();
        await page.getByRole('button', { name: 'Demo insights' }).click();
        const originalTotal = page.getByRole('heading', { name: 'Total log entries' }).locator('..');
        assert.equal(await originalTotal.getByText('12', { exact: true }).isVisible(), true);
        await selectLab('Six-cell evidence matrix');
        assert.equal(await page.locator('section[aria-labelledby="evidence-matrix-heading"]')
            .getByText('Rows assessed').locator('..').getByText('12', { exact: true })
            .isVisible(), true);
        await selectLab('Document review workbench');
        const restoredReview = page.locator('section[aria-labelledby="evidence-workbench-heading"]');
        await restoredReview.getByText('Rows assessed').locator('..')
            .getByText('12', { exact: true }).waitFor();
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
        assert.deepEqual(pageErrors, [], 'Browser navigation must not emit JavaScript exceptions');

        // A deliberate network failure must not blank the Insights overview,
        // leave the guest unable to select another lab, leak a stack trace,
        // or claim that a failed experiment produced validated evidence.
        // A fresh browser context prevents earlier cached experiment chunks
        // from masking the abort.
        const failureContext = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        t.after(async () => { await failureContext.close(); });
        const broken = await failureContext.newPage();
        let blockedChunks = 0;
        const failedApi = [];
        broken.on('request', request => {
            if (new URL(request.url()).pathname.startsWith('/api/'))
                failedApi.push(request.url());
        });
        const failImport = async route => {
            blockedChunks++;
            await route.abort('failed');
        };
        await broken.route('**/assets/TemporalBoundaryLab-*.js', failImport);
        await broken.goto(base + '/demo', { waitUntil: 'networkidle' });
        await broken.getByRole('button', { name: 'Demo insights' }).click();
        await broken.getByRole('heading', {
            name: 'Controlled fictional case comparisons',
        }).waitFor();
        await broken.getByRole('group', {
            name: 'Select synthetic evidence laboratory',
        }).getByRole('button', { name: /^UTC boundary cases/ }).click();
        const unavailable = broken.getByRole('heading', {
            name: 'Fictional laboratory unavailable',
        });
        await unavailable.waitFor();
        assert.equal(blockedChunks, 1, 'Only the selected simulated module was blocked');
        assert.equal(await broken.getByRole('heading', {
            name: 'Recorded activity at a glance',
        }).isVisible(), true, 'Core insights must remain mounted after import failure');
        assert.equal(await broken.getByText('12 / 12 eligible rows').isVisible(), true);
        assert.equal(await broken.getByText(
            'No analysis was completed and no maintenance record',
            { exact: false }).isVisible(), true);
        assert.equal(await broken.locator('#selected-synthetic-laboratory')
            .getByText('Failed to fetch dynamically imported module').count(), 0,
        'Do not expose internal browser module errors in the guest view');
        await broken.getByRole('button', { name: 'Open controlled comparisons' }).click();
        await broken.getByRole('heading', {
            name: 'Controlled fictional case comparisons',
        }).waitFor();
        // Import failure is cached by the browser module loader: retry must
        // use a complete navigation, not a misleading React-only reset.
        await broken.getByRole('group', {
            name: 'Select synthetic evidence laboratory',
        }).getByRole('button', { name: /^UTC boundary cases/ }).click();
        await unavailable.waitFor();
        await broken.unroute('**/assets/TemporalBoundaryLab-*.js', failImport);
        await broken.getByRole('button', {
            name: 'Reload demo and clear temporary cases',
        }).click();
        await broken.getByRole('heading', {
            name: 'Know what needs attention.',
        }).waitFor();
        await broken.getByRole('button', { name: 'Demo insights' }).click();
        await broken.getByRole('group', {
            name: 'Select synthetic evidence laboratory',
        }).getByRole('button', { name: /^UTC boundary cases/ }).click();
        await broken.getByRole('heading', {
            name: 'Synthetic UTC boundary experiments',
        }).waitFor();
        assert.deepEqual(failedApi, [], 'Failed module and recovery must remain guest-only');
        assert.equal(await broken.evaluate(() =>
            document.documentElement.scrollWidth <= window.innerWidth), true);
    } catch (error) {
        mkdirSync(path.join(frontendRoot, 'test-artifacts'), { recursive: true });
        await page.screenshot({
            path: path.join(frontendRoot, 'test-artifacts', 'browser-smoke-failure.png'),
            fullPage: true,
        }).catch(() => undefined);
        throw error;
    }
});
