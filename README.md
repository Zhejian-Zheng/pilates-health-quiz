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

## Environment Variables

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

Use a server-side PostgreSQL connection string only. Do not expose this value in frontend code.

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

After payment, `GET /api/results/{sessionId}` returns the full result including recommended calories, target date, detailed recommendations, and projection curve.

## Tests

```bash
npm test
npm run lint
npm run build
```

Current coverage includes the health assessment algorithm, BMI categories, calorie/target projection behavior, and invalid age, height, weight, and target-weight boundaries.
