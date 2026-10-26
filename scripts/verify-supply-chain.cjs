/**
 * Pre-production supply-chain proof for both lockfiles. Requires npm ci first.
 * No secrets, credentials or environmental URLs are read or exported.
 * Never silently treats audit registry/network failure as no advisories.
 */
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const projects = ['backend', 'frontend'];
const outfile = path.join(root, 'test-artifacts', 'supply-chain');
const severities = ['info', 'low', 'moderate', 'high', 'critical'];

const verifyLockfile = (project) => {
    if (!projects.includes(project)) throw Error('Unsupported project');
    const folder = path.join(root, project);
    const manifest = JSON.parse(readFileSync(path.join(folder, 'package.json'), 'utf8'));
    const bytes = readFileSync(path.join(folder, 'package-lock.json'));
    const lock = JSON.parse(bytes.toString('utf8'));
    if (lock.lockfileVersion !== 3 || lock.name !== manifest.name) {
        throw Error('Lockfile format or package identity mismatch: ' + project);
    }
    const rootPackage = lock.packages[''];
    if (!rootPackage || JSON.stringify(rootPackage.dependencies || {}) !==
        JSON.stringify(manifest.dependencies || {}) ||
        JSON.stringify(rootPackage.devDependencies || {}) !==
        JSON.stringify(manifest.devDependencies || {})) {
        throw Error('Manifest / lockfile dependency divergence: ' + project);
    }
    let packageCount = 0;
    for (const [name, pkg] of Object.entries(lock.packages)) {
        if (!name) continue;
        packageCount++;
        if (!pkg.resolved || !pkg.resolved.startsWith('https://registry.npmjs.org/') ||
            !/^sha512-[A-Za-z0-9+/=]+$/.test(pkg.integrity || '')) {
            throw Error('Unapproved registry source or missing SHA-512 integrity: ' + name);
        }
    }
    if (packageCount < 1) throw Error('Empty dependency tree: ' + project);
    return {
        project,
        lockfileSha256: createHash('sha256').update(bytes).digest('hex'),
        totalLockedPackages: packageCount,
        registry: 'https://registry.npmjs.org/',
        verifiedSha512: true,
    };
};

const validateAudit = (result, label) => {
    if (!result || typeof result !== 'object' || !result.metadata ||
        !result.metadata.vulnerabilities) {
        throw Error('npm audit produced no trusted vulnerability metadata: ' + label);
    }
    const v = result.metadata.vulnerabilities;
    const count = Object.fromEntries(severities.map(k => [k, v[k] || 0]));
    for (const n of Object.values(count)) {
        if (!Number.isInteger(n) || n < 0) throw Error('Invalid npm audit totals: ' + label);
    }
    return {
        vulnerabilityCounts: count,
        highOrCritical: count.high + count.critical,
        affectedPackageNames: Object.keys(result.vulnerabilities || {}).sort(),
    };
};

const audit = (folder, omitDev) => {
    const argv = ['audit', '--json', '--audit-level=high'];
    if (omitDev) argv.push('--omit=dev');
    const run = spawnSync('npm', argv, {
        cwd: folder, encoding: 'utf8', timeout: 120000,
        maxBuffer: 12 * 1024 * 1024,
        env: { ...process.env, npm_config_fund: 'false' },
    });
    if (run.error || ![0, 1].includes(run.status)) {
        throw Error('npm audit execution failed (not a clean dependency result)');
    }
    let data;
    try { data = JSON.parse(run.stdout); }
    catch { throw Error('npm audit output was not JSON'); }
    return validateAudit(data, omitDev ? 'runtime' : 'full');
};

const sbom = (folder, project) => {
    const run = spawnSync('npm',
        ['sbom', '--sbom-format=cyclonedx', '--sbom-type=application', '--omit=dev'], {
            cwd: folder, encoding: 'utf8', timeout: 120000,
            maxBuffer: 18 * 1024 * 1024,
        });
    if (run.error || run.status !== 0) throw Error('CycloneDX generation failed: ' + project);
    let bom;
    try { bom = JSON.parse(run.stdout); }
    catch { throw Error('CycloneDX output was not JSON: ' + project); }
    if (bom.bomFormat !== 'CycloneDX' || !Array.isArray(bom.components) ||
        bom.components.length === 0 || !bom.metadata || !bom.specVersion) {
        throw Error('Malformed or empty CycloneDX inventory: ' + project);
    }
    writeFileSync(path.join(outfile, project + '-runtime.cdx.json'),
        JSON.stringify(bom, null, 2) + '\n');
    return { format: bom.bomFormat, specification: bom.specVersion,
        components: bom.components.length };
};

const main = () => {
    mkdirSync(outfile, { recursive: true });
    const result = {
        schemaVersion: 1,
        scope: 'Pre-production CI; package manifest and canonical npm registry only',
        releaseAuthorized: false,
        productionSupplyChainCertified: false,
        projects: [],
    };
    let blocked = false;
    for (const project of projects) {
        const lock = verifyLockfile(project);
        const folder = path.join(root, project);
        const runtime = audit(folder, true);
        const full = audit(folder, false);
        const inventory = sbom(folder, project);
        if (runtime.highOrCritical > 0) blocked = true;
        result.projects.push({
            ...lock, runtimeAudit: runtime, fullDependencyAudit: full,
            runtimeSbom: inventory,
        });
    }
    result.policy = {
        runtimeHighOrCriticalBlock: true,
        developmentDependencyAuditReportedButNotReleaseGated: true,
        scannerRegistryFailureFailsCI: true,
        result: blocked ? 'BLOCKED_RUNTIME_VULNERABILITIES' : 'PASS',
    };
    writeFileSync(path.join(outfile, 'supply-chain-report.json'),
        JSON.stringify(result, null, 2) + '\n');
    if (blocked) throw Error('HIGH/CRITICAL runtime advisories require manual remediation');
    process.stdout.write('Pre-production supply-chain proof PASS: 2 lockfiles, npm runtime audit and CycloneDX inventories\n');
};

if (require.main === module) {
    try { main(); }
    catch (error) {
        process.stderr.write('Supply-chain verification failed: ' + (error.message || 'unknown') + '\n');
        process.exitCode = 1;
    }
}
module.exports = { verifyLockfile, validateAudit };
