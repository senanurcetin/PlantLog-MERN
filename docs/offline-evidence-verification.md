# PlantLog — offline scientific evidence verification

**Scope:** Synthetic, pre-production portfolio data only. This is a local
software-integrity check, not an electronic signature, chain-of-custody
attestation, independent field observation, validated industrial historian or
production-readiness authorization.

## What is checked

[The offline verifier](../frontend/scripts/verify-scientific-evidence.cjs)
reads a previously generated `scientific-evidence.json` artifact as
**read-only input**. It first requires a regular file no larger than 1 MiB.
It then applies three distinct rules:

1. **Parseability and contract:** valid JSON object with known
   `schemaVersion: 5`.
2. **Canonical representation:** the exact deterministic serialization is
   `JSON.stringify(report, null, 2) + '\n'`. Alternate whitespace, key
   order, extra bytes or missing final newline are not the archived format.
3. **Reconstruction from local sources:** independently call
   `buildReport()` using the currently checked-out fictional fixture and
   implementation, then compare the two byte buffers. This detects
   changes to metric counts, synthetic fault classifications, fixture
   checksums, missing fields and stale artifacts.

Successful verification prints the artifact SHA-256, fixture SHA-256,
schema version and total bytes. Failed verification returns exit status 1
and a **reason code**, without outputting artifact contents. It never
rewrites the input, downloads dependencies, calls a backend or deploys.
Excessive argument counts are rejected with exit status 2.

## Reproduce without CI

Run these commands locally from the repository:

```bash
cd frontend
npm ci
npm run test:demo
npm run evidence:verify
```

To inspect a saved local copy, without overwriting it:

```bash
node scripts/verify-scientific-evidence.cjs path/to/archived-scientific-evidence.json
```

The file is checked against **the code and fixture revision currently on
disk**. For an older artifact, first check out the same trusted source
revision and install that revision's locked dependencies. A hash match
against different code is not assumed or fabricated.

## Fail-closed diagnostics

| Result | Meaning |
| --- | --- |
| `VERIFIED` | Canonical bytes match reconstructed local evidence |
| `MISSING_ARTIFACT` | Specified file does not exist |
| `NOT_REGULAR_FILE` | Input is a directory, symbolic link or special file |
| `READ_ERROR` | File was not safely readable |
| `OVERSIZE` | Input exceeds the 1 MiB limit |
| `INVALID_JSON` | Input is syntactically invalid or truncated JSON |
| `SCHEMA_MISMATCH` | JSON is not the expected version 5 report object |
| `NON_CANONICAL` | JSON can be parsed but the bytes differ from canonical formatting |
| `CONTENT_MISMATCH` | Canonical JSON differs from a fresh source rebuild |
| `INVALID_INPUT` | An unsupported in-memory argument was passed to the pure verifier |

The local [adversarial tests](../frontend/tests/demo-evidence-verifier.test.cjs)
check altered numeric results, swapped fixture digests, invalidated UTC
expectations, truncated or noncanonical JSON, incompatible schema, unreadable
paths and preservation of the original saved file. The verifier is included
in `npm run test:demo`; it is **not** a CI setup or an auto-deployment.

## Trust limits and release posture

SHA-256 is a *checksum* and does not prove who produced a report. A person
who controls both the stored artifact and the checked-out source can change
both consistently; there is no external signature, trusted timestamp,
immutable transparency log or independently held original digest here.

This verifier does not authenticate event actors, industrial controller
values, actual response times, machine downtime, repair effectiveness,
MTTR, MTBF or regulatory/safety compliance. The generated report is
only evidence of deterministic computations on publicly documented
fictional inputs. All
[pre-production release gates](preproduction-readiness.md) remain **HOLD**.
