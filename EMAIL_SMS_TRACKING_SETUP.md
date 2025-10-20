# Email & SMS Tracking Setup Guide

This guide provides instructions for completing the setup of email and SMS tracking with HIPAA compliance.

## What Was Implemented

### 1. Database Schema ✅
- Extended `OutreachLog` table with tracking fields:
  - `openedAt`, `clickedAt`, `bouncedAt`, `unsubscribedAt`
  - `openCount`, `clickCount`
  - `bounceType`, `webhookEvents`
- Created `MessageEvent` table for detailed event audit trail
- Created `PatientPreferences` table for opt-out management
- Migration created: `20251020141059_add_message_tracking`

### 2. Backend Implementation ✅
- **Webhook Controller** (`backend/src/controllers/webhooks.controller.ts`)
  - SendGrid webhook handler for email events
  - Twilio webhook handler for SMS status callbacks
  - SMS STOP keyword handler for automatic opt-outs
  - Signature verification for security

- **Preferences Controller** (`backend/src/controllers/preferences.controller.ts`)
  - Patient preferences management
  - Opt-out tracking
  - Public unsubscribe page

- **Enhanced OutreachService** (`backend/src/services/outreachService.ts`)
  - Email tracking enabled (opens, clicks)
  - SMS status callbacks configured
  - Preference checking before sending
  - Unsubscribe links in emails

- **Analytics Endpoint** (`backend/src/controllers/analytics.controller.ts`)
  - New `/api/analytics/messaging-performance` endpoint
  - Email metrics: delivery rate, open rate, click rate
  - SMS metrics: delivery rate, failure rate
  - Campaign and daily breakdowns

### 3. Frontend Updates ✅
- Enhanced `Outreach.tsx` with:
  - Email performance card (open rate, click rate)
  - SMS performance card (delivery rate)
  - Real-time tracking metrics

### 4. Documentation ✅
- **HIPAA_COMPLIANCE.md**: Complete HIPAA compliance guide
- **EMAIL_SMS_TRACKING_SETUP.md**: This setup guide

## Completion Steps

### Step 1: Regenerate Prisma Client

Run this command in the `backend` directory:

```bash
cd backend
npx prisma generate
```

This will regenerate the Prisma client to include the new tables and fields.

### Step 2: Environment Variables

Add these variables to your `backend/.env` file:

```env
# SendGrid Configuration (existing, ensure these are set)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourpractice.com
SENDGRID_FROM_NAME=Your Practice Name

# SendGrid Webhook Verification (new)
SENDGRID_WEBHOOK_VERIFY_KEY=your_webhook_verification_key

# Twilio Configuration (existing, ensure these are set)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhook Base URL (new - required for callbacks)
WEBHOOK_BASE_URL=https://yourdomain.com
```

### Step 3: Configure SendGrid Webhooks

1. Log into your SendGrid account
2. Navigate to Settings > Mail Settings > Event Webhooks
3. Create a new Event Webhook with:
   - **URL**: `https://yourdomain.com/api/webhooks/sendgrid`
   - **Events to track**: 
     - Delivered
     - Open
     - Click
     - Bounce
     - Dropped
     - Spam Report
     - Unsubscribe
   - **HTTP Method**: POST
   - **Signature Verification**: Enable and save the verification key

4. Add the verification key to your `.env` file as `SENDGRID_WEBHOOK_VERIFY_KEY`

### Step 4: Configure Twilio Webhooks

1. Log into your Twilio console
2. Go to Phone Numbers > Active Numbers
3. Select your outbound SMS number
4. Under Messaging Configuration:
   - **Status Callback URL**: `https://yourdomain.com/api/webhooks/twilio`
   - **HTTP Method**: POST

5. For incoming messages (STOP keyword handling):
   - **A Message Comes In**: Webhook
   - **URL**: `https://yourdomain.com/api/webhooks/twilio-incoming`
   - **HTTP Method**: POST

### Step 5: Test the Implementation

#### Test SendGrid Email Tracking

