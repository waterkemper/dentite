import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { OutreachService } from '../services/outreachService';
import { BenefitsEngine } from '../services/benefitsEngine';

export const setupCronJobs = (): void => {
  const outreachService = new OutreachService();
  const benefitsEngine = new BenefitsEngine();

  // Run automated outreach daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running automated outreach job...');
    
    try {
      const practices = await prisma.practice.findMany({
        where: { subscriptionStatus: 'active' },
      });

      for (const practice of practices) {
        try {
          const result = await outreachService.processAutomatedOutreach(practice.id);
          console.log(`Outreach completed for practice ${practice.name}: ${result.sent} sent, ${result.failed} failed`);
        } catch (error) {
          console.error(`Error processing outreach for practice ${practice.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Automated outreach job error:', error);
    }
  });

  // Update benefits snapshots daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running benefits snapshot job...');
    
    try {
      const practices = await prisma.practice.findMany({
        where: { subscriptionStatus: 'active' },
      });

      for (const practice of practices) {
        try {
          const result = await benefitsEngine.batchUpdateBenefits(practice.id);
          console.log(`Benefits updated for practice ${practice.name}: ${result.updated} patients`);
        } catch (error) {
          console.error(`Error updating benefits for practice ${practice.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Benefits snapshot job error:', error);
    }
  });

  console.log('✅ Cron jobs scheduled successfully');
};

