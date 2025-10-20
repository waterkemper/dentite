import axios, { AxiosInstance } from 'axios';
import { IPMSAdapter, SyncSummary } from '../IPMSAdapter';
import { prisma } from '../../../lib/prisma';

export class Ortho2EdgeAdapter implements IPMSAdapter {
  private client: AxiosInstance | null = null;
  private practice: any | null = null;

  initialize(practice: any): void {
    this.practice = practice;
    const baseURL = practice.pmsUrl || process.env.ORTHO2EDGE_APIM_BASE_URL;
    const subscriptionKey = practice.pmsApiKey || process.env.ORTHO2EDGE_SUBSCRIPTION_KEY;

    if (!baseURL || !subscriptionKey) {
      throw new Error('Ortho2Edge APIM not configured');
    }

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async syncPatients(practiceId: string): Promise<SyncSummary> {
    if (!this.client) throw new Error('Adapter not initialized');

    // Many Integrator resources are grouped under catalogs; require identifier in pmsConfig
    const catalogIdentifier: string | undefined = this.practice?.pmsConfig?.catalogIdentifier;
    if (!catalogIdentifier) {
      // No catalog configured: nothing to sync yet
      return { synced: 0, errors: 0 };
    }

    // Strategy: pull contract-groups (payment plans) to infer patients we care about
    let synced = 0;
    let errors = 0;
    try {
      const resp = await this.client.get(`/catalogs/${catalogIdentifier}/contract-groups`, {
        params: { 'api-version': '1.0', first: 50 },
        headers: { Accept: 'application/json' },
      });

      const items: any[] = Array.isArray(resp.data) ? resp.data : [];
      for (const item of items) {
        const externalPatientId = String(item.patient_id);
        try {
          await prisma.patient.upsert({
            where: {
              practiceId_openDentalId: { practiceId, openDentalId: externalPatientId },
            },
            update: {
              // Names not available from contract group; keep existing
              updatedAt: new Date(),
            },
            create: {
              practiceId,
              openDentalId: externalPatientId,
              firstName: 'Unknown',
              lastName: 'Patient',
            },
          });
          synced++;
        } catch (e) {
          errors++;
        }
      }
    } catch (e) {
      // If contract-groups aren’t accessible, skip silently for now
    }

    return { synced, errors };
  }

  async syncInsurance(patientId: string): Promise<void> {
    // Map from Ortho2Edge coverage/plan endpoints once finalized
    return;
  }

  async syncClaims(patientId: string): Promise<void> {
    // Map ledger/claims to used benefits
    return;
  }

  async syncPaymentPlans?(patientId: string): Promise<void> {
    if (!this.client) return;
    const catalogIdentifier: string | undefined = this.practice?.pmsConfig?.catalogIdentifier;
    if (!catalogIdentifier) return;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient?.openDentalId) return;

    const resp = await this.client.get(`/catalogs/${catalogIdentifier}/contract-groups`, {
      params: { 'api-version': '1.0', first: 50 },
      headers: { Accept: 'application/json' },
    });
    const items: any[] = Array.isArray(resp.data) ? resp.data : [];
    for (const cg of items.filter(i => String(i.patient_id) === patient.openDentalId)) {
      try {
        await (prisma as any).paymentPlan.upsert({
        where: { id: String(cg.id) },
        update: {
          totalAmount: cg.amount ?? 0,
          downPayment: cg.down_payment_amount ?? 0,
          monthlyPayment: cg.period_fee_amount ?? 0,
          status: 'active',
          updatedAt: new Date(),
        },
        create: {
          id: String(cg.id),
          patientId: patientId,
          totalAmount: cg.amount ?? 0,
          downPayment: cg.down_payment_amount ?? 0,
          monthlyPayment: cg.period_fee_amount ?? 0,
          startDate: new Date(cg.created ?? new Date().toISOString()),
          numberOfPayments: 0,
          remainingPayments: 0,
          status: 'active',
          pmsId: String(cg.id),
        },
        });
      } catch (e) {
        // Swallow errors until migrations are applied and schema exists
      }
    }
  }

  async syncTreatmentPhases?(patientId: string): Promise<void> {
    return;
  }
}


