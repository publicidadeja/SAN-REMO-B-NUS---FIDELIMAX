-- AlterTable
ALTER TABLE "ActivationProduct" ADD COLUMN "promotionType" TEXT NOT NULL DEFAULT 'offer';
ALTER TABLE "ActivationProduct" ADD COLUMN "prizeDescription" TEXT;
ALTER TABLE "ActivationProduct" ADD COLUMN "minPurchaseValue" REAL;
ALTER TABLE "ActivationProduct" ADD COLUMN "participationInstructions" TEXT;
ALTER TABLE "ActivationProduct" ADD COLUMN "drawDate" DATETIME;

-- AlterTable
ALTER TABLE "ProductActivation" ADD COLUMN "validationStatus" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "ProductActivation" ADD COLUMN "purchaseAmount" REAL;
ALTER TABLE "ProductActivation" ADD COLUMN "customerName" TEXT;
ALTER TABLE "ProductActivation" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "ProductActivation" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "ProductActivation" ADD COLUMN "couponNumber" TEXT;
ALTER TABLE "ProductActivation" ADD COLUMN "validatedAt" DATETIME;
ALTER TABLE "ProductActivation" ADD COLUMN "isWinner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProductActivation" ADD COLUMN "drawnAt" DATETIME;

-- CreateIndex
CREATE INDEX "ProductActivation_productId_validationStatus_idx" ON "ProductActivation"("productId", "validationStatus");
CREATE INDEX "ProductActivation_productId_isWinner_idx" ON "ProductActivation"("productId", "isWinner");
