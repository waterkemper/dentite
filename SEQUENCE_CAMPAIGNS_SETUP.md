# Multi-Message Drip Campaign Setup Guide

This guide explains how to set up and use the new multi-message drip campaign feature.

## Database Migration

Since you're on Windows, run the Prisma migration using PowerShell:

```powershell
cd backend
npx prisma migrate dev --name add_campaign_sequences
npx prisma generate
```

This will:
1. Create the `campaign_steps` table
2. Create the `patient_sequence_states` table
3. Add sequence fields to `outreach_campaigns` table
4. Add step tracking fields to `outreach_logs` table

## What's New

### Backend Changes

1. **Database Schema (`backend/prisma/schema.prisma`)**
   - `CampaignStep` model - stores individual steps in a sequence
   - `PatientSequenceState` model - tracks patient progress through sequences
   - Updated `OutreachCampaign` with sequence flags
   - Updated `OutreachLog` with step tracking

2. **Outreach Service (`backend/src/services/outreachService.ts`)**
   - `processSequences()` - processes due sequence steps every 15 minutes
   - `shouldStopSequence()` - checks termination conditions
   - `enrollPatientInSequence()` - enrolls single patient
   - `enrollPatientsInSequence()` - bulk enrollment
   - Auto-stop on: appointment booked, patient responded, opted out, or benefits expired

3. **Outreach Controller (`backend/src/controllers/outreach.controller.ts`)**
   - New endpoints for sequence management (create/update/delete steps)
   - Patient enrollment endpoints
   - Sequence state retrieval

4. **Routes (`backend/src/routes/outreach.routes.ts`)**
   - `POST /api/outreach/campaigns/:id/steps` - Create step
   - `PUT /api/outreach/campaigns/:id/steps/:stepId` - Update step
   - `DELETE /api/outreach/campaigns/:id/steps/:stepId` - Delete step
   - `POST /api/outreach/campaigns/:id/enroll/:patientId` - Enroll patient
   - `POST /api/outreach/campaigns/:id/enroll` - Bulk enroll
   - `GET /api/outreach/campaigns/:id/sequence-states` - Get enrollments
   - `GET /api/outreach/patients/:patientId/sequences` - Patient sequences

5. **Cron Jobs (`backend/src/jobs/cronJobs.ts`)**
   - New job runs every 15 minutes to process sequences

### Frontend Changes

1. **SequenceBuilder Component (`frontend/src/components/SequenceBuilder.tsx`)**
   - Visual step builder with drag-and-drop
   - Supports two delay types:
     - Fixed days after previous step
     - Days before benefits expiry
   - Timeline preview
   - Per-step channel selection (SMS or Email)

2. **Outreach Page (`frontend/src/pages/Outreach.tsx`)**
   - Campaign type toggle (Single vs Sequence)
   - Sequence badge on campaign list
   - Auto-stop condition checkboxes

3. **Patient Detail Page (`frontend/src/pages/PatientDetail.tsx`)**
   - Shows active sequence enrollments
   - Displays current step and next scheduled message
   - Shows stop reason if sequence stopped

## Creating a Sequence Campaign

1. Go to Outreach page
2. Click "Create Campaign"
3. Select "Multi-Step Sequence" type
4. Fill in campaign details
5. Click "Add Step" to build your sequence:
   - Step 1: Email at 60 days before expiry
   - Step 2: SMS at 30 days before expiry (7 days after step 1)
   - Step 3: Email at 14 days before expiry
6. Configure auto-stop conditions:
   - ✓ Stop when patient books appointment
   - ✓ Stop when patient responds
   - ✓ Stop when patient opts out
7. Save campaign

## Enrolling Patients

### Manual Enrollment
- Go to Patient Detail page
- Use API: `POST /api/outreach/campaigns/:campaignId/enroll/:patientId`

### Bulk Enrollment
- Use API: `POST /api/outreach/campaigns/:campaignId/enroll`
- Enrolls all patients matching campaign criteria

## How Sequences Work

1. **Enrollment**: Patient is added to sequence with `currentStepNumber: 0`
2. **First Message**: Sent based on first step's delay configuration
3. **Progression**: After each message, `currentStepNumber` increments
4. **Next Schedule**: Calculated based on step's delay type and value
5. **Termination**: Stops automatically based on configured conditions
6. **Completion**: When all steps are sent

## Delay Types Explained

### Fixed Days
- Message sent X days after the previous step
- Example: "7 days after step 1" means 7 days after step 1 was sent

### Days Before Expiry
- Message sent X days before insurance benefits expire
- Example: "30 days before expiry" calculates exact date from expiration date
- Good for time-sensitive reminders

## Auto-Stop Conditions

| Condition | Trigger |
|-----------|---------|
| **Appointment Booked** | Patient schedules any future appointment |
| **Patient Responded** | Patient replies to any message in sequence |
| **Opted Out** | Patient unsubscribes from email or SMS |
| **Expiry Passed** | Benefits expiration date has passed |

## Monitoring Sequences

### View All Enrollments
```
GET /api/outreach/campaigns/:campaignId/sequence-states
```

Returns all patients enrolled in a sequence with their current progress.

### View Patient Sequences
```
GET /api/outreach/patients/:patientId/sequences
```

Shows all sequences a patient is enrolled in.

### Check Sequence Progress
On Patient Detail page:
- Active Sequences section shows current step
- Next scheduled message date
- Stop reason if sequence ended

## Example Sequence

**Campaign**: Year-End Benefits Reminder

**Steps**:
1. **Initial Touch** (60 days before expiry)
   - Type: Email
   - Delay: 60 days before expiry
   - Template: "Hi {firstName}, you have {amount} in benefits..."

2. **Follow-Up** (30 days before expiry)
   - Type: SMS
   - Delay: 30 days before expiry
   - Template: "Quick reminder: {amount} in benefits expires in 30 days!"

3. **Final Urgent** (14 days before expiry)
   - Type: Email
   - Delay: 14 days before expiry
   - Template: "URGENT: Only 14 days left to use {amount}..."

**Auto-Stop**: ✓ All conditions enabled

## Troubleshooting

### Sequences not sending
- Check cron job is running (every 15 minutes)
- Verify `nextScheduledAt` is in the past
- Check patient hasn't met stop conditions

### Patient not enrolled
- Verify campaign is a sequence (`isSequence: true`)
- Check campaign has active steps
- Ensure patient meets benefit criteria

### Messages sending too frequently
- Check delay values in steps
- Verify delay type is correct
- Review `nextScheduledAt` calculation

## Testing

1. Create test sequence with short delays (1 minute)
2. Enroll test patient
3. Wait for cron job (runs every 15 min)
4. Check `patient_sequence_states` table
5. Verify messages in `outreach_logs`

## Production Considerations

- Set realistic delays (days, not minutes)
- Test stop conditions thoroughly
- Monitor sequence completion rates
- Review and optimize message templates
- Set up proper email/SMS credentials

## API Reference

See full API documentation in `API_DOCUMENTATION.md` for detailed endpoint specifications.

