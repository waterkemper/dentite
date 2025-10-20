-- AlterTable
ALTER TABLE "outreach_logs" ADD COLUMN     "bounceType" TEXT,
ADD COLUMN     "bouncedAt" TIMESTAMP(3),
ADD COLUMN     "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "clickedAt" TIMESTAMP(3),
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openedAt" TIMESTAMP(3),
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3),
ADD COLUMN     "webhookEvents" JSONB;

-- CreateTable
CREATE TABLE "message_events" (
    "id" TEXT NOT NULL,
    "outreachLogId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "emailOptOut" BOOLEAN NOT NULL DEFAULT false,
    "smsOptOut" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_events_outreachLogId_idx" ON "message_events"("outreachLogId");

-- CreateIndex
CREATE INDEX "message_events_eventType_idx" ON "message_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "patient_preferences_patientId_key" ON "patient_preferences"("patientId");

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_outreachLogId_fkey" FOREIGN KEY ("outreachLogId") REFERENCES "outreach_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
