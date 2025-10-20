-- CreateTable
CREATE TABLE "practices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'basic',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "openDentalApiKey" TEXT,
    "openDentalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "openDentalId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "lastVisitDate" TIMESTAMP(3),
    "nextAppointmentDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_plans" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "planName" TEXT,
    "groupNumber" TEXT,
    "phone" TEXT,
    "annualMaximum" DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
    "deductible" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_insurance" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "insurancePlanId" TEXT NOT NULL,
    "policyNumber" TEXT,
    "subscriberName" TEXT,
    "subscriberRelation" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "annualMaximum" DECIMAL(10,2) NOT NULL,
    "deductible" DECIMAL(10,2) NOT NULL,
    "deductibleMet" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "usedBenefits" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "remainingBenefits" DECIMAL(10,2) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefits_snapshots" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annualMaximum" DECIMAL(10,2) NOT NULL,
    "deductible" DECIMAL(10,2) NOT NULL,
    "deductibleMet" DECIMAL(10,2) NOT NULL,
    "usedBenefits" DECIMAL(10,2) NOT NULL,
    "remainingBenefits" DECIMAL(10,2) NOT NULL,
    "daysUntilExpiry" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benefits_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_campaigns" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minBenefitAmount" DECIMAL(10,2) NOT NULL DEFAULT 200.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreach_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageContent" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "openDentalId" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "appointmentType" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "wasBookedFromOutreach" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "practices_email_key" ON "practices"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_practiceId_openDentalId_key" ON "patients"("practiceId", "openDentalId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_plans" ADD CONSTRAINT "insurance_plans_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_insurancePlanId_fkey" FOREIGN KEY ("insurancePlanId") REFERENCES "insurance_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefits_snapshots" ADD CONSTRAINT "benefits_snapshots_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "outreach_campaigns_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
