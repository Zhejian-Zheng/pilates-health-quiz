**English** | [中文](README.md)

# Pilates Health Quiz

[![CI](https://github.com/Zhejian-Zheng/pilates-health-quiz/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Zhejian-Zheng/pilates-health-quiz/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
[![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)](https://pilates-health-quiz-f4kpp6lnj-zhejians-projects.vercel.app/)

A full-stack Next.js health-assessment conversion-funnel project, featuring account login, guest assessment, step-by-step answer persistence, progress recovery, server-side health-result calculation, subscription-status control, and mock-payment unlocking.

The project currently leans more toward an engineering prototype: the focus is on data flow, API boundary validation, account/session binding, payment idempotency, and automated testing.

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7
- Supabase PostgreSQL
- Zod
- Vitest
- Tailwind CSS

## Quick local start

Node.js 20 or higher is recommended.

```bash
npm install
cp .env.example .env
```

Edit `.env` and configure at least:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_COOKIE_SECRET="replace-with-a-long-random-secret"
PAY_WEBHOOK_SECRET="replace-with-a-shared-webhook-secret"
```

If you are using a remote Supabase or an existing database, run:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

For a local development database, you can also use:

```bash
npx prisma migrate dev
npm run dev
```

The app runs by default at:

```text
http://localhost:3000
```

If `npm install` is slow on networks inside China, you can temporarily use an npm mirror:

```bash
npm install --registry=https://registry.npmmirror.com
```

## Environment variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
AUTH_COOKIE_SECRET="replace-with-a-long-random-secret"
PAY_WEBHOOK_SECRET="replace-with-a-shared-webhook-secret"
```

Notes:

- `DATABASE_URL`: the server-side PostgreSQL connection string. It must not be exposed to the frontend.
- `AUTH_COOKIE_SECRET`: used to sign the account login cookie. Production must use a sufficiently long random string.
- `PAY_WEBHOOK_SECRET`: used to verify the `/pay` webhook signature. It can be omitted for purely local mock payments, but is recommended for production.

## User flow

The app's home page is the assessment entry point.

1. Users can register, log in, or continue in guest mode.
2. The guest/user answers the health-assessment questions.
3. Every step's answers are saved to the backend session.
4. When the browser is refreshed, the backend restores the current session via an httpOnly cookie.
5. After the assessment is completed, the server calculates and saves the health result.
6. Non-members can only see a locked preview, including BMI, category, and a basic summary.
7. When a guest clicks "Log in to continue to the next step" on the results page, a login/register modal pops up. The modal no longer shows "Continue as guest".
8. After a guest registers, the current guest session is upgraded and bound to the new account, so the just-completed assessment result is not lost.
9. Even after logging in or registering, the full plan is still not unlocked automatically; the user must click "Unlock full plan" to trigger the mock payment.
10. After the mock payment succeeds, the subscription status becomes `ACTIVE` and the full result is unlocked.

## Accounts and authentication

Account functionality is implemented with custom APIs; NextAuth is not used.

Related endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Authentication implementation:

- `User.email` is unique.
- Passwords are never stored in plaintext. The server hashes them with a salt using Node.js `crypto.scrypt` and writes the result to `User.passwordHash`.
- After a successful login, an httpOnly account cookie is written: `pilates_health_quiz_account`.
- Assessment progress uses a separate httpOnly session cookie: `pilates_health_quiz_session`.
- When a guest registers, if the current browser already has a guest session, that guest `User` is upgraded directly into an account user.

Example registration request:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Kevin",
    "email": "kevin@example.com",
    "password": "123456"
  }'
```

Example login request:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kevin@example.com",
    "password": "123456"
  }'
```

Log out:

```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## Session and assessment API

Create an assessment session:

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"flowId":"2117"}'
```

Incrementally save answers:

```bash
curl -X PATCH http://localhost:3000/api/sessions/{sessionId}/answers \
  -H "Content-Type: application/json" \
  -d '{
    "currentStep": 1,
    "answers": [
      {"stepKey":"ageRange","questionKey":"ageRange","value":"30-39"}
    ]
  }'
```

The API will reject:

- Skipping incomplete steps
- Moving `currentStep` backward
- Unknown question keys
- Unsupported enum values
- Numeric values outside reasonable ranges
- Answer updates after the assessment has been completed

### API path design and validation notes

API paths are split by resource responsibility, avoiding mixing assessment, result, account, and payment logic into a single endpoint:

- `POST /api/sessions`: create an assessment session.
- `GET /api/sessions/current`: restore the current browser's assessment progress via the httpOnly cookie.
- `GET /api/sessions/{sessionId}`: read the progress of a specific session.
- `PATCH /api/sessions/{sessionId}/answers`: incrementally save answers.
- `POST /api/sessions/{sessionId}/complete`: complete the assessment; the server generates the health result.
- `GET /api/results/current`: read the result for the current browser session.
- `GET /api/results/{sessionId}`: read the result for a specific session.
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`: account registration, login, and logout.
- `POST /pay`: mock payment callback; `POST /api/pay` is kept for compatibility.

Data validation does not rely on the frontend alone; it is handled on the server in three layers:

- Request-structure layer: Zod validates the body structure, field lengths, array lengths, integer ranges, and JSON validity.
- Business value-domain layer: applies whitelists and upper/lower bounds to height, weight, age, and enum questions.
- Flow-state layer: validates whether a step is skipped, moved backward, an unknown question is submitted, or modifications continue after completion.

As a result, even if an attacker bypasses the frontend and calls the API directly, the endpoint still rejects illegal values, out-of-range values, and out-of-order flows.

### Protection against illegal numeric injection and out-of-range input

The answer-saving endpoint `PATCH /api/sessions/{sessionId}/answers` first passes through the Zod schema and the business value checks before writing to the database.

Protection points:

- `value` must be a valid JSON value; non-finite numbers such as `NaN` and `Infinity` are rejected.
- Height `heightCm` must be a number, limited to `100-250`.
- Current weight `currentWeightKg` and target weight `targetWeightKg` must be numbers, limited to `30-300`.
- Age `age` must be an integer, limited to `13-100`.
- Numeric fields reject string injection, e.g. `"165; DROP TABLE"`.
- Numeric fields reject object or array injection, e.g. `{ "kg": 80 }`, `[70]`.
- Enum fields only accept whitelisted values.

Related implementation:

- `src/lib/schemas.ts`: `saveAnswersSchema`, `validateAnswerValues`, `assertNumberInRange`, `assertIntegerInRange`
- `src/app/api/sessions/[sessionId]/answers/route.ts`: calls validation before persistence; returns `400` or `422` on failure

Related test coverage:

- `tests/schemas.test.ts`: covers out-of-range values, non-numeric injection, `NaN`, and other schema/business validation
- `tests/api-flow.test.ts`: covers out-of-range saves and numeric-injection requests at the endpoint boundary
- `tests/health-assessment.test.ts`: covers non-finite numbers and unreasonable health data during the server-side health-calculation stage

Restore the current browser session:

```bash
curl http://localhost:3000/api/sessions/current
```

Get progress by sessionId:

```bash
curl http://localhost:3000/api/sessions/{sessionId}
```

Complete the assessment and calculate the result:

```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/complete
```

Get the current browser result:

```bash
curl http://localhost:3000/api/results/current
```

Get the result by sessionId:

```bash
curl http://localhost:3000/api/results/{sessionId}
```

## Subscription and mock payment

This project includes a mock payment endpoint `/pay` that does not charge any real fees. The old path `/api/pay` is still kept for compatibility.

When not paid, the result endpoint returns:

- `access: "LOCKED"`
- `subscriptionStatus`
- BMI
- BMI category
- A basic summary
- `paywall.protectedFields`

Protected fields do not appear in non-member responses:

- `recommendedCalories`
- `targetDate`
- `detailedRecommendation`
- `projectionCurve`

Example locked response:

```json
{
  "sessionId": "demo-session-id",
  "subscriptionStatus": "INACTIVE",
  "access": "LOCKED",
  "result": {
    "bmi": 24.6,
    "bmiCategory": "Healthy",
    "summary": "Your BMI is in the healthy range.",
    "paywall": {
      "message": "Upgrade to unlock your full Pilates plan.",
      "protectedFields": [
        "recommendedCalories",
        "targetDate",
        "detailedRecommendation",
        "projectionCurve"
      ]
    }
  }
}
```

Mock payment callback:

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "providerEventId": "evt_demo_001",
    "payload": {
      "source": "readme-demo"
    }
  }'
```

Replayable call pattern:

```bash
# First call: create a PaymentEvent and update the subscription status to ACTIVE
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "providerEventId": "evt_replay_demo_001",
    "payload": {
      "source": "readme-replay-demo"
    }
  }'

# Second call: using the exact same providerEventId, no duplicate payment event is created
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "{sessionId}",
    "providerEventId": "evt_replay_demo_001",
    "payload": {
      "source": "readme-replay-demo"
    }
  }'
```

The second response returns:

```json
{
  "idempotentReplay": true,
  "subscriptionStatus": "ACTIVE"
}
```

After a successful payment:

- A `PaymentEvent` is written
- `Subscription.status` is updated to `ACTIVE`
- The same result endpoint returns `access: "FULL"`
- The full result includes recommended calories, target date, detailed recommendations, and the projection curve

In production, `/pay` should be replaced with a real payment-provider webhook, such as Stripe or Paddle. A real webhook must verify the signature, amount, currency, and event ID, and must guarantee idempotency.

Example signed payment request:

```bash
curl -X POST http://localhost:3000/pay \
  -H "Content-Type: application/json" \
  -H "x-pay-signature: SIGNATURE_HEX" \
  -d '{"sessionId":"{sessionId}","providerEventId":"evt_123","payload":{"mock":true}}'
```

Generate a paid demo session:

```bash
APP_URL=http://localhost:3000 npm run demo:paid-session
```

After deployment, use the live URL:

```bash
APP_URL=https://your-deployed-app.vercel.app npm run demo:paid-session
```

## Database schema

The current Prisma schema has been upgraded to a production-grade CRM / health-SaaS structure: it keeps the core loop of assessment, accounts, and payment, while also reserving room for organization tenants, staff permissions, CRM follow-up, question-bank versioning, consent records, and audit logs.

```mermaid
erDiagram
  Organization ||--o{ OrganizationMembership : has
  Organization ||--o{ CrmLead : owns
  Organization ||--o{ AuditLog : scopes
  User ||--o{ OrganizationMembership : joins
  User ||--o{ AssessmentSession : takes
  User ||--o| UserProfile : extends
  User ||--o{ AuthSession : logs_in
  User ||--o| Subscription : owns
  User ||--o{ ConsentRecord : grants
  User ||--o{ PaymentEvent : pays
  User ||--o{ CrmLead : becomes
  User ||--o{ CrmLead : owns
  AssessmentFlow ||--o{ AssessmentQuestion : defines
  AssessmentQuestion ||--o{ AssessmentQuestionOption : offers
  AssessmentQuestion ||--o{ AssessmentAnswer : receives
  AssessmentSession ||--o{ AssessmentAnswer : stores
  AssessmentSession ||--o| HealthProfile : extracts
  AssessmentSession ||--o| AssessmentResult : calculates
  Plan ||--o{ Subscription : prices
  CrmLead ||--o{ CrmNote : records
  CrmLead ||--o{ CommunicationEvent : contacts
```

Core table layers:

- Accounts and permissions: `User`, `UserProfile`, `AuthSession`, `Organization`, `OrganizationMembership`
- Assessment content and answers: `AssessmentFlow`, `AssessmentQuestion`, `AssessmentQuestionOption`, `AssessmentSession`, `AssessmentAnswer`
- Health results: `HealthProfile`, `AssessmentResult`
- Monetization: `Plan`, `Subscription`, `PaymentEvent`
- CRM: `CrmLead`, `CrmNote`, `CommunicationEvent`
- Compliance and operations: `ConsentRecord`, `AuditLog`

Key constraints and design trade-offs:

- `User.email` is unique and used for account login; `User.sessionId` is unique and used to stay compatible with the current guest-session recovery.
- `User.passwordHash` stores only the hash, never the plaintext password.
- `OrganizationMembership` is unique on `(organizationId, userId)`, supporting a single user joining multiple organizations with different roles.
- `AssessmentFlow` uses a `slug + version` unique constraint, so the question bank can be versioned and published, and historical assessment results are not distorted when questions change.
- `AssessmentAnswer` is unique on `(assessmentId, questionKey)`; resubmitting updates the existing answer instead of producing dirty duplicate rows.
- `Subscription.status` uses an enum: `INACTIVE`, `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`.
- `PaymentEvent.providerEventId` is unique, used for payment-webhook idempotency, preventing duplicate callbacks from re-activating membership.
- `CrmLead.stage`, `CommunicationEvent.status`, `ConsentRecord.type`, and `AuditLog` are all indexed to make back-office filtering, follow-up, and compliance tracking easier.
- Fast-changing, potentially extensible fields in health and CRM use `Json`, e.g. `medicalNotes`, `riskFlags`, `features`, `metadata`, avoiding a table migration for every product experiment.
- User deletion uses a `deletedAt` soft-delete field, so audit, payment, and assessment history can still be retained.

## Common commands

```bash
npm run dev
npm run build
npm run lint
npm test
npx tsc --noEmit
npx prisma generate
npx prisma migrate deploy
```

## Testing

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Test coverage:

- Health-assessment algorithm and BMI classification boundaries
- Calorie and target-date projection
- Input-range validation and illegal-data interception
- Answer-saving state machine: step skipping, out-of-order, backward, unknown key
- Duplicate-answer updates and concurrent PATCH
- Forbidding answer modification after the assessment is completed
- Non-member result-field protection
- Mock payment, webhook signature, and idempotency
- Account password hashing, account cookie signing, and auth schema

When `DATABASE_URL` is configured, the database-dependent integration tests will run. CI starts a PostgreSQL service and runs the migrations. If you connect to a remote Supabase database locally, note that the tests will write to it.

## Continuous integration

The GitHub Actions configuration is at `.github/workflows/ci.yml`. The main steps are:

- `npm ci`
- `npx prisma migrate deploy`
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run build`

## Quality notes

- Protected result fields are determined solely by the server-side subscription status; frontend state cannot bypass them.
- Passwords store only the scrypt hash, never plaintext.
- The account cookie is httpOnly and carries an HMAC signature.
- Health calculation runs only on the server, and the result is persisted.
- Answer saving uses `upsert`, so the same question never generates duplicate answer rows.
- Payment events are made idempotent via `providerEventId`, preventing duplicate payment callbacks from causing duplicate state changes.

## Deployment checklist

1. Create a PostgreSQL/Supabase database.
2. Configure the production environment variables: `DATABASE_URL`, `AUTH_COOKIE_SECRET`, `PAY_WEBHOOK_SECRET`.
3. Before release, run:

```bash
npx prisma migrate deploy
npm run build
```

4. Deploy to Vercel or another Node.js hosting platform.
5. Visit the live URL and run the full flow end to end:

```text
register / enter as guest -> complete the assessment -> see the locked result -> log in / register -> click unlock -> see the full result
```

6. To submit demo data, generate a paid session:

```bash
APP_URL=https://your-deployed-app npm run demo:paid-session
```

## AI collaboration notes

During development, AI was used to help organize the database schema, API boundaries, exception scenarios, and test cases. All key implementations were manually reviewed and validated through type checking, lint, tests, and build.

Prisma interactive transactions were evaluated, but they tend to cause `P2028` transaction-start timeouts in Supabase connection-pool scenarios. The current implementation therefore leans toward Prisma nested writes, explicit `upsert`, and short transactions to improve stability.
