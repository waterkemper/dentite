# Dentite API Documentation

Base URL: `http://localhost:3000/api`

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication

### Register New Practice
**POST** `/auth/register`

Register a new dental practice with an admin user.

**Request Body:**
```json
{
  "practice": {
    "name": "Springfield Dental Care",
    "email": "office@springfield.com",
    "phone": "555-1234"
  },
  "user": {
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@springfield.com",
    "password": "password123"
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Practice registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "john@springfield.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "admin",
    "practiceId": "uuid"
  }
}
```

---

### Login
**POST** `/auth/login`

Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "admin@dentalpractice.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@dentalpractice.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin",
    "practiceId": "uuid",
    "practice": {
      "id": "uuid",
      "name": "Springfield Dental Care",
      "subscriptionStatus": "active"
    }
  }
}
```

---

### Get Current User
**GET** `/auth/me`

Get current authenticated user information.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "admin@dentalpractice.com",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin",
  "practiceId": "uuid",
  "practice": {
    "id": "uuid",
    "name": "Springfield Dental Care",
    "subscriptionStatus": "active"
  }
}
```

---

## Patients

### List Patients
**GET** `/patients`

Get all patients with benefits data.

**Query Parameters:**
- `search` (optional) - Search by name or email
- `minBenefits` (optional) - Filter by minimum remaining benefits
- `daysUntilExpiry` (optional) - Filter by days until expiration
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 50) - Items per page

**Response:** `200 OK`
```json
{
  "patients": [
    {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@email.com",
      "phone": "555-0101",
      "lastVisitDate": "2024-06-15T00:00:00Z",
      "nextAppointmentDate": null,
      "insurance": {
        "carrierName": "Delta Dental",
        "remainingBenefits": 900,
        "expirationDate": "2024-12-31T00:00:00Z",
        "daysUntilExpiry": 72
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### Get Patient by ID
**GET** `/patients/:id`

Get detailed patient information including insurance, benefits history, outreach logs, and appointments.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@email.com",
  "phone": "555-0101",
  "dateOfBirth": "1985-03-15T00:00:00Z",
  "lastVisitDate": "2024-06-15T00:00:00Z",
  "insurance": [
    {
      "insurancePlan": {
        "carrierName": "Delta Dental"
      },
      "annualMaximum": 1500,
      "deductible": 50,
      "deductibleMet": 50,
      "usedBenefits": 600,
      "remainingBenefits": 900,
      "expirationDate": "2024-12-31T00:00:00Z"
    }
  ],
  "benefitsSnapshots": [...],
  "outreachLogs": [...],
  "appointments": [...]
}
```

---

### Sync from OpenDental
**POST** `/patients/sync`

Trigger manual sync of patient data from OpenDental.

**Response:** `200 OK`
```json
{
  "message": "Sync completed successfully",
  "synced": 125,
  "errors": 0
}
```

---

## Benefits

### Get Expiring Benefits
**GET** `/benefits/expiring`

Get patients with expiring benefits.

**Query Parameters:**
- `days` (optional, default: 60) - Days until expiration
- `minAmount` (optional, default: 200) - Minimum benefit amount

**Response:** `200 OK`
```json
{
  "patients": [
    {
      "patientId": "uuid",
      "patientName": "John Smith",
      "email": "john.smith@email.com",
      "phone": "555-0101",
      "insuranceCarrier": "Delta Dental",
      "annualMaximum": 1500,
      "deductible": 50,
      "deductibleMet": 50,
      "usedBenefits": 600,
      "remainingBenefits": 900,
      "expirationDate": "2024-12-31T00:00:00Z",
      "daysUntilExpiry": 72,
      "suggestedTreatments": [
        "Crown or bridge work",
        "Root canal therapy",
        "Periodontal treatment"
      ]
    }
  ],
  "summary": {
    "totalPatients": 15,
    "totalValue": 12500
  }
}
```

---

### Calculate Patient Benefits
**GET** `/benefits/calculate/:patientId`

Recalculate benefits for a specific patient.

**Response:** `200 OK`
```json
{
  "patientId": "uuid",
  "patientName": "John Smith",
  "email": "john.smith@email.com",
  "phone": "555-0101",
  "insuranceCarrier": "Delta Dental",
  "annualMaximum": 1500,
  "usedBenefits": 600,
  "remainingBenefits": 900,
  "expirationDate": "2024-12-31T00:00:00Z",
  "daysUntilExpiry": 72,
  "suggestedTreatments": [...]
}
```

---