```bash
# Send a test email through your campaign
curl -X POST https://yourdomain.com/api/outreach/campaigns/{campaignId}/send-test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Check SendGrid dashboard for delivery events, then verify webhook events are being received:

```bash
# Check message events in database
SELECT * FROM message_events WHERE provider = 'sendgrid' ORDER BY created_at DESC LIMIT 10;
```

#### Test Twilio SMS Tracking

```bash
# Send a test SMS
curl -X POST https://yourdomain.com/api/outreach/campaigns/{campaignId}/send-test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messageType": "sms"}'
```

Check Twilio logs for delivery status and verify webhook events.

#### Test Opt-Out Functionality

**Email unsubscribe:**
- Open a test email and click the unsubscribe link
- Verify `patient_preferences.email_opt_out` is set to true

**SMS STOP:**
- Reply "STOP" to an SMS
- Verify `patient_preferences.sms_opt_out` is set to true

### Step 6: HIPAA Compliance Setup

Follow the checklist in `HIPAA_COMPLIANCE.md`:

1. ✅ Sign BAA with SendGrid (Pro plan or higher required)
2. ✅ Sign BAA with Twilio
3. ✅ Enable HTTPS for all webhook endpoints
4. ✅ Configure SSL/TLS certificates
5. ✅ Review message templates for PHI content
6. ✅ Set up data retention policies
7. ✅ Train staff on HIPAA requirements

## API Endpoints Added

### Webhooks (Public, No Auth)
- `POST /api/webhooks/sendgrid` - SendGrid event webhook
- `POST /api/webhooks/twilio` - Twilio status callback
- `POST /api/webhooks/twilio-incoming` - Twilio incoming messages

### Preferences (Authenticated)
- `GET /api/preferences/patients/:patientId` - Get patient preferences
- `PUT /api/preferences/patients/:patientId` - Update patient preferences
- `GET /api/preferences/opted-out` - Get all opted-out patients

### Preferences (Public)
- `GET /api/preferences/unsubscribe?patient={id}&type={email|sms}` - Unsubscribe page

### Analytics (Authenticated)
- `GET /api/analytics/messaging-performance` - Get comprehensive messaging metrics
  - Query params: `startDate`, `endDate`, `campaignId`, `messageType`

## Database Queries for Monitoring

### Check Message Delivery Status

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM outreach_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Email Open and Click Rates

```sql
SELECT 
  COUNT(*) as total_emails,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
  COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
  ROUND(COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as open_rate,
  ROUND(COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as click_rate
FROM outreach_logs
WHERE message_type = 'email'
  AND created_at >= NOW() - INTERVAL '30 days';
```

### Recent Webhook Events

```sql
SELECT 
  me.event_type,
  me.provider,
  me.timestamp,
  ol.message_type,
  ol.status,
  p.first_name,
  p.last_name
FROM message_events me
JOIN outreach_logs ol ON me.outreach_log_id = ol.id
JOIN patients p ON ol.patient_id = p.id
ORDER BY me.created_at DESC
LIMIT 20;
```

### Opted-Out Patients

```sql
SELECT 
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  pp.email_opt_out,
  pp.sms_opt_out,
  pp.unsubscribe_reason,
  pp.updated_at
FROM patient_preferences pp
JOIN patients p ON pp.patient_id = p.id
WHERE pp.email_opt_out = true OR pp.sms_opt_out = true
ORDER BY pp.updated_at DESC;
```

## Troubleshooting

### Webhooks Not Being Received

1. Check webhook URLs are publicly accessible (HTTPS)
2. Verify signature verification keys are correct
3. Check server logs for webhook errors
4. Test with webhook testing tools:
   - SendGrid: Settings > Event Webhooks > Test
   - Twilio: Phone Numbers > Test Credentials

### Tracking Not Working

1. Verify SendGrid tracking is enabled in message settings
2. Check Twilio status callbacks are configured
3. Ensure webhook endpoints are processing events correctly
4. Check `message_events` table for incoming events

### Opt-Out Not Working

1. Verify unsubscribe link is present in emails
2. Check SMS STOP keyword handler is configured
3. Ensure `patient_preferences` table is being updated
4. Test with actual email/SMS messages

## Next Steps

1. **Monitor Performance**: Use the new analytics dashboard to track email opens, clicks, and SMS delivery
2. **Review Templates**: Ensure message templates contain minimal PHI
3. **Train Staff**: Review HIPAA compliance requirements with team
4. **Set Alerts**: Configure monitoring for high bounce rates or delivery failures
5. **Regular Audits**: Review message events and opt-outs regularly

## Support

For issues or questions:
- Check `HIPAA_COMPLIANCE.md` for compliance requirements
- Review API documentation in `API_DOCUMENTATION.md`
- Check application logs: `backend/logs/`
- Contact SendGrid/Twilio support for provider-specific issues

---

**Implementation Date:** October 20, 2025
**Version:** 1.0

