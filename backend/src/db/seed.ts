import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('ðŸŒ± Seeding database...');

  // Create practice
  const practice = await prisma.practice.upsert({
    where: { email: 'demo@dentalpractice.com' },
    update: {},
    create: {
      name: 'Springfield Dental Care',
      email: 'demo@dentalpractice.com',
      phone: '555-DENTAL',
      address: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      subscriptionStatus: 'active',
    },
  });

  console.log('âœ… Created practice:', practice.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@dentalpractice.com' },
    update: {},
    create: {
      practiceId: practice.id,
      email: 'admin@dentalpractice.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  });

  console.log('âœ… Created user:', user.email);

  // Create insurance plans
  const deltaInsurance = await prisma.insurancePlan.create({
    data: {
      practiceId: practice.id,
      carrierName: 'Delta Dental',
      planName: 'PPO Standard',
      annualMaximum: new Prisma.Decimal(1500),
      deductible: new Prisma.Decimal(50),
    },
  });

  const metlifeInsurance = await prisma.insurancePlan.create({
    data: {
      practiceId: practice.id,
      carrierName: 'MetLife',
      planName: 'Preferred Dental',
      annualMaximum: new Prisma.Decimal(2000),
      deductible: new Prisma.Decimal(100),
    },
  });

  console.log('âœ… Created insurance plans');

  // Create sample patients
  const patients = [
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '555-0101',
      dateOfBirth: new Date('1985-03-15'),
      insurancePlan: deltaInsurance,
      usedBenefits: 600,
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.j@email.com',
      phone: '555-0102',
      dateOfBirth: new Date('1990-07-22'),
      insurancePlan: metlifeInsurance,
      usedBenefits: 400,
    },
    {
      firstName: 'Michael',
      lastName: 'Williams',
      email: 'mwilliams@email.com',
      phone: '555-0103',
      dateOfBirth: new Date('1978-11-30'),
      insurancePlan: deltaInsurance,
      usedBenefits: 200,
    },
    {
      firstName: 'Emily',
      lastName: 'Brown',
      email: 'ebrown@email.com',
      phone: '555-0104',
      dateOfBirth: new Date('1995-05-18'),
      insurancePlan: deltaInsurance,
      usedBenefits: 1100,
    },
    {
      firstName: 'David',
      lastName: 'Martinez',
      email: 'dmartinez@email.com',
      phone: '555-0105',
      dateOfBirth: new Date('1982-09-25'),
      insurancePlan: metlifeInsurance,
      usedBenefits: 750,
    },
  ];

  for (const patientData of patients) {
    const patient = await prisma.patient.create({
      data: {
        practiceId: practice.id,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        email: patientData.email,
        phone: patientData.phone,
        dateOfBirth: patientData.dateOfBirth,
        address: '123 Patient St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        lastVisitDate: new Date(new Date().getFullYear(), 5, 15),
      },
    });

    const annualMax = Number(patientData.insurancePlan.annualMaximum);
    const remaining = annualMax - patientData.usedBenefits;

    await prisma.patientInsurance.create({
      data: {
        patientId: patient.id,
        insurancePlanId: patientData.insurancePlan.id,
        expirationDate: new Date(new Date().getFullYear(), 11, 31), // Dec 31
        annualMaximum: patientData.insurancePlan.annualMaximum,
        deductible: patientData.insurancePlan.deductible,
        deductibleMet: patientData.insurancePlan.deductible,
        usedBenefits: new Prisma.Decimal(patientData.usedBenefits),
        remainingBenefits: new Prisma.Decimal(remaining),
        isPrimary: true,
      },
    });

    console.log(`âœ… Created patient: ${patient.firstName} ${patient.lastName}`);
  }

  // Create sample outreach campaign
  const campaign = await prisma.outreachCampaign.create({
    data: {
      practiceId: practice.id,
      name: 'Year-End Benefits Reminder',
      description: 'Remind patients about expiring benefits before December 31st',
      triggerType: 'expiring_60',
      messageType: 'both',
      messageTemplate: 'Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}. Don\'t let them go to waste! Call us at 555-DENTAL to schedule your appointment today.',
      minBenefitAmount: new Prisma.Decimal(200),
      isActive: true,
    },
  });

  console.log('âœ… Created outreach campaign:', campaign.name);

  // Create pricing plans
  const pricingPlans = [
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'Perfect for small dental practices',
      price: new Prisma.Decimal(99.00),
      messagesIncluded: 1000,
      userSeatsIncluded: 3,
      hasBasicAnalytics: true,
      hasAdvancedAnalytics: false,
      hasCampaignSequences: false,
      hasCustomIntegrations: false,
      hasPhoneSupport: false,
      hasDedicatedManager: false,
      sortOrder: 1,
    },
    {
      name: 'professional',
      displayName: 'Professional',
      description: 'Ideal for growing practices',
      price: new Prisma.Decimal(199.00),
      messagesIncluded: 5000,
      userSeatsIncluded: 10,
      hasBasicAnalytics: true,
      hasAdvancedAnalytics: true,
      hasCampaignSequences: true,
      hasCustomIntegrations: false,
      hasPhoneSupport: false,
      hasDedicatedManager: false,
      sortOrder: 2,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For large practices with complex needs',
      price: new Prisma.Decimal(399.00),
      messagesIncluded: 20000,
      userSeatsIncluded: 50,
      hasBasicAnalytics: true,
      hasAdvancedAnalytics: true,
      hasCampaignSequences: true,
      hasCustomIntegrations: true,
      hasPhoneSupport: true,
      hasDedicatedManager: true,
      sortOrder: 3,
    },
  ];

  for (const planData of pricingPlans) {
    const plan = await prisma.pricingPlan.upsert({
      where: { name: planData.name },
      update: {},
      create: planData,
    });
    console.log(`âœ… Created pricing plan: ${plan.displayName}`);
  }

  console.log('ðŸŽ‰ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('â�Œ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

