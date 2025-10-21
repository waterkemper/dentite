# Domain Verification Guide

## For Pre-Verified Domains in SendGrid

If your domain is already verified in SendGrid, you can use the new "Mark as Verified" button to update Dentite's status.

### Steps:

1. **Set up environment variables** (if not done already):
   ```bash
   # Create .env file in backend directory
   cd backend
   echo 'ENCRYPTION_KEY="54f88655368451f677b51080413c1e9acb70cc093cefbdc123a6fb0a04d3b8f0"' > .env
   echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/dentite"' >> .env
   echo 'JWT_SECRET="your-jwt-secret-key-here"' >> .env
   echo 'WEBHOOK_BASE_URL="http://localhost:3000"' >> .env
   ```

2. **Restart the backend server**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Configure your email settings**:
   - Go to Settings > Email Configuration
   - Select "Use Custom Domain (SendGrid)"
   - Enter your SendGrid API key
   - Enter your verified domain email (e.g., `noreply@yourdomain.com`)
   - Enter your clinic name
   - Click "Save Configuration"

4. **Mark domain as verified**:
   - In the "Domain Verification Status" section, you'll see "Not Verified"
   - Click the green "Mark as Verified" button
   - Confirm that your domain is already verified in SendGrid
   - The status will update to "Verified" ✅

5. **Test your configuration**:
   - Click "Send Test Email" to verify everything works
   - The email should be sent from your custom domain

## What This Does

- **Updates the database**: Sets `emailDomainVerified = true` and `emailVerificationStatus = 'verified'`
- **Enables custom domain sending**: Your emails will now be sent from your verified domain
- **Maintains fallback**: If custom sending fails, it falls back to system email

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required"
- **Solution**: Make sure you've created the `.env` file in the `backend/` directory with the encryption key

### Error: "Failed to update email configuration"
- **Check**: All required environment variables are set
- **Verify**: Database connection is working
- **Restart**: Backend server after adding environment variables

### Domain still shows "Not Verified"
- **Try**: Click "Check Status" first to see if SendGrid reports it as verified
- **Use**: "Mark as Verified" button if you're certain it's verified in SendGrid
- **Verify**: Your SendGrid API key has the correct permissions

## Benefits

✅ **Professional emails** - Sent from your clinic's domain  
✅ **Better deliverability** - Higher inbox placement rates  
✅ **Brand consistency** - Patients see emails from your clinic  
✅ **Fallback protection** - System email if custom fails  

---

**Status**: ✅ Ready to use  
**Last Updated**: January 21, 2025
