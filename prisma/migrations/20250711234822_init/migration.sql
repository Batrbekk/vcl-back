-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionExpiresAt" DATETIME,
    "maxAgents" INTEGER NOT NULL DEFAULT 10,
    "maxPhoneNumbers" INTEGER NOT NULL DEFAULT 5,
    "maxManagers" INTEGER NOT NULL DEFAULT 3,
    "maxMonthlyCalls" INTEGER NOT NULL DEFAULT 1000,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Company_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "resetPasswordCode" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'manager',
    "adminId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Manager_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Manager_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "greetingTemplate" TEXT NOT NULL,
    "fallbackTemplate" TEXT NOT NULL,
    "summaryTemplate" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "integratedWithAi" BOOLEAN NOT NULL DEFAULT true,
    "aiModel" TEXT NOT NULL,
    "aiContextPrompt" TEXT NOT NULL,
    "elevenLabsAgentId" TEXT,
    "voiceStability" REAL NOT NULL DEFAULT 0.5,
    "voiceSimilarityBoost" REAL NOT NULL DEFAULT 0.5,
    "voiceStyle" REAL NOT NULL DEFAULT 0.5,
    "voiceUseSpeakerBoost" BOOLEAN NOT NULL DEFAULT true,
    "voiceSpeed" REAL NOT NULL DEFAULT 1.0,
    "allowedHoursStart" TEXT NOT NULL,
    "allowedHoursEnd" TEXT NOT NULL,
    "allowedHoursTimezone" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Agent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Agent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ElevenLabsAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAtUnixSecs" INTEGER NOT NULL,
    "isCreator" BOOLEAN NOT NULL,
    "creatorName" TEXT NOT NULL,
    "creatorEmail" TEXT NOT NULL,
    "creatorRole" TEXT NOT NULL,
    "conversationConfig" TEXT,
    "metadata" TEXT,
    "platformSettings" TEXT,
    "phoneNumbers" TEXT,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ElevenLabsAgent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ElevenLabsAgent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Company_createdBy_idx" ON "Company"("createdBy");

-- CreateIndex
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_email_companyId_idx" ON "User"("email", "companyId");

-- CreateIndex
CREATE INDEX "User_isVerified_idx" ON "User"("isVerified");

-- CreateIndex
CREATE UNIQUE INDEX "Manager_email_key" ON "Manager"("email");

-- CreateIndex
CREATE INDEX "Manager_companyId_idx" ON "Manager"("companyId");

-- CreateIndex
CREATE INDEX "Manager_email_companyId_idx" ON "Manager"("email", "companyId");

-- CreateIndex
CREATE INDEX "Manager_adminId_companyId_idx" ON "Manager"("adminId", "companyId");

-- CreateIndex
CREATE INDEX "Agent_companyId_idx" ON "Agent"("companyId");

-- CreateIndex
CREATE INDEX "Agent_adminId_companyId_idx" ON "Agent"("adminId", "companyId");

-- CreateIndex
CREATE INDEX "Agent_isActive_idx" ON "Agent"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ElevenLabsAgent_agentId_key" ON "ElevenLabsAgent"("agentId");

-- CreateIndex
CREATE INDEX "ElevenLabsAgent_companyId_idx" ON "ElevenLabsAgent"("companyId");

-- CreateIndex
CREATE INDEX "ElevenLabsAgent_adminId_companyId_idx" ON "ElevenLabsAgent"("adminId", "companyId");

-- CreateIndex
CREATE INDEX "ElevenLabsAgent_agentId_idx" ON "ElevenLabsAgent"("agentId");

-- CreateIndex
CREATE INDEX "PhoneNumber_companyId_idx" ON "PhoneNumber"("companyId");

-- CreateIndex
CREATE INDEX "PhoneNumber_phoneNumber_idx" ON "PhoneNumber"("phoneNumber");
