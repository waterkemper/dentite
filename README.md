# ?? Dentite - Dental Benefits Tracker

**Prevent thousands in lost revenue by tracking dental insurance benefits before they expire.**

Dentite is a full-stack SaaS platform that helps dental practices automatically monitor patient insurance benefits, send automated reminders, and recover revenue from expiring coverage.

---

## ?? Problem & Solution

**Problem:** Dental practices lose thousands every year because patients don't use their insurance benefits before they expire (typically December 31st).

**Solution:** Dentite automatically:
- Syncs with practice management systems (OpenDental)
- Tracks remaining benefits, deductibles, and expiration dates
- Sends personalized SMS/email reminders to patients
- Provides a clean dashboard for staff to prioritize outreach
- Tracks recovered revenue and campaign performance

---

## ?? Business Model

- **$200-$300/month** per practice
- Optional **booking fees** for scheduled appointments
- **Target:** 300-400 practices = $1M ARR

---

## ?? Features

### ? MVP Features (Implemented)

1. **OpenDental Integration**
   - Sync patient data, insurance details, and claims
   - Mock data included for testing without OpenDental access

2. **Benefits Calculation Engine**
   - Automatically calculate remaining benefits
   - Track deductibles, annual maximums, and usage
   - Flag patients with expiring benefits
   - Suggest treatments based on remaining coverage

3. **Automated Outreach**
   - Configurable campaigns (60, 30, 14 days before expiry)
   - SMS (via Twilio) and Email (via SendGrid) support
   - Personalized message templates
   - Automated scheduling via cron jobs
   - **NEW:** Advanced tracking (email opens, clicks, SMS delivery status)
   - **NEW:** Patient opt-out/unsubscribe management
   - **NEW:** HIPAA-compliant webhook handlers

4. **Staff Dashboard**
   - Real-time metrics: patients at risk, value at risk, recovered revenue
   - Patient list with filtering and sorting
   - Individual patient detail views with full benefits breakdown
   - Quick actions for sync and outreach

5. **Analytics & Reporting**
   - Recovered revenue tracking
   - Campaign performance metrics
   - Monthly revenue trends
   - **NEW:** Email open rates, click rates, and click-to-open rates
   - **NEW:** SMS delivery rates and failure tracking
   - **NEW:** Detailed webhook event audit trail

---

## ??? Tech Stack

### Backend
- **Node.js** + **TypeScript** + **Express**
- **PostgreSQL** (via Prisma ORM)
- **JWT** authentication
- **Twilio** (SMS) + **SendGrid** (Email)
- **node-cron** for scheduled jobs

### Frontend
- **React** + **TypeScript** + **Vite**
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Recharts** for analytics visualization
- **Axios** for API calls

### Infrastructure
- **Docker** + **Docker Compose** for local development
- **Prisma** for database migrations
- Environment-based configuration

---

## ?? Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional, recommended)

### Option 1: Docker Setup (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd Dentite
```

2. **Install dependencies**
```bash
npm install
```

3. **Start with Docker Compose**
```bash
npm run docker:up
```

This will start:
- PostgreSQL database on port 5432
- Backend API on port 3000
- Frontend app on port 5173

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Database: localhost:5432

### Option 2: Manual Setup

1. **Clone and install**
```bash
git clone <repository-url>
cd Dentite
npm install
```

2. **Set up PostgreSQL**
```bash
# Create database
createdb dentite
```

3. **Configure environment variables**

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

**Frontend** (`frontend/.env`):
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

4. **Run database migrations**
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

5. **Start the applications**

In separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

---

## ?? Database Schema

The system uses PostgreSQL with the following main tables:

- **practices** - Dental practice accounts
- **users** - Staff users with role-based access
- **patients** - Patient records synced from OpenDental
- **insurance_plans** - Insurance carrier details
- **patient_insurance** - Patient coverage (deductible, max, used, remaining)
- **benefits_snapshots** - Historical tracking of benefits
- **outreach_campaigns** - Automated campaign configurations
- **outreach_logs** - Message history and delivery status
- **appointments** - Scheduled/completed appointments

---

## ?? Default Login Credentials

After running the seed script, you can login with:

- **Email:** admin@dentalpractice.com
- **Password:** password123

---

## ?? API Endpoints

### Authentication
- `POST /api/auth/register` - Register new practice
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - List patients with benefits data
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients/sync` - Sync from OpenDental

