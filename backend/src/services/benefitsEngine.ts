import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface PatientBenefits {
  patientId: string;
  patientName: string;
  email: string;
  phone: string;
  insuranceCarrier: string;
  annualMaximum: number;
  deductible: number;
  deductibleMet: number;
  usedBenefits: number;
  remainingBenefits: number;
  expirationDate: Date;
  daysUntilExpiry: number;
  suggestedTreatments: string[];
}

export class BenefitsEngine {
  /**
   * Get patients with expiring benefits
   */
  async getExpiringBenefits(
    practiceId: string,
    daysUntilExpiry: number = 60,
    minAmount: number = 200
  ): Promise<PatientBenefits[]> {
    try {
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

      const patientInsurances = await prisma.patientInsurance.findMany({
        where: {
          patient: {
            practiceId,
            isActive: true,
          },
          isActive: true,
          isPrimary: true,
          expirationDate: {
            gte: now,
            lte: expiryDate,
          },
          remainingBenefits: {
            gte: new Prisma.Decimal(minAmount),
          },
        },
        include: {
          patient: true,
          insurancePlan: true,
        },
        orderBy: {
          expirationDate: 'asc',
        },
      });

      return patientInsurances.map((ins) => ({
        patientId: ins.patient.id,
        patientName: `${ins.patient.firstName} ${ins.patient.lastName}`,
        email: ins.patient.email || '',
        phone: ins.patient.phone || '',
        insuranceCarrier: ins.insurancePlan.carrierName,
        annualMaximum: Number(ins.annualMaximum),
        deductible: Number(ins.deductible),
        deductibleMet: Number(ins.deductibleMet),
        usedBenefits: Number(ins.usedBenefits),
        remainingBenefits: Number(ins.remainingBenefits),
        expirationDate: ins.expirationDate,
        daysUntilExpiry: this.calculateDaysUntilExpiry(ins.expirationDate),
        suggestedTreatments: this.suggestTreatments(Number(ins.remainingBenefits)),
      }));
    } catch (error) {
      console.error('Get expiring benefits error:', error);
      throw error;
    }
  }

  /**
   * Calculate benefits for a specific patient
   */
  async calculatePatientBenefits(
    patientId: string,
    practiceId: string
  ): Promise<PatientBenefits | null> {
    try {
      const patientInsurance = await prisma.patientInsurance.findFirst({
        where: {
          patientId,
          patient: { practiceId },
          isActive: true,
          isPrimary: true,
        },
        include: {
          patient: true,
          insurancePlan: true,
        },
      });

      if (!patientInsurance) {
        return null;
      }

      // Recalculate remaining benefits
      const remainingBenefits =
        Number(patientInsurance.annualMaximum) - Number(patientInsurance.usedBenefits);

      // Update if changed
      if (Math.abs(remainingBenefits - Number(patientInsurance.remainingBenefits)) > 0.01) {
        await prisma.patientInsurance.update({
          where: { id: patientInsurance.id },
          data: {
            remainingBenefits: new Prisma.Decimal(Math.max(0, remainingBenefits)),
          },
        });
      }

      // Create benefits snapshot
      await this.createBenefitsSnapshot(patientId, patientInsurance);

      return {
        patientId: patientInsurance.patient.id,
        patientName: `${patientInsurance.patient.firstName} ${patientInsurance.patient.lastName}`,
        email: patientInsurance.patient.email || '',
        phone: patientInsurance.patient.phone || '',
        insuranceCarrier: patientInsurance.insurancePlan.carrierName,
        annualMaximum: Number(patientInsurance.annualMaximum),
        deductible: Number(patientInsurance.deductible),
        deductibleMet: Number(patientInsurance.deductibleMet),
        usedBenefits: Number(patientInsurance.usedBenefits),
        remainingBenefits: Math.max(0, remainingBenefits),
        expirationDate: patientInsurance.expirationDate,
        daysUntilExpiry: this.calculateDaysUntilExpiry(patientInsurance.expirationDate),
        suggestedTreatments: this.suggestTreatments(Math.max(0, remainingBenefits)),
      };
    } catch (error) {
      console.error('Calculate patient benefits error:', error);
      throw error;
    }
  }

  /**
   * Create benefits snapshot for historical tracking
   */
  private async createBenefitsSnapshot(
    patientId: string,
    insurance: any
  ): Promise<void> {
    try {
      const remainingBenefits =
        Number(insurance.annualMaximum) - Number(insurance.usedBenefits);

      await prisma.benefitsSnapshot.create({
        data: {
          patientId,
          annualMaximum: insurance.annualMaximum,
          deductible: insurance.deductible,
          deductibleMet: insurance.deductibleMet,
          usedBenefits: insurance.usedBenefits,
          remainingBenefits: new Prisma.Decimal(Math.max(0, remainingBenefits)),
          daysUntilExpiry: this.calculateDaysUntilExpiry(insurance.expirationDate),
        },
      });
    } catch (error) {
      console.error('Create snapshot error:', error);
    }
  }

  /**
   * Calculate days until benefits expire
   */
  private calculateDaysUntilExpiry(expirationDate: Date): number {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Suggest treatments based on remaining benefits
   */
  private suggestTreatments(remainingBenefits: number): string[] {
    const suggestions: string[] = [];

    if (remainingBenefits >= 100 && remainingBenefits < 300) {
      suggestions.push('Routine cleaning and exam');
      suggestions.push('X-rays');
    } else if (remainingBenefits >= 300 && remainingBenefits < 600) {
      suggestions.push('Deep cleaning');
      suggestions.push('Fluoride treatment');
      suggestions.push('Multiple fillings');
    } else if (remainingBenefits >= 600 && remainingBenefits < 1000) {
      suggestions.push('Crown or bridge work');
      suggestions.push('Root canal therapy');
      suggestions.push('Periodontal treatment');
    } else if (remainingBenefits >= 1000) {
      suggestions.push('Multiple crowns');
      suggestions.push('Dental implant consultation');
      suggestions.push('Comprehensive restorative work');
      suggestions.push('Orthodontic evaluation');
    }

    return suggestions;
  }

  /**
   * Batch update all patient benefits
   */
  async batchUpdateBenefits(practiceId: string): Promise<{ updated: number }> {
    try {
      const patients = await prisma.patient.findMany({
        where: { practiceId, isActive: true },
      });

      let updated = 0;

      for (const patient of patients) {
        try {
          await this.calculatePatientBenefits(patient.id, practiceId);
          updated++;
        } catch (error) {
          console.error(`Error updating benefits for patient ${patient.id}:`, error);
        }
      }

      return { updated };
    } catch (error) {
      console.error('Batch update error:', error);
      throw error;
    }
  }
}