## Outreach

### List Campaigns
**GET** `/outreach/campaigns`

Get all outreach campaigns for the practice.

**Response:** `200 OK`
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Year-End Benefits Reminder",
      "description": "Remind patients about expiring benefits",
      "triggerType": "expiring_60",
      "messageType": "both",
      "messageTemplate": "Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}...",
      "minBenefitAmount": 200,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Create Campaign
**POST** `/outreach/campaigns`

Create a new outreach campaign.

**Request Body:**
```json
{
  "name": "Year-End Benefits Reminder",
  "description": "Remind patients about expiring benefits",
  "triggerType": "expiring_60",
  "messageType": "both",
  "messageTemplate": "Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}. Call us at 555-DENTAL to schedule!",
  "minBenefitAmount": 200
}
```

**Trigger Types:**
- `expiring_60` - 60 days before expiration
- `expiring_30` - 30 days before expiration
- `expiring_14` - 14 days before expiration

**Message Types:**
- `sms` - SMS only
- `email` - Email only
- `both` - SMS and Email

**Template Variables:**
- `{firstName}` - Patient first name
- `{lastName}` - Patient last name
- `{fullName}` - Patient full name
- `{amount}` - Remaining benefits amount
- `{expirationDate}` - Benefits expiration date
- `{daysRemaining}` - Days until expiration
- `{carrier}` - Insurance carrier name

**Response:** `201 Created`
```json
{
  "message": "Campaign created successfully",
  "campaign": {
    "id": "uuid",
    "name": "Year-End Benefits Reminder",
    ...
  }
}
```

---

### Get Outreach Logs
**GET** `/outreach/logs`

Get message history and delivery status.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50)
- `status` (optional) - Filter by status (pending, sent, delivered, failed, responded)
- `patientId` (optional) - Filter by patient

**Response:** `200 OK`
```json
{
  "logs": [
    {
      "id": "uuid",
      "messageType": "sms",
      "status": "delivered",
      "sentAt": "2024-10-20T09:00:00Z",
      "deliveredAt": "2024-10-20T09:00:15Z",
      "campaign": {
        "name": "Year-End Benefits Reminder"
      },
      "patient": {
        "firstName": "John",
        "lastName": "Smith",
        "email": "john@email.com",
        "phone": "555-0101"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

---

### Send Manual Message
**POST** `/outreach/send/:patientId`

Manually send an outreach message to a specific patient.

**Request Body:**
```json
{
  "campaignId": "uuid",
  "messageType": "both"
}
```

**Response:** `200 OK`
```json
{
  "message": "Message sent successfully",
  "success": true,
  "messageId": "twilio-message-id"
}
```

---

## Analytics

### Get Recovered Revenue
**GET** `/analytics/recovered-revenue`

Get revenue metrics from booked appointments.

**Query Parameters:**
- `startDate` (optional) - Start date (ISO format)
- `endDate` (optional) - End date (ISO format)

**Response:** `200 OK`
```json
{
  "totalRecoveredRevenue": 45000,
  "totalAppointments": 85,
  "monthlyBreakdown": [
    {
      "month": "2024-01",
      "revenue": 12500
    },
    {
      "month": "2024-02",
      "revenue": 15000
    }
  ]
}
```

---

### Get Campaign Performance
**GET** `/analytics/campaign-performance`

Get performance metrics for all campaigns.

**Response:** `200 OK`
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "name": "Year-End Benefits Reminder",
      "triggerType": "expiring_60",
      "messageType": "both",
      "isActive": true,
      "metrics": {
        "totalSent": 150,
        "delivered": 145,
        "responded": 42,
        "deliveryRate": 96.67,
        "responseRate": 28.97
      }
    }
  ]
}
```

---

### Get Dashboard Metrics
**GET** `/analytics/dashboard`

Get summary metrics for the dashboard.

**Response:** `200 OK`
```json
{
  "totalPatients": 325,
  "patientsWithExpiringBenefits": 45,
  "totalValueAtRisk": 67500,
  "appointmentsThisMonth": 28,
  "recoveredRevenueMTD": 15000
}
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

**401 Unauthorized**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden**
```json
{
  "error": "Admin access required"
}
```

**404 Not Found**
```json
{
  "error": "Patient not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated endpoints

Exceeding limits returns `429 Too Many Requests`.

---

## Webhooks (Coming Soon)

Dentite will support webhooks for:
- Patient benefits expiring
- Outreach message delivered
- Outreach message responded
- Appointment booked

Configure webhooks in your practice settings.

