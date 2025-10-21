-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "pricingPlanId" TEXT;

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "messagesIncluded" INTEGER NOT NULL,
    "userSeatsIncluded" INTEGER NOT NULL,
    "hasBasicAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "hasAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasCampaignSequences" BOOLEAN NOT NULL DEFAULT false,
    "hasCustomIntegrations" BOOLEAN NOT NULL DEFAULT false,
    "hasPhoneSupport" BOOLEAN NOT NULL DEFAULT false,
    "hasDedicatedManager" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_name_key" ON "pricing_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_stripePriceId_key" ON "pricing_plans"("stripePriceId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
