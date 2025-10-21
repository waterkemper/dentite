# Multi-Tenant Messaging Configuration Guide

## Overview

Dentite now supports multi-tenant messaging, allowing each practice to optionally configure their own SendGrid (email) and Twilio (SMS) credentials. This enables practices to:

- Send emails from their own domain for better branding
- Use their own Twilio phone numbers for SMS
- Maintain full control over their messaging infrastructure
- Improve email deliverability with domain authentication
- Track and manage their own messaging costs

## Architecture

### Hybrid Model

Dentite uses a **hybrid multi-tenant messaging model**:

1. **System Default (Default)**: Practices use Dentite's SendGrid/Twilio credentials
   - Zero configuration required
   - Immediate functionality
   - Shared costs

2. **Custom Configuration (Optional)**: Practices provide their own credentials
   - Full branding control
   - Custom domains for email
   - Separate billing from Dentite
   - Automatic fallback to system if custom fails

### How It Works

```
┌─────────────────────────────────────────┐
│ Practice sends outreach message         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ MessagingServiceFactory checks config    │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ Custom   │      │ System   │
│ Provider │      │ Default  │
└──────────┘      └──────────┘
```

## Setup Guide for Practices

### PMS/ERP Integration

Each practice needs to configure their Practice Management System (PMS) to sync patient data, insurance information, and appointments.

#### Supported PMS Systems

- **OpenDental** - Full API integration
- **Ortho2Edge** - Orthodontic practice management
- **Dentrix** - Via Dentrix Ascend API
- **Eaglesoft** - Patterson Dental
- **Other/Custom** - Any REST API-compatible system

#### Step 1: Obtain PMS API Credentials

**For OpenDental:**
1. Log into OpenDental as admin
2. Navigate to Setup > Manage > API Settings
3. Enable REST API
4. Generate an API key
5. Note your server URL (e.g., `https://your-server.com/opendental`)

**For Ortho2Edge:**
1. Contact Ortho2Edge support
2. Request API access
3. Receive API key and endpoint URL

**For Dentrix/Eaglesoft/Other:**
1. Check if your PMS has a REST API
2. Contact your PMS provider or IT administrator
3. Obtain API credentials and endpoint URL

#### Step 2: Configure in Dentite

1. Navigate to **Settings** > **PMS/ERP Integration** tab
2. Select your PMS type from the dropdown
3. Enter:
   - API Key (from your PMS)
   - API URL (your PMS endpoint)
4. Click **Save Configuration**

#### Step 3: Test Connection

1. Click **Test Connection** button
2. Verify connection is successful
3. If test fails:
   - Check API key is correct
   - Verify URL is accessible
   - Ensure firewall allows connections
   - Check PMS API is enabled

#### Step 4: Sync Patient Data

After successful configuration, Dentite will automatically sync:
- Patient demographics
- Insurance coverage and benefits
- Claims and treatment history
- Upcoming appointments

**Note:** Initial sync may take several minutes depending on practice size.

### Email Configuration (SendGrid)

#### Prerequisites
- SendGrid account (Pro plan or higher for HIPAA BAA)
- Domain access for DNS configuration
- SendGrid API key with full access

#### Step 1: Get SendGrid API Key

