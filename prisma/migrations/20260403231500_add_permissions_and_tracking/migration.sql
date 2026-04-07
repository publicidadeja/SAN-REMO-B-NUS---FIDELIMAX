-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissions" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivationProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "originalPrice" REAL NOT NULL,
    "promotionalPrice" REAL NOT NULL,
    "limitPerCpf" INTEGER NOT NULL DEFAULT 1,
    "redeemWindowHours" INTEGER NOT NULL DEFAULT 24,
    "expiresAt" DATETIME NOT NULL,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivationProduct_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivationProduct" ("createdAt", "description", "expiresAt", "id", "imageUrl", "limitPerCpf", "name", "originalPrice", "promotionalPrice", "redeemWindowHours", "updatedAt") SELECT "createdAt", "description", "expiresAt", "id", "imageUrl", "limitPerCpf", "name", "originalPrice", "promotionalPrice", "redeemWindowHours", "updatedAt" FROM "ActivationProduct";
DROP TABLE "ActivationProduct";
ALTER TABLE "new_ActivationProduct" RENAME TO "ActivationProduct";
CREATE TABLE "new_Story" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Story_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Story" ("createdAt", "expiresAt", "id", "title", "type", "url") SELECT "createdAt", "expiresAt", "id", "title", "type", "url" FROM "Story";
DROP TABLE "Story";
ALTER TABLE "new_Story" RENAME TO "Story";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
