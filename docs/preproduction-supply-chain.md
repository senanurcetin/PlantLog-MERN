# PlantLog — pre-production dependency provenance and SBOM evidence

**Engineering security control, not a production supply-chain certification.**

The frontend and backend use npm lockfile v3. Both lockfiles must resolve
packages **exclusively** from the canonical `https://registry.npmjs.org/`
endpoint and declare SHA-512 tarball integrity metadata. The earlier
third-party `registry.npmmirror.com` lockfile URLs were initially replaced
without changing their versions or integrity digests. Next, compatible
security-patch versions were updated with npm's non-force audit remediation;
all new tarballs still use the canonical registry with SHA-512 integrity.
This reduces
registry provenance ambiguity; the original downloaded tarballs have **not**
been independently compared to upstream source code.

## CI acceptance

The `supply-chain` job in `.github/workflows/ci.yml`:

1. Checks lockfile format, project identity, exact manifest dependency roots,
   approved registry host and SHA-512 metadata for every locked package.
2. Installs the locked trees using `npm ci --ignore-scripts` in dedicated
   CI directories, without running third-party installation hooks in the
   security-scanning job. Regular application build jobs still run their
   own install/test workflows.
3. Runs npm audit for **runtime dependencies** (`--omit=dev`) and for the
   complete lockfile; any **high** or **critical** runtime advisory blocks CI.
   Development dependency advisories are **reported** but not part of this
   runtime-only gate. All scans must return valid npm advisory metadata:
   registry errors and missing results are not treated as zero findings.
4. Generates separate runtime **CycloneDX JSON** SBOM inventories from the
   locally installed backend/frontend dependency trees.
5. Uploads `plantlog-supply-chain-evidence` with a fixed JSON report and
   two CycloneDX inventories. These contain only package names, dependency
   graph, known advisories/counts, resolved registry hostname and SHA-256
   hashes of lockfiles. **No tokens, credentials, machine records or
   test user data** are intentionally included.

The report's `fullDependencyAudit` is **not** an assertion that
development/build tooling is secure. Any findings should be triaged for their
impact on CI, static build artifacts and transitive tooling. A green scan
does not demonstrate absence of unreported vulnerabilities.

## Observed PR validation (26 October 2026)

After the compatible remediation, runtime **HIGH/CRITICAL counts are zero**
in both projects. The npm audit report still identifies **one moderate**
backend runtime advisory (`qs`), **two moderate** frontend runtime
advisories (`react-router` and `react-router-dom`), and **one high**
frontend full-tree/build-tool advisory. These results are time-sensitive;
refer to the latest attached CI `supply-chain-report.json` rather than
assuming the counts remain current.

Any unresolved developer-tool warning is **not a safe-to-ignore verdict**:
build-time code executes in CI, even if not shipped to guest browsers.
Major-version framework/build changes need their own compatibility and
real-Chromium validation instead of being silently forced into this PR.

## Non-claims and release gate

This job is an automated npm advisory check and component inventory. It is
**not** independent penetration testing, complete SAST/DAST, artifact signing,
SLSA provenance/attestation, vulnerability exploitability analysis, package
maintainer verification, branch-protection enforcement or license compliance.
GitHub-hosted scans require network access to the npm audit service. An
unstable npm service can fail the job (fail closed) until verified.

**G08 remains HOLD** until dependency governance, developer build-tool
advisories, review ownership, signed provenance, CI permissions/attestation,
branch protection and an independent threat model are validated. No
industrial production release is authorized.
