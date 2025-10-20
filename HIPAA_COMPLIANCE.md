# HIPAA Compliance for Email & SMS Messaging

This document outlines the HIPAA compliance requirements and best practices for using SendGrid (email) and Twilio (SMS) with the Dentite Benefits Tracker system.

## Overview

When sending appointment reminders and benefits notifications to patients, practices must ensure compliance with the Health Insurance Portability and Accountability Act (HIPAA) to protect patient health information (PHI).

## Business Associate Agreements (BAA)

### Required Steps

1. **SendGrid BAA**
   - Sign up for a SendGrid Pro plan or higher (BAA not available on free/essentials plans)
   - Request and sign the Business Associate Agreement through SendGrid support
   - Enable HIPAA-compliant features in your account settings
   - Documentation: https://sendgrid.com/resource/hipaa-compliant-email/

2. **Twilio BAA**
   - Contact Twilio sales to request a Business Associate Agreement
   - Available on eligible paid plans (check current requirements)
   - Complete the BAA signing process through Twilio's legal team
   - Documentation: https://www.twilio.com/guidelines/regulatory/hipaa

## PHI Handling Guidelines

### What Constitutes PHI

Protected Health Information (PHI) includes:
- Patient names combined with health information
- Diagnosis, treatment details, or medical conditions
- Insurance information beyond basic eligibility
- Detailed appointment types (e.g., "root canal", "diabetes consultation")

### Minimal Information Approach

**✅ RECOMMENDED MESSAGE CONTENT:**
```
Hi {firstName}, you have ${amount} in dental benefits expiring on {expirationDate}. 
Don't let them go to waste! Call us to schedule your appointment.
```

**❌ AVOID INCLUDING:**
- Full names in subject lines
- Specific diagnoses or treatments
- Detailed insurance information
- Medical record numbers
- Social Security numbers

## Security Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourpractice.com
SENDGRID_FROM_NAME=Your Practice Name
SENDGRID_WEBHOOK_VERIFY_KEY=your_webhook_verification_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhook Configuration
WEBHOOK_BASE_URL=https://yourdomain.com
```

### Webhook Security

1. **HTTPS Only**
   - All webhook endpoints MUST use HTTPS
   - Never use HTTP in production
   - Configure SSL/TLS certificates properly

2. **Signature Verification**
   - SendGrid: Verifies using `x-twilio-email-event-webhook-signature` header
   - Twilio: Verifies using `X-Twilio-Signature` header
   - Both are implemented in `backend/src/controllers/webhooks.controller.ts`

3. **Webhook URLs**
   - SendGrid: `https://yourdomain.com/api/webhooks/sendgrid`
   - Twilio: `https://yourdomain.com/api/webhooks/twilio`
   - Twilio Incoming: `https://yourdomain.com/api/webhooks/twilio-incoming`

## Data Storage and Retention

### Database Security

1. **Encrypted at Rest**
   - Use encrypted PostgreSQL database
   - Enable encryption for backups

2. **Access Control**
   - Limit database access to authorized personnel only
   - Use strong authentication
   - Implement role-based access control (RBAC)

3. **Audit Trail**
   - `MessageEvent` table logs all webhook events
   - Maintains complete audit trail for compliance
   - Stores timestamps for all message activities

### Data Retention

1. **Message Content**
   - Store minimal PHI in message content
   - Consider purging old messages after required retention period (typically 6 years)

2. **Webhook Events**
   - Keep audit logs for compliance purposes
   - Archive or delete after retention period expires

## Patient Consent and Opt-Out

### Consent Requirements

1. **Initial Consent**
   - Obtain patient consent for appointment reminders
   - Include consent form in patient registration
   - Document consent in patient records

2. **Communication Preferences**
   - Allow patients to choose email vs. SMS
   - Respect patient communication preferences
   - Implement in `PatientPreferences` table

### Opt-Out Mechanisms

1. **Email Unsubscribe**
   - Automatic unsubscribe link in all emails (via SendGrid)
   - Manual unsubscribe page: `/api/preferences/unsubscribe?patient={id}`
   - Updates `PatientPreferences.emailOptOut`

2. **SMS STOP Keyword**
   - Automatic handling of STOP, STOPALL, UNSUBSCRIBE, etc.
   - Implemented in `webhooks.controller.ts`
   - Updates `PatientPreferences.smsOptOut`

3. **Staff Portal**
   - Practice staff can manage preferences via API:
     - GET `/api/preferences/patients/{patientId}`
     - PUT `/api/preferences/patients/{patientId}`
     - GET `/api/preferences/opted-out`

## Compliance Checklist

### Pre-Launch

- [ ] Sign BAA with SendGrid
- [ ] Sign BAA with Twilio
- [ ] Configure HTTPS for all webhook endpoints
- [ ] Enable webhook signature verification
- [ ] Set up database encryption
- [ ] Implement audit logging
- [ ] Configure data retention policies
- [ ] Create patient consent forms
- [ ] Train staff on HIPAA requirements

### Ongoing

- [ ] Review message templates regularly
- [ ] Audit access logs monthly
- [ ] Update security certificates before expiration
- [ ] Conduct annual HIPAA risk assessments
- [ ] Maintain documentation of compliance efforts
- [ ] Monitor opt-out requests and honor immediately
- [ ] Review and update BAAs annually

## Incident Response

### Breach Notification

If a potential HIPAA breach occurs:

1. **Immediate Actions**
   - Document the incident immediately
   - Contain the breach if possible
   - Notify practice administrator

2. **Assessment**
   - Determine what PHI was involved
   - Identify affected patients
   - Assess risk level

3. **Notification Requirements**
   - Notify affected patients within 60 days
   - Report to HHS if >500 patients affected
   - Notify media if >500 patients in same state/jurisdiction
   - Document all actions taken

## Additional Resources

- [HHS HIPAA for Professionals](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [SendGrid HIPAA Compliance](https://sendgrid.com/resource/hipaa-compliant-email/)
- [Twilio HIPAA Compliance](https://www.twilio.com/guidelines/regulatory/hipaa)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

## Support Contacts

**SendGrid Support:**
- Email: support@sendgrid.com
- Phone: 1-877-969-5722

**Twilio Support:**
- Email: help@twilio.com
- Phone: +1 (888) 908-9465

**HIPAA Legal Consultation:**
- Consult with your practice's legal counsel or HIPAA compliance officer for specific guidance

---

**Last Updated:** October 20, 2025

**Review Schedule:** Annually or when significant changes occur

