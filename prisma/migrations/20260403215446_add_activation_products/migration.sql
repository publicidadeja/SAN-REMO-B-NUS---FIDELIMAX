-- CreateTable
CREATE TABLE "ActivationProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "originalPrice" REAL NOT NULL,
    "promotionalPrice" REAL NOT NULL,
    "limitPerCpf" INTEGER NOT NULL DEFAULT 1,
    "redeemWindowHours" INTEGER NOT NULL DEFAULT 24,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductActivation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userCpf" TEXT NOT NULL,
    "activatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    "validUntil" DATETIME NOT NULL,
    CONSTRAINT "ProductActivation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ActivationProduct" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
