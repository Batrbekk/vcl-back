-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PhoneNumber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PhoneNumber_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PhoneNumber" ("companyId", "createdAt", "id", "label", "phoneNumber", "provider", "providerData", "updatedAt") SELECT "companyId", "createdAt", "id", "label", "phoneNumber", "provider", "providerData", "updatedAt" FROM "PhoneNumber";
DROP TABLE "PhoneNumber";
ALTER TABLE "new_PhoneNumber" RENAME TO "PhoneNumber";
CREATE INDEX "PhoneNumber_companyId_idx" ON "PhoneNumber"("companyId");
CREATE INDEX "PhoneNumber_phoneNumber_idx" ON "PhoneNumber"("phoneNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
