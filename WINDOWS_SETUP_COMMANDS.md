# Windows Setup Commands for Sequence Campaigns

Run these commands in PowerShell to activate the new multi-message drip campaign feature.

## Step 1: Run Database Migration

Open PowerShell and navigate to the backend directory:

```powershell
cd C:\Dentite\backend
```

Run the Prisma migration to create the new tables:

```powershell
npx prisma migrate dev --name add_campaign_sequences
```

This will:
- Create `campaign_steps` table
- Create `patient_sequence_states` table  
- Update `outreach_campaigns` table
- Update `outreach_logs` table

## Step 2: Generate Prisma Client

Generate the updated Prisma client with the new models:

```powershell
npx prisma generate
```

This resolves the TypeScript errors you'll see before running this command.

## Step 3: Restart Backend

If your backend is running, restart it:

```powershell
# Stop the current process (Ctrl+C if running)
# Then start again:
npm run dev
```

## Step 4: Verify Installation

Check that the cron job is scheduled (you should see this in console):

```
? Cron jobs scheduled successfully
```

You'll see this message every 15 minutes:

```
Running sequence processing job...
```

## Step 5: Test the Feature

1. Open your browser to the frontend (usually `http://localhost:5173`)
2. Navigate to **Outreach** page
3. Click **Create Campaign**
4. You should now see two options:
   - Single Message
   - Multi-Step Sequence ? NEW!

## Verify Database Tables

To confirm tables were created, you can use Prisma Studio:

```powershell
cd C:\Dentite\backend
npx prisma studio
```

Look for these new tables:
- `campaign_steps`
- `patient_sequence_states`

## Common Issues

### Issue: "Property 'campaignStep' does not exist"

**Solution**: You need to run `npx prisma generate` after the migration.

```powershell
cd C:\Dentite\backend
npx prisma generate
```

### Issue: Migration fails with "relation already exists"

**Solution**: The tables might already exist. You can check with:

```powershell
npx prisma migrate status
```

If needed, reset and rerun:

```powershell
# ?? This will delete all data - only use in development
npx prisma migrate reset
npx prisma migrate dev
```

### Issue: Cron job not running

**Solution**: Make sure your backend is running and check the console for error messages.

## Quick Test Sequence

Create a test sequence to verify everything works:

1. **Create Campaign**:
   - Name: "Test Sequence"
   - Type: Multi-Step Sequence
   - Trigger: 60 days before expiry
   - Min Amount: $100

2. **Add Steps**:
   - Step 1: Email, 60 days before expiry
     - "Hi {firstName}, test message 1"
   - Step 2: SMS, 30 days before expiry  
     - "Test message 2 - {amount}"

3. **Auto-Stop**:
   - ? All checkboxes enabled

4. **Save Campaign**

5. **Verify in Database**:
   ```powershell
   npx prisma studio
   ```
   - Check `outreach_campaigns` - should have `isSequence: true`
   - Check `campaign_steps` - should show 2 steps

## Full Restart (If Needed)

If things aren't working, do a full restart:

```powershell
# Terminal 1 - Backend
cd C:\Dentite\backend
npm run dev

# Terminal 2 - Frontend (new PowerShell window)
cd C:\Dentite\frontend
npm run dev
```

## Next Steps

Once everything is working:

1. Read `SEQUENCE_CAMPAIGNS_SETUP.md` for detailed usage
2. Read `SEQUENCE_CAMPAIGNS_IMPLEMENTATION.md` for technical details
3. Create your first real sequence campaign
4. Monitor the logs to see sequences processing

## Need Help?

Check the logs in your terminal:
- Backend logs show cron job execution
- Look for "Running sequence processing job..." every 15 minutes
- Any errors will be displayed in the console

## Windows-Specific Notes

- Use PowerShell (not CMD)
- Paths with spaces: Use quotes like `cd "C:\My Path\Dentite"`
- If npm commands fail, try running PowerShell as Administrator
- Use `Ctrl+C` to stop running processes
- Use `&` to run commands in background (though not needed here)

---

## Summary of Commands

```powershell
# 1. Navigate to backend
cd C:\Dentite\backend

# 2. Run migration
npx prisma migrate dev --name add_campaign_sequences

# 3. Generate client
npx prisma generate

# 4. Restart backend
npm run dev
```

That's it! Your multi-message drip campaign feature is now active. ??

