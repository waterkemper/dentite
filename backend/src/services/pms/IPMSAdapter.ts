import { Prisma } from '@prisma/client';

export type SyncSummary = {
  synced: number;
  errors: number;
};

export interface IPMSAdapter {
  initialize(practice: {
    id: string;
    pmsUrl?: string | null;
    pmsApiKey?: string | null;
    openDentalUrl?: string | null;
    openDentalApiKey?: string | null;
    pmsType?: string | null;
  }): void;

  syncPatients(practiceId: string): Promise<SyncSummary>;
  syncInsurance(patientId: string, externalPatientId?: string): Promise<void>;
  syncClaims(patientId: string, externalPatientId?: string): Promise<void>;
  syncAppointments?(patientId: string, externalPatientId?: string): Promise<void>;

  // Orthodontic specific, optional for non-ortho PMS
  syncPaymentPlans?(patientId: string, externalPatientId?: string): Promise<void>;
  syncTreatmentPhases?(patientId: string, externalPatientId?: string): Promise<void>;
}


