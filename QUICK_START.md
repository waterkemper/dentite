# 🚀 Dentite Quick Start Guide

Get up and running with Dentite in 5 minutes!

---

## Option 1: Docker (Easiest - Recommended)

### Step 1: Install Docker
Make sure you have Docker and Docker Compose installed:
- [Install Docker Desktop](https://www.docker.com/products/docker-desktop)

### Step 2: Clone and Start
```bash
# Clone the repository
git clone <repository-url>
cd Dentite

# Install root dependencies
npm install

# Start everything with Docker
npm run docker:up
```

That's it! 🎉

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **Database:** localhost:5432

### Step 3: Access the App

Open your browser to http://localhost:5173 and login with:
- **Email:** admin@dentalpractice.com
- **Password:** password123

---

## Option 2: Manual Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+

### Step 1: Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd Dentite

# Install all dependencies
npm install
```

### Step 2: Setup Database
```bash
# Create PostgreSQL database
createdb dentite

# Or using psql
psql -U postgres
CREATE DATABASE dentite;
\q
```

### Step 3: Configure Environment

Create backend environment file:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/dentite
JWT_SECRET=your-super-secret-key-change-this
PORT=3000
NODE_ENV=development
```

Create frontend environment file:
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000
```

### Step 4: Initialize Database
```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed sample data
npm run db:seed

cd ..
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 6: Access the App

Open http://localhost:5173 and login with:
- **Email:** admin@dentalpractice.com
- **Password:** password123

---

## 🎯 What's Included

After setup, you'll have:

✅ **5 Sample Patients** with realistic insurance data  
✅ **2 Insurance Plans** (Delta Dental, MetLife)  
✅ **1 Sample Campaign** (Year-End Benefits Reminder)  
✅ **Mock OpenDental Integration** (works without real OpenDental)  
✅ **Full Dashboard** with metrics and analytics  

---

## 🧪 Testing the Features

### 1. Dashboard
- View summary metrics
- See patients with expiring benefits
- Click "Sync OpenDental" to load more mock data

### 2. Patients
- Browse patient list with benefits data
- Click any patient to see detailed view
- Send manual reminders to patients

### 3. Outreach
- View existing campaigns
- Create new campaigns with custom triggers
- See campaign performance metrics

### 4. Analytics
- View recovered revenue charts
- Track campaign performance
- Monitor delivery and response rates

---

## 🔧 Common Issues

### Port Already in Use
If ports 3000 or 5173 are already in use:

**Backend:**
```bash
# Change PORT in backend/.env
PORT=3001
```

**Frontend:**
```bash
# Change in frontend/vite.config.ts
server: { port: 5174 }
```

### Database Connection Error
Make sure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# Use Services app to start PostgreSQL service
```

### Docker Issues
If Docker containers don't start:
```bash
# Stop and remove containers
npm run docker:down

# Remove volumes
docker-compose down -v

# Rebuild and start
npm run docker:up
```

---

## 📚 Next Steps

1. **Explore the Code**
   - Backend: `backend/src/`
   - Frontend: `frontend/src/`
   - Database: `backend/prisma/schema.prisma`

2. **Customize**
   - Add your practice branding
   - Modify message templates
   - Adjust campaign triggers

3. **Connect Real Data**
   - Configure OpenDental API credentials
   - Set up Twilio for SMS
   - Configure SendGrid for email

4. **Deploy**
   - See README.md for deployment instructions
   - Configure production environment variables

---

## 🆘 Need Help?

- **Documentation:** See README.md and API_DOCUMENTATION.md
- **Issues:** Create a GitHub issue
- **Email:** support@dentite.com

---

**Happy tracking! 🦷**

