const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const path = require('node:path');
const { mkdirSync, readFileSync } = require('node:fs');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(repoRoot, 'backend');
const frontendRoot = path.join(repoRoot, 'frontend');
const mongoose = require(path.join(backendRoot, 'node_modules', 'mongoose'));
const frontendUrl = 'http://localhost:5173';
const apiUrl = 'http://127.0.0.1:5000/api/health';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForService(url) {
    for (let i = 0; i < 150; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch { /* Starting up */ }
        await sleep(200);
    }
    throw new Error('Service never became healthy: ' + url);
}

test('operator onboarding, asset, incident, lifecycle and analytics in Chromium with isolated MongoDB',
    { timeout: 150000 }, async (t) => {
        const database = 'plantlog_browser_' + randomUUID().replaceAll('-', '');
        const mongoURI = 'mongodb://127.0.0.1:27017/' + database;
        const jwtSecret = randomBytes(48).toString('hex');
        const backend = spawn(process.execPath, [path.join(backendRoot, 'dist', 'server.js')], {
            cwd: backendRoot, stdio: 'ignore',
            env: { ...process.env, PORT: '5000', MONGO_URI: mongoURI, JWT_SECRET: jwtSecret },
        });
        const vite = spawn(process.execPath, [
            path.join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
            'preview', '--host', 'localhost', '--port', '5173', '--strictPort',
        ], { cwd: frontendRoot, stdio: 'ignore' });
        let browser;
        t.after(async () => {
            if (browser) await browser.close();
            vite.kill();
            backend.kill();
            // Drop only the generated local test database, never any shared data.
            const cleanup = await mongoose.createConnection(mongoURI, { serverSelectionTimeoutMS: 5000 }).asPromise();
            try { await cleanup.dropDatabase(); } finally { await cleanup.close(); }
        });

        await Promise.all([waitForService(apiUrl), waitForService(frontendUrl + '/register')]);
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

        try {
            const unique = randomUUID().replaceAll('-', '');
            const email = 'ci' + unique + '@example.com';
            const password = 'ci-synthetic-password-2026';
            const equipmentName = 'Demo CI Conveyor ' + unique.slice(0, 8);
            const serial = 'E2E-' + unique;
            const incidentName = 'Synthetic bearing temperature anomaly ' + unique.slice(0, 8);

            await page.goto(frontendUrl + '/register', { waitUntil: 'networkidle' });
            await page.getByLabel('Full name').fill('Browser CI Operator');
            await page.getByLabel('Email').fill(email);
            await page.getByLabel('Password', { exact: true }).fill(password);
            await page.getByLabel('Confirm password').fill(password);
            await page.getByRole('button', { name: 'Create operator account' }).click();
            await page.getByRole('heading', { name: 'Welcome back, Browser CI Operator' }).waitFor();

            // A real phone viewport should show navigation without the desktop sidebar.
            await page.setViewportSize({ width: 390, height: 844 });
            const mobileNav = page.getByRole('navigation', { name: 'Mobile primary navigation' });
            assert.equal(await mobileNav.isVisible(), true);
            assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).isVisible(), false);
            await mobileNav.getByRole('link', { name: 'Asset Registry' }).click();
            await page.getByRole('button', { name: 'Add Asset' }).waitFor();
            await mobileNav.getByRole('link', { name: 'Maintenance Analytics' }).click();
            await page.getByRole('heading', { name: 'Maintenance lifecycle insights' }).waitFor();

            // Restore desktop width for the remaining authenticated workflow checks.
            await page.setViewportSize({ width: 1280, height: 900 });
            await page.getByRole('link', { name: 'Asset Registry' }).click();
            await page.getByRole('button', { name: 'Add Asset' }).click();
            await page.getByRole('heading', { name: 'Register New Asset' }).waitFor();
            const assetForm = page.locator('form');
            await assetForm.locator('input').nth(0).fill(equipmentName);
            await assetForm.locator('input').nth(1).fill(serial);
            await assetForm.locator('select').selectOption('equipment');
            await assetForm.locator('input').nth(2).fill('Synthetic CI Lab');
            await assetForm.getByRole('button', { name: 'Save Asset' }).click();
            await page.getByText(equipmentName).first().waitFor();

            await page.getByRole('link', { name: 'Maintenance Logs' }).click();
            await page.getByRole('button', { name: 'New Log Entry' }).click();
            const incidentForm = page.locator('form');
            await incidentForm.locator('select').nth(0).selectOption({ index: 1 });
            await incidentForm.locator('select').nth(1).selectOption('incident');
            await incidentForm.locator('input').fill(incidentName);
            await incidentForm.locator('textarea').fill('Synthetic test incident; no physical machinery or customer data.');
            await incidentForm.getByRole('button', { name: 'Save Log Entry' }).click();
            await page.getByRole('heading', { name: incidentName }).waitFor();
            await page.getByRole('button', { name: 'Acknowledge' }).click();
            await page.getByRole('button', { name: 'Start work' }).waitFor();
            await page.getByRole('button', { name: 'Start work' }).click();
            await page.getByRole('button', { name: 'Mark resolved' }).waitFor();
            await page.getByRole('button', { name: 'Mark resolved' }).click();
            await page.getByText('Status history (4 recorded events)').waitFor();

            await page.getByRole('link', { name: 'Maintenance Analytics' }).click();
            await page.getByText('Resolved with full history').waitFor();
            await page.getByRole('heading', { name: 'Equipment with open maintenance cases' }).waitFor();
            await page.getByRole('heading', { name: 'New maintenance / incident records over time' }).waitFor();
            const eligibleCard = page.getByText('Resolved with full history').locator('..');
            assert.equal(await eligibleCard.getByText('1', { exact: true }).isVisible(), true);
            assert.equal(await page.getByText(/Not machine downtime, MTTR or MTBF/).isVisible(), true);

            await page.getByRole('link', { name: 'Asset Registry' }).click();
            await page.getByRole('searchbox', { name: 'Search assets' }).fill(serial);
            const [assetDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.getByRole('button', { name: 'Export filtered assets CSV' }).click(),
            ]);
            assert.match(assetDownload.suggestedFilename(), /^plantlog-assets-\d{4}-\d{2}-\d{2}\.csv$/);
            const exportedAssets = readFileSync(await assetDownload.path(), 'utf8');
            assert.ok(exportedAssets.includes(serial));
            assert.ok(exportedAssets.includes(equipmentName));
            await page.getByRole('button', { name: 'View' }).click();
            await page.getByRole('link', { name: /View maintenance history/ }).click();
            await page.getByRole('heading', { name: incidentName }).waitFor();

            await page.getByRole('button', { name: 'Sign out' }).click();
            await page.getByRole('heading', { name: 'Industrial E-Logbook' }).waitFor();
            await page.getByPlaceholder('Email address').fill(email);
            await page.getByPlaceholder('Password').fill('deliberately-incorrect');
            await page.getByRole('button', { name: 'Sign in', exact: true }).click();
            await page.getByText('Invalid credentials').waitFor();
            assert.equal(new URL(page.url()).pathname, '/login', 'Invalid credentials must not redirect/reload away from the login form');
        } catch (error) {
            mkdirSync(path.join(frontendRoot, 'test-artifacts'), { recursive: true });
            await page.screenshot({
                path: path.join(frontendRoot, 'test-artifacts', 'fullstack-browser-failure.png'),
                fullPage: true,
            }).catch(() => undefined);
            throw error;
        }
    });
