-- AlterTable
ALTER TABLE "outreach_logs" ADD COLUMN     "messagingProvider" TEXT;

-- AlterTable
ALTER TABLE "practices" ADD COLUMN     "emailDnsRecords" JSONB,
ADD COLUMN     "emailDomainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailLastTestedAt" TIMESTAMP(3),
ADD COLUMN     "emailProvider" TEXT DEFAULT 'system',
ADD COLUMN     "emailVerificationStatus" TEXT,
ADD COLUMN     "sendgridApiKey" TEXT,
ADD COLUMN     "sendgridDomainId" TEXT,
ADD COLUMN     "sendgridFromEmail" TEXT,
ADD COLUMN     "sendgridFromName" TEXT,
ADD COLUMN     "smsFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smsLastTestedAt" TIMESTAMP(3),
ADD COLUMN     "smsProvider" TEXT DEFAULT 'system',
ADD COLUMN     "smsVerificationStatus" TEXT,
ADD COLUMN     "twilioAccountSid" TEXT,
ADD COLUMN     "twilioAuthToken" TEXT,
ADD COLUMN     "twilioPhoneNumber" TEXT;
