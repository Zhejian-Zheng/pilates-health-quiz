-- AlterTable
ALTER TABLE "User"
ADD COLUMN "email" TEXT,
ADD COLUMN "displayName" TEXT,
ADD COLUMN "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
