# BenefitTracker MVP - Full Stack Implementation

## Architecture Overview

**Stack:**

- Backend: Node.js/TypeScript + Express
- Frontend: React/TypeScript + Vite
- Database: PostgreSQL 15+
- API Integration: OpenDental REST API
- Messaging: Twilio (SMS) + SendGrid (Email)

## Database Schema (PostgreSQL)

Create tables for:

- `practices` - dental practice accounts
- `patients` - patient records synced from OpenDental
- `insurance_plans` - insurance carrier details
- `patient_insurance` - patient coverage details (deductible, annual max, used amount, expiration)
- `benefits_snapshots` - historical tracking of benefits usage
- `outreach_campaigns` - automated campaign configurations
- `outreach_logs` - tracking of sent messages and responses
- `appointments` - scheduled appointments
- `users` - staff users with role-based access

## Backend Implementation

### 1. Project Setup

- Initialize Node.js/TypeScript project with Express
- Configure PostgreSQL connection with TypeORM or Prisma
- Set up environment variables (.env)
- Create Docker Compose for local development

### 2. OpenDental Integration Service

- Build OpenDental API client (`/backend/src/services/openDentalClient.ts`)
- Implement authentication with OpenDental API
- Create sync jobs for:
- Patient data (demographics, contact info)
- Insurance coverage (carrier, policy, group number)
- Claims and EOBs (to calculate used benefits)
- Appointments (past and scheduled)
- Handle rate limiting and error recovery

### 3. Benefits Calculation Engine

- Core service: `/backend/src/services/benefitsEngine.ts`
- Calculate remaining benefits per patient:
- Annual maximum (e.g., $1500)
- Deductible met/remaining
- Used benefits (from claims)
- Available balance = max - used
- Days until expiration
- Flag patients with >$200 remaining benefits expiring in <60 days
- Suggest eligible treatments based on remaining balance

### 4. Patient Outreach Automation

- Service: `/backend/src/services/outreachService.ts`
- Campaign trigger logic:
- Benefits expiring in 60 days
- Benefits expiring in 30 days
- Benefits expiring in 14 days
- Template system for personalized messages:
- "Hi {firstName}, you have ${amount} in dental benefits expiring {date}. Book now!"
- Integration with Twilio (SMS) and SendGrid (Email)
- Track delivery status and responses
- Scheduler using node-cron or Bull queue

### 5. REST API Endpoints

**Authentication:**

- POST `/api/auth/login` - staff login
- POST `/api/auth/register` - practice signup

**Patients:**

- GET `/api/patients` - list patients with benefits data
- GET `/api/patients/:id` - patient detail with full benefits breakdown
- POST `/api/patients/sync` - trigger OpenDental sync

**Benefits:**

- GET `/api/benefits/expiring` - patients with expiring benefits
- GET `/api/benefits/calculate/:patientId` - recalculate benefits for patient

**Outreach:**

- GET `/api/outreach/campaigns` - list campaigns
- POST `/api/outreach/campaigns` - create campaign
- GET `/api/outreach/logs` - message history
- POST `/api/outreach/send/:patientId` - manual message send

**Analytics:**

- GET `/api/analytics/recovered-revenue` - tracked recovered revenue
- GET `/api/analytics/campaign-performance` - campaign metrics

## Frontend Implementation

### 1. Project Setup

- Initialize React + TypeScript with Vite
- Set up React Router for navigation
- Configure Tailwind CSS or Material-UI
- Set up Axios for API calls

### 2. Authentication

- Login page (`/frontend/src/pages/Login.tsx`)
- Protected route wrapper
- JWT token management

### 3. Staff Dashboard (`/frontend/src/pages/Dashboard.tsx`)

- Summary cards:
- Total patients with expiring benefits
- Total value at risk
- Upcoming expirations this month
- Recovered revenue (MTD)
- Quick action buttons (sync data, send campaign)

### 4. Patient List (`/frontend/src/pages/Patients.tsx`)

- Sortable/filterable table with columns:
- Patient name
- Remaining benefits
- Days until expiration
- Last contact date
- Contact status (pending/sent/responded)
- Action buttons (send reminder, view details)
- Search and filter by expiration date, benefit amount
- Pagination

### 5. Patient Detail View (`/frontend/src/pages/PatientDetail.tsx`)

- Full insurance breakdown
- Benefits usage timeline
- Treatment suggestions
- Outreach history
- Quick send message button

### 6. Outreach Management (`/frontend/src/pages/Outreach.tsx`)

- Campaign list and creation
- Message template editor
- Scheduling interface
- Performance metrics (sent, delivered, clicked, booked)

### 7. Analytics Dashboard (`/frontend/src/pages/Analytics.tsx`)

- Charts showing:
- Monthly recovered revenue
- Campaign effectiveness
- Benefits utilization trends
- Top performing message types

## Infrastructure & DevOps

### 1. Docker Setup

- `docker-compose.yml` with PostgreSQL, backend, frontend
- Development environment with hot reload
- Volume mounts for database persistence

### 2. Environment Configuration

- Backend: database URL, OpenDental API credentials, Twilio/SendGrid keys
- Frontend: API base URL

### 3. Database Migrations

- Use TypeORM migrations or Prisma migrate
- Seed script with sample data for testing

### 4. Documentation

- README.md with setup instructions
- API documentation (Swagger/OpenAPI)
- Environment variables template (.env.example)

## Testing Strategy

- Backend unit tests for benefits calculation logic
- Integration tests for OpenDental API client
- Frontend component tests for key UI elements

## MVP Constraints & Future Enhancements

**MVP includes:**

- Single practice support
- Manual sync trigger (vs. automatic hourly)
- Basic email/SMS templates
- Simple analytics

**Post-MVP:**

- Multi-practice support
- Real-time sync via webhooks
- AI-powered message optimization
- Insurance carrier API integration (beyond OpenDental)
- Mobile app for patients
- Advanced scheduling integration