import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { PMSFactory } from '../services/pms/PMSFactory';

export class PatientController {
  constructor() {}

  /**
   * Get all patients with benefits data
   */
  getPatients = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { search, minBenefits, daysUntilExpiry, page = 1, limit = 50 } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { practiceId, isActive: true };

      const patients = await prisma.patient.findMany({
        where,
        include: {
          insurance: {
            where: { isActive: true },
            include: {
              insurancePlan: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { lastName: 'asc' },
      });

      // Calculate benefits and filter
      const patientsWithBenefits = patients
        .map((patient) => {
          const primaryInsurance = patient.insurance.find((ins) => ins.isPrimary);
          
          // If no insurance, return patient with default values
          if (!primaryInsurance) {
            return {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
              phone: patient.phone,
              lastVisitDate: patient.lastVisitDate,
              nextAppointmentDate: patient.nextAppointmentDate,
              insurance: {
                carrierName: 'No Insurance',
                remainingBenefits: 0,
                expirationDate: '',
                daysUntilExpiry: 999999, // High number so they appear at the bottom
              },
            };
          }

          const remainingBenefits = Number(primaryInsurance.remainingBenefits);
          const daysUntil = this.calculateDaysUntilExpiry(primaryInsurance.expirationDate);

          // Apply filters
          if (minBenefits && remainingBenefits < Number(minBenefits)) return null;
          if (daysUntilExpiry && daysUntil > Number(daysUntilExpiry)) return null;

          return {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email,
            phone: patient.phone,
            lastVisitDate: patient.lastVisitDate,
            nextAppointmentDate: patient.nextAppointmentDate,
            insurance: {
              carrierName: primaryInsurance.insurancePlan.carrierName,
              remainingBenefits,
              expirationDate: primaryInsurance.expirationDate,
              daysUntilExpiry: daysUntil,
            },
          };
        })
        .filter(Boolean);

      const total = await prisma.patient.count({ where });

      res.json({
        patients: patientsWithBenefits,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  };

  /**
   * Create patient manually
   */
  createPatient = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      console.log('Create patient request received:', req.body);
      console.log('User info:', req.user);
      
      const { practiceId } = req.user!;
      const data = req.body;

      // Create patient
      const patient = await prisma.patient.create({
        data: {
          practiceId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          // createdSource will be available after prisma generate/migrate; set via any to avoid type error until then
          ...( { createdSource: 'manual' } as any ),
        },
      });

      // Create insurance plan and patient insurance if insurance data is provided
      if (data.carrierName) {
        // First, create or find insurance plan
        let insurancePlan = await prisma.insurancePlan.findFirst({
          where: {
            practiceId,
            carrierName: data.carrierName,
          },
        });

        if (!insurancePlan) {
          insurancePlan = await prisma.insurancePlan.create({
            data: {
              practiceId,
              carrierName: data.carrierName,
              annualMaximum: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
              deductible: data.deductible ? parseFloat(data.deductible) : 50.00,
            },
          });
        }

        // Create patient insurance record
        await prisma.patientInsurance.create({
          data: {
            patientId: patient.id,
            insurancePlanId: insurancePlan.id,
            policyNumber: data.policyNumber || null,
            subscriberName: `${data.firstName} ${data.lastName}`,
            subscriberRelation: 'self',
            expirationDate: data.expirationDate ? new Date(data.expirationDate) : new Date(new Date().getFullYear(), 11, 31), // Default to end of current year
            annualMaximum: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
            deductible: data.deductible ? parseFloat(data.deductible) : 50.00,
            deductibleMet: 0.00,
            usedBenefits: 0.00,
            remainingBenefits: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
            isPrimary: true,
            isActive: true,
          },
        });
      }

      console.log('Patient created successfully:', patient);
      res.status(201).json(patient);
    } catch (error) {
      console.error('Create patient error:', error);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  };

  /**
   * Update patient manually
   */
  updatePatient = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;
      const data = req.body;

      // Update patient basic info
      const patient = await prisma.patient.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          practiceId,
        },
      });

      // Handle insurance updates if provided
      if (data.carrierName) {
        // Find or create insurance plan
        let insurancePlan = await prisma.insurancePlan.findFirst({
          where: {
            practiceId,
            carrierName: data.carrierName,
          },
        });

        if (!insurancePlan) {
          insurancePlan = await prisma.insurancePlan.create({
            data: {
              practiceId,
              carrierName: data.carrierName,
              annualMaximum: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
              deductible: data.deductible ? parseFloat(data.deductible) : 50.00,
            },
          });
        }

        // Check if patient already has primary insurance
        const existingInsurance = await prisma.patientInsurance.findFirst({
          where: {
            patientId: id,
            isPrimary: true,
          },
        });

        if (existingInsurance) {
          // Update existing insurance
          await prisma.patientInsurance.update({
            where: { id: existingInsurance.id },
            data: {
              insurancePlanId: insurancePlan.id,
              policyNumber: data.policyNumber || null,
              subscriberName: `${data.firstName} ${data.lastName}`,
              expirationDate: data.expirationDate ? new Date(data.expirationDate) : new Date(new Date().getFullYear(), 11, 31),
              annualMaximum: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
              deductible: data.deductible ? parseFloat(data.deductible) : 50.00,
              remainingBenefits: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
            },
          });
        } else {
          // Create new insurance record
          await prisma.patientInsurance.create({
            data: {
              patientId: id,
              insurancePlanId: insurancePlan.id,
              policyNumber: data.policyNumber || null,
              subscriberName: `${data.firstName} ${data.lastName}`,
              subscriberRelation: 'self',
              expirationDate: data.expirationDate ? new Date(data.expirationDate) : new Date(new Date().getFullYear(), 11, 31),
              annualMaximum: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
              deductible: data.deductible ? parseFloat(data.deductible) : 50.00,
              deductibleMet: 0.00,
              usedBenefits: 0.00,
              remainingBenefits: data.annualMaximum ? parseFloat(data.annualMaximum) : 1500.00,
              isPrimary: true,
              isActive: true,
            },
          });
        }
      }

      res.json(patient);
    } catch (error) {
      console.error('Update patient error:', error);
      res.status(500).json({ error: 'Failed to update patient' });
    }
  };

  /**
   * Get patient by ID with full details
   */
  getPatientById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { practiceId } = req.user!;

      const patient = await prisma.patient.findFirst({
        where: { id, practiceId },
        include: {
          insurance: {
            include: {
              insurancePlan: true,
            },
          },
          // expose createdSource to frontend for manual/API badge
          benefitsSnapshots: {
            orderBy: { snapshotDate: 'desc' },
            take: 12, // Last 12 snapshots
          },
          outreachLogs: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              campaign: true,
            },
          },
          appointments: {
            orderBy: { appointmentDate: 'desc' },
            take: 10,
          },
        },
      });

      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.json(patient);
    } catch (error) {
      console.error('Get patient error:', error);
      res.status(500).json({ error: 'Failed to fetch patient' });
    }
  };

  /**
   * Sync patients from configured PMS (OpenDental or Ortho2Edge)
   */
  syncFromPMS = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;

      const practice = await prisma.practice.findUnique({
        where: { id: practiceId },
      });

      if (!practice) {
        res.status(404).json({ error: 'Practice not found' });
        return;
      }

      const adapter = PMSFactory.create(practice);
      const result = await adapter.syncPatients(practiceId);

      res.json({
        message: 'Sync completed successfully',
        ...result,
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  };

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expirationDate: Date): number {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

