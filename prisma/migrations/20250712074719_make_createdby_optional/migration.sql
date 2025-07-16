-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
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
    "createdBy" TEXT,
    CONSTRAINT "Company_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("createdAt", "createdBy", "currency", "id", "isActive", "language", "maxAgents", "maxManagers", "maxMonthlyCalls", "maxPhoneNumbers", "name", "slug", "subscriptionExpiresAt", "subscriptionPlan", "subscriptionStatus", "timezone", "updatedAt") SELECT "createdAt", "createdBy", "currency", "id", "isActive", "language", "maxAgents", "maxManagers", "maxMonthlyCalls", "maxPhoneNumbers", "name", "slug", "subscriptionExpiresAt", "subscriptionPlan", "subscriptionStatus", "timezone", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE INDEX "Company_slug_idx" ON "Company"("slug");
CREATE INDEX "Company_name_idx" ON "Company"("name");
CREATE INDEX "Company_createdBy_idx" ON "Company"("createdBy");
CREATE INDEX "Company_isActive_idx" ON "Company"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
