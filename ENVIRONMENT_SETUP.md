# Environment Setup Guide

## Required Environment Variables

The multi-tenant messaging system requires several environment variables to be set. Create a `.env` file in the `backend` directory with the following variables:

### 1. Create `.env` file in `backend/` directory:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/dentite"

# JWT
JWT_SECRET="your-jwt-secret-key-here"

# Encryption Key for Multi-Tenant Messaging
# This key is used to encrypt API keys and credentials stored in the database
# Generated: 2025-01-21
ENCRYPTION_KEY="54f88655368451f677b51080413c1e9acb70cc093cefbdc123a6fb0a04d3b8f0"

# SendGrid (System Default)
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@dentite.com"
SENDGRID_FROM_NAME="Dentite Benefits Tracker"

# Twilio (System Default)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Webhook Base URL
WEBHOOK_BASE_URL="http://localhost:3000"
```

## Quick Setup Commands

### 1. Create the .env file:
```bash
cd backend
touch .env
```

### 2. Add the encryption key (required):
```bash
echo 'ENCRYPTION_KEY="54f88655368451f677b51080413c1e9acb70cc093cefbdc123a6fb0a04d3b8f0"' >> .env
```

### 3. Add other required variables:
```bash
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/dentite"' >> .env
echo 'JWT_SECRET="your-jwt-secret-key-here"' >> .env
echo 'WEBHOOK_BASE_URL="http://localhost:3000"' >> .env
```

## Variable Descriptions

### Required Variables:

- **`ENCRYPTION_KEY`** - 64-character hex string for encrypting API keys
- **`DATABASE_URL`** - PostgreSQL connection string
- **`JWT_SECRET`** - Secret key for JWT token signing
- **`WEBHOOK_BASE_URL`** - Base URL for webhook callbacks

### Optional Variables (for system defaults):

- **`SENDGRID_API_KEY`** - Default SendGrid API key for system emails
- **`SENDGRID_FROM_EMAIL`** - Default sender email
- **`SENDGRID_FROM_NAME`** - Default sender name
- **`TWILIO_ACCOUNT_SID`** - Default Twilio account SID
- **`TWILIO_AUTH_TOKEN`** - Default Twilio auth token
- **`TWILIO_PHONE_NUMBER`** - Default Twilio phone number

## Security Notes

1. **Never commit the `.env` file** - it's already in `.gitignore`
2. **Keep the encryption key secure** - it's used to encrypt all stored credentials
3. **Use different keys for production** - generate new encryption keys for each environment
4. **Rotate keys periodically** - for enhanced security

## Testing the Setup

After setting up the environment variables:

1. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test the email configuration:**
   - Go to Settings > Email Configuration
   - Try to save email settings
   - Should work without the encryption error

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required"
- **Solution:** Add the `ENCRYPTION_KEY` to your `.env` file
- **Check:** Make sure the `.env` file is in the `backend/` directory
- **Verify:** Restart the server after adding the variable

### Error: "Failed to update email configuration"
- **Check:** All required environment variables are set
- **Verify:** Database connection is working
- **Test:** Try the test connection feature

## Production Setup

For production environments:

1. **Generate a new encryption key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set secure values for all variables**
3. **Use environment-specific configuration**
4. **Enable HTTPS for webhook URLs**

---

**Generated:** January 21, 2025  
**Status:** ✅ Ready for setup
