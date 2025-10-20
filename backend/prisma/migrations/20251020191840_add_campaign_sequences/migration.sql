-- AlterTable
ALTER TABLE "outreach_campaigns" ADD COLUMN     "autoStopOnAppointment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoStopOnOptOut" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoStopOnResponse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSequence" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "outreach_logs" ADD COLUMN     "stepId" TEXT,
ADD COLUMN     "stepNumber" INTEGER;

-- CreateTable
CREATE TABLE "campaign_steps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "delayType" TEXT NOT NULL,
    "delayValue" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_sequence_states" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "currentStepNumber" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stopReason" TEXT,
    "nextScheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_sequence_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_steps_campaignId_stepNumber_key" ON "campaign_steps"("campaignId", "stepNumber");

-- CreateIndex
CREATE INDEX "patient_sequence_states_nextScheduledAt_idx" ON "patient_sequence_states"("nextScheduledAt");

-- CreateIndex
CREATE INDEX "patient_sequence_states_status_idx" ON "patient_sequence_states"("status");

-- CreateIndex
CREATE UNIQUE INDEX "patient_sequence_states_campaignId_patientId_key" ON "patient_sequence_states"("campaignId", "patientId");

-- AddForeignKey
ALTER TABLE "outreach_logs" ADD CONSTRAINT "outreach_logs_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "campaign_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_preferences" ADD CONSTRAINT "patient_preferences_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_sequence_states" ADD CONSTRAINT "patient_sequence_states_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_sequence_states" ADD CONSTRAINT "patient_sequence_states_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
