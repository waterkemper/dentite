# PMS/ERP Configuration Guide

## Overview

Dentite now includes a self-service PMS (Practice Management System) configuration interface, allowing each clinic to configure their own PMS integration directly from the Settings page.

## What Was Implemented

### Backend (Completed)

**PMS Configuration Endpoints:**
- ? `GET /api/practices/:practiceId/pms-config` - Get current PMS configuration
- ? `PUT /api/practices/:practiceId/pms-config` - Update PMS configuration
- ? `POST /api/practices/:practiceId/pms-config/test` - Test PMS connection
- ? `DELETE /api/practices/:practiceId/pms-config` - Delete PMS configuration

**Features:**
- Encrypted API key storage (using same encryption as messaging credentials)
- Support for multiple PMS types (OpenDental, Ortho2Edge, Dentrix, Eaglesoft, Other)
- Connection testing before saving
- Backward compatibility with legacy fields
- Validation and error handling

**File:** `backend/src/controllers/practiceSettings.controller.ts`

### Frontend (Completed)

**PMS/ERP Integration Tab:**
- ? Added third tab to Practice Settings page
- ? PMS type dropdown selector
- ? API key and URL input fields
- ? Test connection button
- ? Delete configuration button
- ? Status indicators
- ? Help text for each PMS type

**File:** `frontend/src/pages/PracticeSettings.tsx`

### Documentation (Completed)

- ? Updated `MULTI_TENANT_MESSAGING.md` with PMS setup guide
- ? API endpoint documentation
- ? Troubleshooting section

## Supported PMS Systems

### OpenDental
- **API Type:** REST API
- **Authentication:** Bearer token
- **Setup:** Enable REST API in OpenDental settings
- **Endpoint Example:** `https://your-server.com/opendental/api/patients`

### Ortho2Edge
- **API Type:** REST API
- **Authentication:** X-API-Key header
- **Setup:** Contact Ortho2Edge support for API access
- **Endpoint Example:** `https://api.ortho2edge.com/api/v1/patients`

### Dentrix
- **API Type:** Dentrix Ascend API
- **Authentication:** API key
- **Setup:** Contact IT administrator or Henry Schein support

### Eaglesoft
- **API Type:** Patterson Dental API
- **Authentication:** API credentials
- **Setup:** Contact Patterson Dental support

### Other/Custom
- **API Type:** Any REST API
- **Requirements:** Must support REST API with JSON responses
- **Setup:** Configure custom endpoint and authentication

## How to Configure (For Clinics)

### Step 1: Access Settings

1. Log into Dentite
2. Navigate to **Settings** (gear icon or menu)
3. Click **PMS/ERP Integration** tab

### Step 2: Select PMS Type

1. Choose your PMS from the dropdown:
   - OpenDental
   - Ortho2Edge
   - Dentrix
   - Eaglesoft
   - Other/Custom

### Step 3: Enter Credentials

1. **API Key:** Enter the API key from your PMS
   - Stored encrypted in database
   - Never visible after saving
   - Leave blank to keep existing key when updating

2. **API URL:** Enter your PMS endpoint
   - Must be publicly accessible or on VPN
   - Use HTTPS for security
   - Examples provided for each PMS type

### Step 4: Save and Test

1. Click **Save Configuration**
2. Click **Test Connection** to verify
3. Check for success message

### Step 5: Monitor Sync

After successful configuration:
- Patient data syncs automatically
- Insurance information updates
- Appointments synchronize
- Check Dashboard for sync status

## Security

### Encrypted Storage

All PMS API keys are encrypted using AES-256-GCM:
```typescript
// API keys stored encrypted
pmsApiKey: "iv:authTag:encryptedData"
```

### Access Control

- Only practice admins can configure PMS settings
- Practice users can only view their own practice settings
- Credentials never sent to frontend (marked as false in Prisma select)

### Backward Compatibility

Legacy fields are automatically updated:
```typescript
if (pmsType === 'opendental') {
  updateData.openDentalApiKey = encryptedKey;
  updateData.openDentalUrl = url;
}
```

## Connection Testing

Connection tests verify:
1. API credentials are valid
2. URL is accessible
3. API returns expected response
4. Permissions are sufficient

**Test implementations:**
- **OpenDental:** GET `/api/patients?limit=1`
- **Ortho2Edge:** GET `/api/v1/patients?limit=1`
- **Generic:** GET to base URL

## Database Schema

Existing fields in `practices` table (already present):

