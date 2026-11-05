# TSI Firebase rules and local emulators

This package tests the Firestore Security Rules in the repository against the Firebase Local Emulator Suite. It does not connect to production Firebase and does not require a real project or service-account key.

## Prerequisites

- Node.js 22.12 or newer
- npm
- Java 21 or newer for the Firestore emulator

## Run the rules tests

From this directory:

```bash
npm install
npm test
```

The test command starts the Firestore emulator using the root `firebase.json`, runs the unit tests, and stops the emulator afterward. A demo project ID is used so no production data can be accessed.

To start the local Auth and Firestore emulators for manual work:

```bash
npx firebase --config ../../firebase.json emulators:start --project demo-tsi-local --only auth,firestore
```

The Emulator Suite UI is available at `http://127.0.0.1:4000`.

## Security model

- Rules deny access by default.
- Client reads are limited to an authenticated player's own private records, public profile reads, bounded participant match-history queries and season configuration.
- Clients cannot mutate account state, progression, inventory, match results, season configuration, reports or audit records.
- Trusted backend services will write these records only after validating the account and server-authenticated game events.

The Firestore Admin SDK bypasses Firestore Security Rules. Therefore server authorization, service-account permissions, input validation and audit logging remain mandatory. Never distribute an Admin SDK credential to the browser or mobile client.

## Important

These tests exercise the local emulator only. They do not prove that production rules have been deployed, nor do they secure a Cloud Firestore project that is configured with different rules. Before using real Firebase credentials, verify the production project ID, rules deployment, Authentication settings, App Check configuration and service-account permissions.