1. Log into SendGrid dashboard
2. Navigate to **Settings** > **API Keys**
3. Create a new API key with **Full Access**
4. Copy the API key (you won't see it again!)

#### Step 2: Configure in Dentite

1. Navigate to **Settings** > **Messaging Settings**
2. Select **Email Configuration** tab
3. Choose **Use Custom Domain (SendGrid)**
4. Enter:
   - SendGrid API Key
   - From Email (e.g., `noreply@yourclinic.com`)
   - From Name (e.g., "Your Clinic Name")
5. Enable **Fallback to System** (recommended)
6. Click **Save Configuration**

#### Step 3: Domain Authentication

For best deliverability, authenticate your domain:

1. Click **Setup DNS** button
2. You'll receive DNS records to add:
   - 3 CNAME records (for domain authentication)
   - These prove you own the domain

3. Add DNS records in your domain registrar:
   - Log into your domain provider (GoDaddy, Namecheap, etc.)
   - Navigate to DNS Management
   - Add each CNAME record exactly as shown
   - Save changes

4. Wait for DNS propagation (15 minutes to 48 hours)

5. Return to Dentite and click **Check Verification**

#### Step 4: Test Your Configuration

1. Click **Send Test Email**
2. Enter a test email address
3. Verify the email arrives with your domain

**Example DNS Records:**
```
Type: CNAME
Host: em1234._domainkey.yourclinic.com
Value: em1234.dkim.sendgrid.net

Type: CNAME
Host: em1234.yourclinic.com
Value: u1234.wl.sendgrid.net
```

### SMS Configuration (Twilio)

#### Prerequisites
- Twilio account
- Phone number purchased from Twilio
- Account SID and Auth Token

#### Step 1: Get Twilio Credentials

1. Log into Twilio console
2. Navigate to **Account** > **API credentials**
3. Copy:
   - Account SID (starts with AC...)
   - Auth Token

4. Navigate to **Phone Numbers** > **Active Numbers**
5. Purchase a phone number if you don't have one
6. Copy the phone number in E.164 format (+1234567890)

#### Step 2: Configure in Dentite

1. Navigate to **Settings** > **Messaging Settings**
2. Select **SMS Configuration** tab
3. Choose **Use Custom Twilio Account**
4. Enter:
   - Twilio Account SID
   - Twilio Auth Token
   - Phone Number (+1234567890)
5. Enable **Fallback to System** (recommended)
6. Click **Save Configuration**

#### Step 3: Test Your Configuration

1. Click **Send Test SMS**
2. Enter your phone number in E.164 format
3. Verify the SMS arrives from your Twilio number

## Administration Guide

### Database Schema

New fields in `practices` table:

```sql
-- Email Configuration
emailProvider           VARCHAR   -- 'system' or 'custom_sendgrid'
sendgridApiKey          TEXT      -- Encrypted
sendgridFromEmail       VARCHAR
sendgridFromName        VARCHAR
emailDomainVerified     BOOLEAN
emailVerificationStatus VARCHAR   -- 'pending', 'verified', 'failed'
emailDnsRecords         JSON
emailFallbackEnabled    BOOLEAN

-- SMS Configuration  
smsProvider             VARCHAR   -- 'system' or 'custom_twilio'
twilioAccountSid        TEXT      -- Encrypted
twilioAuthToken         TEXT      -- Encrypted
twilioPhoneNumber       VARCHAR
smsVerificationStatus   VARCHAR
smsFallbackEnabled      BOOLEAN

-- Tracking
emailLastTestedAt       TIMESTAMP
smsLastTestedAt         TIMESTAMP
```

New field in `outreach_logs` table:

```sql
messagingProvider       VARCHAR   -- 'system', 'custom_sendgrid', 'custom_twilio'
```

### Environment Variables

Required for system-level configuration:

```env
# Credential Encryption (REQUIRED)
ENCRYPTION_KEY=your-32-byte-hex-key

# System Default SendGrid
SENDGRID_API_KEY=your_system_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@dentite.com
SENDGRID_FROM_NAME=Dentite
SENDGRID_WEBHOOK_VERIFY_KEY=your_webhook_key

# System Default Twilio
TWILIO_ACCOUNT_SID=your_system_twilio_sid
TWILIO_AUTH_TOKEN=your_system_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhooks
WEBHOOK_BASE_URL=https://yourdomain.com
```

### Generating Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

### PMS Configuration

**Get PMS Config**
```http
GET /api/practices/:practiceId/pms-config
Authorization: Bearer {jwt_token}
```

**Update PMS Config**
```http
PUT /api/practices/:practiceId/pms-config
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "pmsType": "opendental",
  "pmsApiKey": "your-pms-api-key",
  "pmsUrl": "https://your-server.com/opendental",
  "pmsConfig": {
    "syncInterval": "hourly",
    "enableWebhooks": true
  }
}
```

**Test PMS Connection**
```http
POST /api/practices/:practiceId/pms-config/test
Authorization: Bearer {jwt_token}
```

**Delete PMS Config**
```http
DELETE /api/practices/:practiceId/pms-config
Authorization: Bearer {jwt_token}
```

### Practice Messaging Settings

**Get Settings**
```http
GET /api/practices/:practiceId/messaging-settings
Authorization: Bearer {jwt_token}
```

**Update Email Config**
```http
PUT /api/practices/:practiceId/email-config
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "emailProvider": "custom_sendgrid",
  "sendgridApiKey": "SG.xxx",
  "sendgridFromEmail": "noreply@clinic.com",
  "sendgridFromName": "Clinic Name",
  "emailFallbackEnabled": true
}
```

**Update SMS Config**
```http
PUT /api/practices/:practiceId/sms-config
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "smsProvider": "custom_twilio",
  "twilioAccountSid": "ACxxx",
  "twilioAuthToken": "xxx",
  "twilioPhoneNumber": "+1234567890",
  "smsFallbackEnabled": true
}
```

**Test Email**
```http
POST /api/practices/:practiceId/email-config/test
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "recipientEmail": "test@example.com"
}
```

**Test SMS**
```http
POST /api/practices/:practiceId/sms-config/test
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "recipientPhone": "+1234567890"
}
```

### Domain Verification

**Initiate Verification**
```http
POST /api/practices/:practiceId/email-config/verify
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "domain": "yourclinic.com"
}
```

**Check Status**
```http
GET /api/practices/:practiceId/email-config/verify-status
Authorization: Bearer {jwt_token}
```

**Get DNS Instructions**
```http
GET /api/practices/:practiceId/dns-instructions
Authorization: Bearer {jwt_token}
```

## Security Considerations

### Credential Encryption

All sensitive credentials are encrypted using AES-256-GCM:

- Encryption at rest in database
- Unique IV (Initialization Vector) per encryption
- Authentication tag for integrity
- 32-byte encryption key (from `ENCRYPTION_KEY` env var)

**Never log decrypted credentials!**

### Access Control

- Only practice admins can configure messaging
- Practice users can only view settings for their practice
- Credentials are never sent to frontend (marked as encrypted)

### Webhook Security

- SendGrid: Signature verification with webhook verify key
- Twilio: Request validation with auth token
- Practice ID included in webhook URLs for multi-tenant routing

### HIPAA Compliance

- Practices must sign BAAs with SendGrid/Twilio
- All webhook endpoints use HTTPS
- Minimize PHI in message content
- Audit logs for all configuration changes

## Troubleshooting

### PMS Integration Issues

**Problem: PMS connection test failed**

**Solution:**
1. Verify API credentials are correct
2. Check PMS URL is accessible (try in browser)
3. Ensure PMS API is enabled in settings
4. Check firewall allows outbound connections
5. Verify API key has sufficient permissions

**Problem: Data not syncing**

**Solution:**
1. Test PMS connection first
2. Check PMS credentials haven't expired
3. Verify patient data exists in PMS
4. Review sync logs for specific errors
5. Ensure PMS API has read permissions

**Problem: "Invalid API key" error**

**Solution:**
1. Regenerate API key in your PMS
2. Update configuration in Dentite
3. Test connection immediately
4. Check API key format is correct

**Problem: Different PMS than listed**

**Solution:**
1. Select "Other/Custom" as PMS type
2. Enter your PMS API endpoint
3. Ensure your PMS uses REST API
4. Contact support if you need adapter development

### Email Issues

**Problem: Domain verification failed**

**Solution:**
1. Verify DNS records are added correctly
2. Wait up to 48 hours for DNS propagation
3. Check DNS with: `nslookup em1234._domainkey.yourclinic.com`
4. Ensure no typos in CNAME values

**Problem: Emails not sending**

**Solution:**
1. Check SendGrid API key has full access
2. Verify domain is authenticated
3. Check practice's fallback setting
4. Review error logs for specific error messages
5. Test with system provider to isolate issue

**Problem: Emails going to spam**

**Solution:**
1. Complete domain authentication
2. Set up SPF and DKIM records
3. Avoid spam trigger words in content
4. Warm up your sending domain gradually

### SMS Issues

**Problem: SMS not sending**

**Solution:**
1. Verify Twilio credentials are correct
2. Check phone number is in E.164 format (+1234567890)
3. Ensure Twilio number is SMS-enabled
4. Verify Twilio account has credits
5. Check recipient number is valid and not blocked

**Problem: Status callbacks not working**

**Solution:**
1. Verify webhook URL is publicly accessible (HTTPS)
2. Check Twilio phone number has status callback configured
3. Verify practice ID is included in callback URL
4. Check webhook signature validation

### General Issues

**Problem: Fallback not working**

**Solution:**
1. Verify `emailFallbackEnabled` or `smsFallbackEnabled` is true
2. Check system credentials are configured correctly
3. Review logs for fallback trigger events

**Problem: Configuration not saving**

**Solution:**
1. Verify all required fields are provided
2. Check API key format is correct
3. Ensure user has admin role
4. Check for validation errors in response

## Performance Optimization

### Client Caching

Messaging clients are cached for 1 hour per practice:

```typescript
// Cache TTL
private cacheTTL = 3600000; // 1 hour
```

Benefits:
- Reduces database queries
- Improves response time
- Decreases credential decryption overhead

### Cache Invalidation

Cache is cleared when:
- Configuration is updated
- Configuration is deleted
- Manual cache clear: `messagingFactory.clearCache(practiceId)`

### Monitoring

Track messaging provider usage:

```sql
-- Messages by provider (last 30 days)
SELECT 
  messagingProvider,
  messageType,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 2) as delivery_rate
FROM outreach_logs
WHERE createdAt >= NOW() - INTERVAL '30 days'
GROUP BY messagingProvider, messageType;
```

## Cost Implications

### System Provider (Default)

- Costs absorbed by Dentite
- No configuration needed
- Shared resources

### Custom Provider

**Pros:**
- Practice pays directly to SendGrid/Twilio
- Full cost transparency
- No markup from Dentite
- Independent billing

**Cons:**
- Requires account setup
- Monthly minimums may apply
- Credit card required

**Estimated costs:**
- SendGrid: ~$15-90/month depending on volume
- Twilio SMS: ~$0.0075 per message + phone number ($1-2/month)

## Migration Guide

### Migrating Existing Practices

All existing practices default to `system` provider. No action required.

To migrate a practice to custom providers:

1. **Pre-migration:**
   - Verify SendGrid/Twilio accounts are set up
   - Test credentials in staging environment
   - Document DNS records for domain authentication

2. **Migration:**
   - Configure custom credentials via settings page
   - Test email/SMS sends
   - Monitor first 24 hours for issues

3. **Post-migration:**
   - Verify webhook events are received
   - Check deliverability rates
   - Compare with previous system performance

### Rollback Procedure

If issues occur with custom provider:

1. Navigate to **Settings** > **Messaging Settings**
2. Select **Use System Email/SMS (Default)**
3. Click **Save Configuration**
4. Or delete custom configuration entirely

Fallback is automatic if enabled.

## Support

### For Practices

- Email support: support@dentite.com
- Settings page: **Help** > **Messaging Configuration**
- Status page: https://status.dentite.com

### For Developers

- API Documentation: `API_DOCUMENTATION.md`
- Architecture: `ARCHITECTURE.md`
- Codebase:
  - Backend: `backend/src/services/messagingServiceFactory.ts`
  - Frontend: `frontend/src/pages/PracticeSettings.tsx`

## Changelog

### v1.0.0 (October 21, 2025)

**Added:**
- Multi-tenant messaging support
- Custom SendGrid configuration
- Custom Twilio configuration
- Domain authentication for email
- Credential encryption (AES-256-GCM)
- Fallback to system providers
- Practice settings UI
- DNS verification wizard
- Test email/SMS functionality
- Messaging provider tracking in analytics

**Security:**
- Encrypted credential storage
- Webhook signature verification
- Role-based access control
- Audit logging

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0
**Maintainer:** Dentite Development Team