```sql
pmsType           VARCHAR   -- opendental, ortho2edge, dentrix, eaglesoft, other
pmsApiKey         TEXT      -- Encrypted API key
pmsUrl            VARCHAR   -- PMS endpoint URL
pmsConfig         JSON      -- Additional configuration (optional)

-- Legacy fields (kept for compatibility)
openDentalApiKey  TEXT      -- Encrypted (auto-synced with pmsApiKey)
openDentalUrl     VARCHAR   -- Auto-synced with pmsUrl
```

## Troubleshooting

### Connection Test Failed

**Possible causes:**
1. Invalid API key
2. URL not accessible
3. Firewall blocking connection
4. PMS API disabled
5. Insufficient permissions

**Solutions:**
1. Regenerate API key in PMS
2. Verify URL in browser
3. Check firewall rules
4. Enable API in PMS settings
5. Grant API key full read permissions

### Data Not Syncing

**Check:**
1. PMS connection test passes
2. API key hasn't expired
3. Sync cron job is running
4. Check backend logs for errors

**Actions:**
1. Re-test connection
2. Update credentials if expired
3. Check server logs: `backend/logs/`
4. Verify PMS has patient data

### Different PMS Not Listed

**Options:**
1. Select "Other/Custom" type
2. Enter your PMS API endpoint
3. Test connection
4. Contact Dentite support if adapter needed

## API Examples

### Configure OpenDental

```bash
curl -X PUT https://yourdomain.com/api/practices/{practiceId}/pms-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pmsType": "opendental",
    "pmsApiKey": "your-opendental-api-key",
    "pmsUrl": "https://your-server.com/opendental"
  }'
```

### Test Connection

```bash
curl -X POST https://yourdomain.com/api/practices/{practiceId}/pms-config/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "success": true,
  "message": "Successfully connected to opendental",
  "details": {
    "status": 200,
    "message": "OpenDental API is accessible"
  }
}
```

### Get Current Config

```bash
curl -X GET https://yourdomain.com/api/practices/{practiceId}/pms-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "id": "practice-123",
  "pmsType": "opendental",
  "pmsUrl": "https://your-server.com/opendental",
  "pmsConfig": null,
  "hasPmsConfig": true
}
```

## Benefits

### For Clinics

1. **Self-Service:** Configure their own PMS without support tickets
2. **Security:** Credentials encrypted and never exposed
3. **Flexibility:** Support for multiple PMS types
4. **Validation:** Test connection before committing
5. **Control:** Easy to update or remove configuration

### For Dentite (SaaS Provider)

1. **Scalability:** Each clinic manages their own integration
2. **Reduced Support:** Self-service reduces support burden
3. **Multi-PMS:** Support any PMS with REST API
4. **Onboarding:** Streamlined clinic onboarding
5. **Security:** Encrypted credentials, secure storage

## Integration with Existing Features

### Data Sync

PMS configuration integrates with existing sync services:
- `backend/src/services/pms/PMSFactory.ts` - Uses pmsType to select adapter
- `backend/src/services/pms/adapters/OpenDentalAdapter.ts` - Uses encrypted credentials
- Automatic sync jobs use practice-specific credentials

### Benefits Calculation

- Synced patient data feeds benefits engine
- Insurance information from PMS
- Claims history for benefits calculation
- Appointment data for outreach targeting

### Outreach Campaigns

- Patient contact info from PMS
- Insurance expiration dates
- Treatment history for personalization
- Appointment scheduling integration

## Next Steps

### For Clinics

1. Navigate to Settings > PMS/ERP Integration
2. Select your PMS type
3. Enter credentials
4. Test connection
5. Monitor sync status on Dashboard

### For Developers

**Testing:**
- Test with each PMS type
- Verify encryption/decryption
- Check connection timeout handling
- Validate error messages

**Monitoring:**
- Track PMS connection failures
- Alert on credential expiration
- Monitor sync success rates
- Log API errors

## Support

**For Setup Issues:**
- Check documentation in Settings page
- Review PMS-specific help text
- Contact Dentite support

**For PMS-Specific Questions:**
- OpenDental: OpenDental support docs
- Ortho2Edge: Ortho2Edge support
- Dentrix: Henry Schein support
- Eaglesoft: Patterson Dental support

---

**Implementation Date:** October 21, 2025
**Version:** 1.0.0
**Status:** ? Complete
**Integrated With:** Multi-tenant messaging system

