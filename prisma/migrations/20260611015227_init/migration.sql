-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "flowId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AssessmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "currentWeightKg" DOUBLE PRECISION NOT NULL,
    "targetWeightKg" DOUBLE PRECISION NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "bmiCategory" TEXT NOT NULL,
    "recommendedCalories" INTEGER NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "detailedRecommendation" JSONB NOT NULL,
    "projectionCurve" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionId_key" ON "User"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswer_assessmentId_questionKey_key" ON "AssessmentAnswer"("assessmentId", "questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_assessmentId_key" ON "HealthProfile"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_assessmentId_key" ON "AssessmentResult"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "AssessmentSession" ADD CONSTRAINT "AssessmentSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "AssessmentSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