### Benefits
- `GET /api/benefits/expiring` - Get expiring benefits
- `GET /api/benefits/calculate/:patientId` - Recalculate benefits

### Outreach
- `GET /api/outreach/campaigns` - List campaigns
- `POST /api/outreach/campaigns` - Create campaign
- `GET /api/outreach/logs` - Message history
- `POST /api/outreach/send/:patientId` - Send manual message

### Analytics
- `GET /api/analytics/recovered-revenue` - Revenue metrics
- `GET /api/analytics/campaign-performance` - Campaign stats
- `GET /api/analytics/dashboard` - Dashboard summary

---

## ?? Configuration

### OpenDental Integration

To connect to a real OpenDental instance, configure in `backend/.env`:

```bash
OPENDENTAL_API_URL=https://your-opendental-server.com/api/v1
OPENDENTAL_API_KEY=your-api-key
OPENDENTAL_CLIENT_ID=your-client-id
OPENDENTAL_CLIENT_SECRET=your-client-secret
```

**Note:** The current implementation includes mock data for development. Replace with actual OpenDental API calls in production.

### SMS & Email Setup

**Twilio (SMS):**
```bash
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

**SendGrid (Email):**
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@dentite.com
SENDGRID_FROM_NAME=Dentite Benefits Tracker
```

---

## ?? Automated Jobs

The system runs two automated cron jobs:

1. **Daily Outreach (9 AM)**
   - Process all active campaigns
   - Send reminders to patients with expiring benefits
   - Track delivery status

2. **Benefits Update (2 AM)**
   - Update benefits snapshots for all patients
   - Recalculate remaining coverage
   - Identify newly expiring benefits

---

## ?? Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## ?? Deployment

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Configure production database
   - Add real API keys (Twilio, SendGrid, OpenDental)

2. **Database**
   - Run migrations: `npx prisma migrate deploy`
   - Set up backups
   - Enable SSL connections

3. **Backend**
   - Build: `npm run build`
   - Start: `npm start`
   - Use process manager (PM2, systemd)

4. **Frontend**
   - Build: `npm run build`
   - Serve with nginx or CDN
   - Set production API URL

5. **Security**
   - Enable HTTPS
   - Set up CORS properly
   - Rate limiting
   - Input validation

---

## ??? Roadmap

### Post-MVP Features

- [ ] Multi-practice support (white-label for DSOs)
- [ ] Real-time sync via webhooks
- [ ] AI-powered message optimization
- [ ] Additional PMS integrations (Dentrix, Eaglesoft, Carestream)
- [ ] Direct insurance carrier API integration
- [ ] Mobile app for patients
- [ ] Advanced scheduling integration
- [ ] Predictive analytics (who's likely to book)
- [ ] Automated appointment booking
- [ ] Treatment plan integration

---

## ?? Usage Tips

1. **Initial Setup**
   - Run the OpenDental sync to import your patient data
   - Create your first outreach campaign
   - Set minimum benefit thresholds ($200 recommended)

2. **Best Practices**
   - Run sync weekly or after major billing cycles
   - Create campaigns for 60, 30, and 14 days before expiry
   - Personalize message templates for your practice voice
   - Monitor campaign performance and adjust timing

3. **Maximizing ROI**
   - Follow up on high-value patients ($500+) personally
   - Track which treatments patients book most
   - Use analytics to optimize campaign timing
   - Train staff on the dashboard features

---

## ?? Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Architecture Overview](ARCHITECTURE.md)** - System design and architecture
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Email/SMS Tracking Setup](EMAIL_SMS_TRACKING_SETUP.md)** - Configure messaging tracking
- **[HIPAA Compliance](HIPAA_COMPLIANCE.md)** - HIPAA requirements and best practices

---

## ?? Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ?? License

This project is proprietary software. All rights reserved.

---

## ?? Support

For questions, issues, or feature requests:
- Email: support@dentite.com
- Documentation: https://docs.dentite.com
- GitHub Issues: [Create an issue](https://github.com/your-org/dentite/issues)

---

## ?? Acknowledgments

Built with:
- Express.js
- React
- PostgreSQL
- Prisma
- Tailwind CSS
- Twilio
- SendGrid
- Recharts

---

**Made with ?? for dental practices everywhere.**
