# 🏗️ Dentite Architecture

This document describes the technical architecture of the Dentite dental benefits tracking system.

---

## System Overview

Dentite is a full-stack TypeScript application following a modern three-tier architecture:

1. **Presentation Layer** - React frontend with Tailwind CSS
2. **Application Layer** - Express.js REST API with business logic
3. **Data Layer** - PostgreSQL database with Prisma ORM

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │   Patients   │  │  Outreach    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│              ▼              ▼              ▼                │
│         ┌─────────────────────────────────────┐            │
│         │      API Client (Axios)              │            │
│         └─────────────────────────────────────┘            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Backend API (Express.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │  Middleware  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────┐       │
│  │           Business Logic Layer                   │       │
│  │  • Benefits Engine  • Outreach Service           │       │
│  │  • OpenDental Client  • Cron Jobs                │       │
│  └─────────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Patients │  │Insurance │  │ Outreach │  │Analytics │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology Stack
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **date-fns** - Date manipulation
- **Lucide React** - Icon library

### Directory Structure
```
frontend/src/
├── components/         # Reusable UI components
│   ├── Layout.tsx
│   └── PrivateRoute.tsx
├── contexts/          # React contexts (Auth, etc.)
│   └── AuthContext.tsx
├── lib/               # Utilities and configs
│   └── api.ts         # Axios instance
├── pages/             # Page components
│   ├── Dashboard.tsx
│   ├── Patients.tsx
│   ├── PatientDetail.tsx
│   ├── Outreach.tsx
│   ├── Analytics.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── App.tsx            # Root component with routing
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

### Key Features
- **Authentication** - JWT-based with AuthContext
- **Protected Routes** - Automatic redirect to login
- **Responsive Design** - Mobile-first with Tailwind
- **State Management** - React hooks and context
- **API Integration** - Centralized Axios instance with interceptors

---

## Backend Architecture

### Technology Stack
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM and migrations
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **node-cron** - Scheduled jobs
- **Twilio** - SMS delivery
- **SendGrid** - Email delivery

### Directory Structure
```
backend/src/
├── controllers/       # Request handlers
│   ├── auth.controller.ts
│   ├── patient.controller.ts
│   ├── benefits.controller.ts
│   ├── outreach.controller.ts
│   └── analytics.controller.ts
├── services/          # Business logic
│   ├── openDentalClient.ts
│   ├── benefitsEngine.ts
│   └── outreachService.ts
├── routes/            # API routes
│   ├── auth.routes.ts
│   ├── patient.routes.ts
│   ├── benefits.routes.ts
│   ├── outreach.routes.ts
│   └── analytics.routes.ts
├── middleware/        # Express middleware
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── validateRequest.ts
├── jobs/              # Cron jobs
│   └── cronJobs.ts
├── lib/               # Utilities
│   └── prisma.ts
├── db/                # Database scripts
│   └── seed.ts
└── index.ts           # Application entry point
```

### Layered Architecture

#### 1. Routes Layer
- Define API endpoints
- Apply middleware (auth, validation)
- Delegate to controllers

#### 2. Controllers Layer
- Handle HTTP requests/responses
- Input validation
- Call service layer
- Return formatted responses

#### 3. Services Layer
- **Benefits Engine** - Calculate remaining benefits
- **Outreach Service** - Send SMS/email campaigns
- **OpenDental Client** - Sync patient data
- Business logic and calculations

#### 4. Data Access Layer
- Prisma ORM
- Database queries
- Transaction management

---

## Database Schema

### Core Tables

**practices**
- Practice account information
- Subscription status
- OpenDental API credentials

**users**
- Staff user accounts
- Role-based access (admin, staff)
- Belongs to practice

**patients**
- Patient demographics
- External OpenDental ID
- Contact information

**insurance_plans**
- Insurance carrier details
- Default benefit amounts
- Group numbers

**patient_insurance**
- Patient-specific coverage
- Annual maximum, deductible
- Used/remaining benefits
- Expiration date

**benefits_snapshots**
- Historical tracking
- Benefits over time
- For analytics and trending

**outreach_campaigns**
- Campaign configuration
- Trigger conditions
- Message templates

**outreach_logs**
- Message delivery tracking
- Status updates
- Response tracking

**appointments**
- Scheduled appointments
- Booked from outreach flag
- Cost tracking for ROI

### Relationships

```
Practice (1) ──→ (N) Users
Practice (1) ──→ (N) Patients
Practice (1) ──→ (N) Insurance Plans
Practice (1) ──→ (N) Outreach Campaigns

Patient (1) ──→ (N) Patient Insurance
Patient (1) ──→ (N) Benefits Snapshots
Patient (1) ──→ (N) Outreach Logs
Patient (1) ──→ (N) Appointments

Insurance Plan (1) ──→ (N) Patient Insurance
Outreach Campaign (1) ──→ (N) Outreach Logs
```

---

## Key Services

### 1. Benefits Calculation Engine

**Responsibilities:**
- Calculate remaining benefits per patient
- Track deductibles and usage
- Identify expiring coverage
- Suggest treatments based on remaining amount

**Algorithm:**
```typescript
remainingBenefits = annualMaximum - usedBenefits
daysUntilExpiry = expirationDate - currentDate

if (remainingBenefits >= minThreshold && daysUntilExpiry <= triggerDays) {
  flagForOutreach()
}
```

### 2. Outreach Automation Service

**Responsibilities:**
- Process automated campaigns
- Personalize message templates
- Send via Twilio (SMS) and SendGrid (Email)
- Track delivery status
- Prevent duplicate messages

**Flow:**
```
1. Identify patients matching campaign criteria
2. Check if already contacted recently
3. Personalize message with patient data
4. Send via configured channel(s)
5. Log delivery status
6. Update patient record
```

### 3. OpenDental Integration

**Responsibilities:**
- Authenticate with OpenDental API
- Sync patient data
- Sync insurance information
- Sync claims for benefit usage
- Handle rate limiting and errors

**Sync Strategy:**
```
1. Fetch patients from OpenDental
2. For each patient:
   - Upsert patient record
   - Sync insurance plans
   - Fetch and calculate claims
   - Update benefits
3. Create benefits snapshots
4. Return sync summary
```

---

## Authentication & Security

### JWT Authentication
```
1. User logs in with email/password
2. Server validates credentials
3. Server generates JWT with user data
4. Client stores token in localStorage
5. Client includes token in Authorization header
6. Server validates token on each request
```

### Security Measures
- Password hashing with bcrypt (10 rounds)
- JWT token expiration (7 days default)
- Protected routes with middleware
- Input validation with express-validator
- Helmet.js for security headers
- CORS configuration
- SQL injection prevention (Prisma parameterized queries)

---

## Automated Jobs

### Cron Schedule

**Daily Outreach (9:00 AM)**
```typescript
cron.schedule('0 9 * * *', async () => {
  // Process all active campaigns
  // Send reminders to qualifying patients
});
```

**Benefits Update (2:00 AM)**
```typescript
cron.schedule('0 2 * * *', async () => {
  // Recalculate all patient benefits
  // Create new snapshots
  // Identify newly expiring benefits
});
```

---

## API Design Principles

### RESTful Conventions
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT/PATCH` - Update resources
- `DELETE` - Remove resources

### Response Format
```typescript
// Success
{
  data: { ... },
  meta: { pagination, etc. }
}

// Error
{
  error: "Error message",
  details: [ ... ]
}
```

### Status Codes
- `200` OK - Successful GET
- `201` Created - Successful POST
- `400` Bad Request - Validation error
- `401` Unauthorized - Missing/invalid token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource doesn't exist
- `500` Internal Server Error - Server error

---

## Performance Considerations

### Database Optimization
- Indexes on foreign keys
- Indexes on commonly filtered fields
- Pagination for large result sets
- Selective field loading with Prisma

### Caching Strategy
- JWT tokens cached on client
- Static assets cached by CDN
- Database query results (future: Redis)

### Scalability
- Stateless API design
- Horizontal scaling capable
- Database connection pooling
- Async job processing (future: Bull queue)

---

## Monitoring & Logging

### Application Logs
- Request logging with Morgan
- Error logging with console.error
- Database query logging (development)

### Health Checks
- `GET /health` - API health status
- Database connectivity check
- External service status (future)

---

## Future Enhancements

### Short Term
- [ ] WebSocket for real-time updates
- [ ] Redis for caching and queue
- [ ] Rate limiting per user
- [ ] API documentation with Swagger

### Medium Term
- [ ] Multi-tenancy improvements
- [ ] Advanced analytics with ML
- [ ] Mobile app (React Native)
- [ ] Additional PMS integrations

### Long Term
- [ ] Microservices architecture
- [ ] Event-driven architecture
- [ ] GraphQL API option
- [ ] AI-powered messaging optimization

---

## Development Workflow

### Local Development
```bash
# Start all services
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev
```

### Database Management
```bash
# Create migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# View database
npx prisma studio

# Seed data
npm run db:seed
```

### Building for Production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

---

## Testing Strategy

### Unit Tests
- Business logic in services
- Utility functions
- Benefits calculation algorithms

### Integration Tests
- API endpoints
- Database operations
- External service mocks

### E2E Tests
- Critical user flows
- Authentication
- Campaign creation
- Patient management

---

## Deployment Architecture

### Recommended Stack
- **Frontend:** Vercel or Netlify
- **Backend:** AWS ECS, Railway, or Render
- **Database:** AWS RDS PostgreSQL
- **Redis:** AWS ElastiCache (future)
- **Monitoring:** DataDog or New Relic
- **Logging:** CloudWatch or Logtail

### CI/CD Pipeline
1. Push to GitHub
2. Run tests
3. Build Docker images
4. Deploy to staging
5. Run smoke tests
6. Deploy to production
7. Monitor and alert

---

**For questions or contributions, see README.md**

