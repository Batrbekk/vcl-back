-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verificationCode" TEXT,
    "resetPasswordCode" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("companyId", "companyName", "createdAt", "email", "firstName", "id", "isVerified", "lastName", "password", "resetPasswordCode", "role", "updatedAt", "verificationCode") SELECT "companyId", "companyName", "createdAt", "email", "firstName", "id", "isVerified", "lastName", "password", "resetPasswordCode", "role", "updatedAt", "verificationCode" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
CREATE INDEX "User_email_companyId_idx" ON "User"("email", "companyId");
CREATE INDEX "User_isVerified_idx" ON "User"("isVerified");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
