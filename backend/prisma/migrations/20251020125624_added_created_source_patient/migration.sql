-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "createdSource" TEXT NOT NULL DEFAULT 'api';

-- AlterTable
ALTER TABLE "practices" ADD COLUMN     "pmsApiKey" TEXT,
ADD COLUMN     "pmsConfig" JSONB,
ADD COLUMN     "pmsType" TEXT,
ADD COLUMN     "pmsUrl" TEXT;

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "downPayment" DECIMAL(10,2) NOT NULL,
    "monthlyPayment" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "numberOfPayments" INTEGER NOT NULL,
    "remainingPayments" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "pmsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pmsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPhase" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "phaseName" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "estimatedCost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPhase_pkey" PRIMARY KEY ("id")
);
