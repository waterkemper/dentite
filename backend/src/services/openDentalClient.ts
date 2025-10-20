import axios, { AxiosInstance } from 'axios';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface OpenDentalPatient {
  PatNum: number;
  LName: string;
  FName: string;
  Email: string;
  WirelessPhone: string;
  Birthdate: string;
  Address: string;
  City: string;
  State: string;
  Zip: string;
}

interface OpenDentalInsurance {
  PlanNum: number;
  PatNum: number;
  CarrierName: string;
  GroupName: string;
  GroupNum: string;
  SubscriberID: string;
  BenefitYear: number;
  AnnualMax: number;
  Deductible: number;
}

interface OpenDentalClaim {
  PatNum: number;
  ClaimNum: number;
  DateService: string;
  ClaimFee: number;
  InsPayAmt: number;
  Status: string;
}

export class OpenDentalService {
  private client: AxiosInstance | null = null;

  /**
   * Initialize OpenDental API client
   */
  private initializeClient(apiUrl: string, apiKey: string): void {
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Sync all patients from OpenDental
   */
  async syncPatients(practice: any): Promise<{ synced: number; errors: number }> {
    try {
      if (!practice.openDentalApiKey || !practice.openDentalUrl) {
        throw new Error('OpenDental API credentials not configured');
      }

      this.initializeClient(practice.openDentalUrl, practice.openDentalApiKey);

      // Fetch patients from OpenDental
      const patients = await this.fetchPatients();
      
      let synced = 0;
      let errors = 0;

      for (const odPatient of patients) {
        try {
          await this.syncPatient(practice.id, odPatient);
          synced++;
        } catch (error) {
          console.error(`Error syncing patient ${odPatient.PatNum}:`, error);
          errors++;
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error('Sync patients error:', error);
      throw error;
    }
  }

  /**
   * Fetch patients from OpenDental API
   */
  private async fetchPatients(): Promise<OpenDentalPatient[]> {
    try {
      // Note: This is a mock implementation
      // Real OpenDental API endpoints would be different
      const response = await this.client!.get('/patients');
      return response.data;
    } catch (error) {
      console.error('Fetch patients error:', error);
      // Return mock data for development
      return this.getMockPatients();
    }
  }

  /**
   * Sync single patient
   */
  private async syncPatient(practiceId: string, odPatient: OpenDentalPatient): Promise<void> {
    // Upsert patient
    const patient = await prisma.patient.upsert({
      where: {
        practiceId_openDentalId: {
          practiceId,
          openDentalId: String(odPatient.PatNum),
        },
      },
      update: {
        firstName: odPatient.FName,
        lastName: odPatient.LName,
        email: odPatient.Email,
        phone: odPatient.WirelessPhone,
        dateOfBirth: odPatient.Birthdate ? new Date(odPatient.Birthdate) : null,
        address: odPatient.Address,
        city: odPatient.City,
        state: odPatient.State,
        zipCode: odPatient.Zip,
        updatedAt: new Date(),
      },
      create: {
        practiceId,
        openDentalId: String(odPatient.PatNum),
        firstName: odPatient.FName,
        lastName: odPatient.LName,
        email: odPatient.Email,
        phone: odPatient.WirelessPhone,
        dateOfBirth: odPatient.Birthdate ? new Date(odPatient.Birthdate) : null,
        address: odPatient.Address,
        city: odPatient.City,
        state: odPatient.State,
        zipCode: odPatient.Zip,
      },
    });

    // Sync insurance information
    await this.syncPatientInsurance(practiceId, patient.id, odPatient.PatNum);

    // Sync claims to calculate used benefits
    await this.syncPatientClaims(patient.id, odPatient.PatNum);
  }

  /**
   * Sync patient insurance
   */
  private async syncPatientInsurance(
    practiceId: string,
    patientId: string,
    odPatNum: number
  ): Promise<void> {
    try {
      const insuranceData = await this.fetchPatientInsurance(odPatNum);

      for (const ins of insuranceData) {
        // Upsert insurance plan
        const insurancePlan = await prisma.insurancePlan.upsert({
          where: {
            id: `od_${ins.PlanNum}`,
          },
          update: {
            carrierName: ins.CarrierName,
            planName: ins.GroupName,
            groupNumber: ins.GroupNum,
            annualMaximum: new Prisma.Decimal(ins.AnnualMax),
            deductible: new Prisma.Decimal(ins.Deductible),
          },
          create: {
            id: `od_${ins.PlanNum}`,
            practiceId,
            carrierName: ins.CarrierName,
            planName: ins.GroupName,
            groupNumber: ins.GroupNum,
            annualMaximum: new Prisma.Decimal(ins.AnnualMax),
            deductible: new Prisma.Decimal(ins.Deductible),
          },
        });

        // Calculate expiration date (typically Dec 31 of current year)
        const currentYear = new Date().getFullYear();
        const expirationDate = new Date(currentYear, 11, 31); // Dec 31

        // Upsert patient insurance
        await prisma.patientInsurance.upsert({
          where: {
            id: `${patientId}_${insurancePlan.id}`,
          },
          update: {
            policyNumber: ins.SubscriberID,
            annualMaximum: new Prisma.Decimal(ins.AnnualMax),
            deductible: new Prisma.Decimal(ins.Deductible),
            lastSyncedAt: new Date(),
          },
          create: {
            id: `${patientId}_${insurancePlan.id}`,
            patientId,
            insurancePlanId: insurancePlan.id,
            policyNumber: ins.SubscriberID,
            expirationDate,
            annualMaximum: new Prisma.Decimal(ins.AnnualMax),
            deductible: new Prisma.Decimal(ins.Deductible),
            deductibleMet: new Prisma.Decimal(0),
            usedBenefits: new Prisma.Decimal(0),
            remainingBenefits: new Prisma.Decimal(ins.AnnualMax),
            isPrimary: true,
          },
        });
      }
    } catch (error) {
      console.error('Sync insurance error:', error);
    }
  }

  /**
   * Sync patient claims to calculate used benefits
   */
  private async syncPatientClaims(patientId: string, odPatNum: number): Promise<void> {
    try {
      const claims = await this.fetchPatientClaims(odPatNum);

      // Calculate total used benefits for current year
      const currentYear = new Date().getFullYear();
      const usedBenefits = claims
        .filter((c) => new Date(c.DateService).getFullYear() === currentYear)
        .reduce((sum, c) => sum + c.InsPayAmt, 0);

      // Update patient insurance with used benefits
      const patientInsurance = await prisma.patientInsurance.findFirst({
        where: { patientId, isActive: true, isPrimary: true },
      });

      if (patientInsurance) {
        const remainingBenefits = Number(patientInsurance.annualMaximum) - usedBenefits;

        await prisma.patientInsurance.update({
          where: { id: patientInsurance.id },
          data: {
            usedBenefits: new Prisma.Decimal(usedBenefits),
            remainingBenefits: new Prisma.Decimal(Math.max(0, remainingBenefits)),
          },
        });
      }
    } catch (error) {
      console.error('Sync claims error:', error);
    }
  }

  /**
   * Fetch patient insurance from OpenDental
   */
  private async fetchPatientInsurance(patNum: number): Promise<OpenDentalInsurance[]> {
    try {
      const response = await this.client!.get(`/patients/${patNum}/insurance`);
      return response.data;
    } catch (error) {
      // Return mock data
      return this.getMockInsurance(patNum);
    }
  }

  /**
   * Fetch patient claims from OpenDental
   */
  private async fetchPatientClaims(patNum: number): Promise<OpenDentalClaim[]> {
    try {
      const response = await this.client!.get(`/patients/${patNum}/claims`);
      return response.data;
    } catch (error) {
      // Return mock data
      return this.getMockClaims(patNum);
    }
  }

  /**
   * Mock data for development
   */
  private getMockPatients(): OpenDentalPatient[] {
    return [
      {
        PatNum: 1001,
        FName: 'John',
        LName: 'Smith',
        Email: 'john.smith@email.com',
        WirelessPhone: '555-0101',
        Birthdate: '1985-03-15',
        Address: '123 Main St',
        City: 'Springfield',
        State: 'IL',
        Zip: '62701',
      },
      {
        PatNum: 1002,
        FName: 'Sarah',
        LName: 'Johnson',
        Email: 'sarah.j@email.com',
        WirelessPhone: '555-0102',
        Birthdate: '1990-07-22',
        Address: '456 Oak Ave',
        City: 'Springfield',
        State: 'IL',
        Zip: '62702',
      },
      {
        PatNum: 1003,
        FName: 'Michael',
        LName: 'Williams',
        Email: 'mwilliams@email.com',
        WirelessPhone: '555-0103',
        Birthdate: '1978-11-30',
        Address: '789 Pine Rd',
        City: 'Springfield',
        State: 'IL',
        Zip: '62703',
      },
    ];
  }

  private getMockInsurance(patNum: number): OpenDentalInsurance[] {
    return [
      {
        PlanNum: 5001 + patNum,
        PatNum: patNum,
        CarrierName: 'Delta Dental',
        GroupName: 'Standard PPO',
        GroupNum: 'GRP-12345',
        SubscriberID: `SUB-${patNum}`,
        BenefitYear: new Date().getFullYear(),
        AnnualMax: 1500,
        Deductible: 50,
      },
    ];
  }

  private getMockClaims(patNum: number): OpenDentalClaim[] {
    return [
      {
        PatNum: patNum,
        ClaimNum: 8001 + patNum,
        DateService: new Date(new Date().getFullYear(), 2, 15).toISOString(),
        ClaimFee: 250,
        InsPayAmt: 200,
        Status: 'Received',
      },
      {
        PatNum: patNum,
        ClaimNum: 8002 + patNum,
        DateService: new Date(new Date().getFullYear(), 6, 20).toISOString(),
        ClaimFee: 450,
        InsPayAmt: 400,
        Status: 'Received',
      },
    ];
  }
}

