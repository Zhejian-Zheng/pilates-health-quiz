# Pilates Health Quiz

A full-stack health assessment funnel inspired by BetterMe Pilates. The project focuses on the backend foundation: step-by-step persistence, progress recovery, server-side health scoring, subscription-gated results, and automated tests.

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma 7
- Supabase PostgreSQL
- Zod
- Vitest

## Getting Started

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

The app runs at `http://localhost:3000`.

## User Flow

The home page is the working quiz funnel:

1. Select an age range to create an anonymous session.
2. Answer gender, goal, activity level, height, current weight, target weight, and exact age.
3. Each step is saved to the backend immediately.
4. Refreshing the browser restores progress from the saved `sessionId`.
5. Completing the quiz calculates and stores the result on the server.
6. The result is locked for non-members and unlocked after the simulated `/api/pay` callback.

## Environment Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
PAY_WEBHOOK_SECRET="replace-with-a-shared-webhook-secret"
```

Use a server-side PostgreSQL connection string only. Do not expose this value in frontend code.
`PAY_WEBHOOK_SECRET` is required in production for `/api/pay` signature verification. Local development can omit it for the simulated paywall button.

## API Flow

Create a session:

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"flowId":"2117"}'
```

Save answers incrementally:

```bash
curl -X PATCH http://localhost:3000/api/sessions/{sessionId}/answers \
  -H "Content-Type: application/json" \
  -d '{
    "currentStep": 31,
    "answers": [
      {"stepKey":"gender","questionKey":"gender","value":"female"},
      {"stepKey":"goal","questionKey":"goal","value":"Lose weight"},
      {"stepKey":"age","questionKey":"age","value":30},
      {"stepKey":"heightCm","questionKey":"heightCm","value":165},
      {"stepKey":"currentWeightKg","questionKey":"currentWeightKg","value":80},
      {"stepKey":"targetWeightKg","questionKey":"targetWeightKg","value":70},
      {"stepKey":"activityLevel","questionKey":"activityLevel","value":"moderate"}
    ]
  }'
```

Recover progress:

```bash
curl http://localhost:3000/api/sessions/{sessionId}
```

Complete the assessment and calculate results:

```bash
curl -X POST http://localhost:3000/api/sessions/{sessionId}/complete
```

Fetch gated results:

```bash
curl http://localhost:3000/api/results/{sessionId}
```

Simulate payment:

```bash
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"{sessionId}","payload":{"mock":true}}'
```

Production webhook requests must include an `x-pay-signature` HMAC-SHA256 signature over the raw JSON body using `PAY_WEBHOOK_SECRET`. Include a stable `providerEventId` to make retries idempotent:

```bash
curl -X POST http://localhost:3000/api/pay \
  -H "Content-Type: application/json" \
  -H "x-pay-signature: SIGNATURE_HEX" \
  -d '{"sessionId":"{sessionId}","providerEventId":"evt_123","payload":{"mock":true}}'
```

After payment, `GET /api/results/{sessionId}` returns the full result including recommended calories, target date, detailed recommendations, and projection curve.

Generate a paid demo session for review:

```bash
APP_URL=http://localhost:3000 npm run demo:paid-session
```

Use the deployed URL after deployment:

```bash
APP_URL=https://your-deployed-app.vercel.app npm run demo:paid-session
```

## Database Schema

```mermaid
erDiagram
  User ||--o{ AssessmentSession : has
  User ||--o| Subscription : owns
  AssessmentSession ||--o{ AssessmentAnswer : stores
  AssessmentSession ||--o| HealthProfile : extracts
  AssessmentSession ||--o| AssessmentResult : calculates

  User {
    string id
    string sessionId
    datetime createdAt
    datetime updatedAt
  }

  AssessmentSession {
    string id
    string userId
    string status
    int currentStep
    string flowId
    datetime completedAt
  }

  AssessmentAnswer {
    string id
    string assessmentId
    string stepKey
    string questionKey
    json value
  }

  HealthProfile {
    string id
    string assessmentId
    string gender
    string goal
    int age
    float heightCm
    float currentWeightKg
    float targetWeightKg
    string activityLevel
  }

  AssessmentResult {
    string id
    string assessmentId
    float bmi
    string bmiCategory
    int recommendedCalories
    datetime targetDate
    json detailedRecommendation
    json projectionCurve
  }

  Subscription {
    string id
    string userId
    string status
    datetime startedAt
    datetime expiresAt
  }

  PaymentEvent {
    string id
    string providerEventId
    string sessionId
    string eventType
    json payload
  }
```

## Tests

```bash
npm test
npm run lint
npm run build
```

Current coverage includes:

- Health assessment algorithm unit tests.
- BMI category boundaries.
- Calorie and target projection behavior.
- Invalid age, height, current weight, target weight, and unrealistic target boundaries.
- Database-backed API flow for session creation, answer persistence, completion, unpaid result gating, `/pay`, and paid result unlocking.
- Missing required answer behavior for the complete endpoint.
- Funnel state-machine boundaries for skipped steps and unknown question keys.
- Payment webhook signature helper behavior and idempotent replay handling.

The API flow tests run when `DATABASE_URL` is available. Without it, they are skipped so CI can be configured incrementally.

## Quality Notes

- Non-members never receive protected fields such as `projectionCurve` or `detailedRecommendation`.
- The `/pay` endpoint records a `PaymentEvent` and upgrades the user's subscription to `ACTIVE`.
- `/api/pay` verifies signed webhook bodies when `PAY_WEBHOOK_SECRET` is configured and uses `providerEventId` as a unique idempotency key.
- `AssessmentAnswer` uses a unique `(assessmentId, questionKey)` constraint so repeated submissions update the same answer instead of creating duplicates.
- Funnel answers must follow the configured step order before completion can calculate a result.
- Health calculations run server-side only and are persisted before the result page is shown.

## AI Collaboration Notes

AI was used to accelerate schema planning, API shape, edge-case enumeration, and test generation. The generated direction was reviewed against the challenge requirements before implementation.

One AI-suggested approach that was rejected was using an interactive Prisma transaction for session creation. Against the Supabase pooler it produced a `P2028` transaction startup timeout, so the implementation was changed to a nested Prisma write for session creation and explicit upserts for answer persistence. This kept the flow reliable while preserving idempotent answer updates.

## Deployment Checklist

These require account access and should be completed before submission:

- Deploy the app to Vercel or another public host.
- Add `DATABASE_URL` to the deployment environment variables.
- Run `npx prisma migrate deploy` in the deployment pipeline or before release.
- Run `APP_URL=https://your-deployed-app npm run demo:paid-session` and paste the paid `sessionId` into your submission notes.
- Confirm the public URL can complete the quiz, show locked results, call `/api/pay`, and show full results.
- Optional: add GitHub Actions for `npm test`, `npm run lint`, and `npm run build`.
