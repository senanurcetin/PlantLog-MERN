# MongoDB data integrity — synthetic demo

PlantLog remains an advanced synthetic engineering demonstrator. The public
Vercel /demo is API-free, read-only and static. Express and MongoDB are tested
on loopback and disposable CI databases only, not public industrial workloads.

## Serial number consistency and concurrency

The assets collection requires a unique MongoDB index named
serial_number_unique_casefold, on { serialNumber: 1 }, with collation
{ locale: 'en', strength: 2 }. Case variants of an equipment serial
are the same identity. The API performs a case-insensitive existence
check for a readable 400; **the unique DB index is authoritative** and
enforces the invariant even if two creates race after preflight.
Duplicate-key errors are mapped to 409 by the existing API error handler.

Backend startup waits for Mongoose asset and user indexes to initialize,
then verifies the casefold unique index before listening for requests.
If the index cannot be created or verified, startup refuses service and
disconnects the database. It does not downgrade the uniqueness policy.

Existing disposable Mongo databases containing case-only duplicate serials
must be reviewed and fixed manually before the index can be built. Do not
drop arbitrary records or use syncIndexes() blindly; startup never erases
existing data. A legacy case-sensitive index may coexist but is insufficient.
Inspect index metadata using db.assets.getIndexes() from mongosh.

## User email compatibility

The User Mongo schema now follows the API's email shape and maximum length
(254 characters), so domains such as example.technology no longer fail
at persistence after registration validation. Stored email case is normalized.
This does not constitute email-domain verification or account recovery.

## Validation

- npm test: backend schema, authorization and integrity policy unit tests
- npm run test:integration: real Express + ephemeral localhost MongoDB tests
- Integration tests enforce the physical unique index and simultaneous
  inserts with differently cased serials; one insertion must fail with 11000
- Integration tests register and log in with a long-TLD synthetic email
- CI Mongo databases are uniquely named plantlog_integration_* and destroyed
  after the suite; do not direct these tests at real user databases

CI permission has been granted for development. Publishing the final public
synthetic demo does **not** imply approval to expose the authenticated
Express/Mongo API or real operational data. Industrial production gates
G01-G10 remain a separate scope.
