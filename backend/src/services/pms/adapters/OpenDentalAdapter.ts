import { IPMSAdapter, SyncSummary } from '../IPMSAdapter';
import { OpenDentalService } from '../../openDentalClient';

export class OpenDentalAdapter implements IPMSAdapter {
  private service: OpenDentalService;
  private practice: any | null = null;

  constructor() {
    this.service = new OpenDentalService();
  }

  initialize(practice: any): void {
    this.practice = practice;
  }

  async syncPatients(practiceId: string): Promise<SyncSummary> {
    if (!this.practice) throw new Error('Adapter not initialized');
    return await this.service.syncPatients(this.practice);
  }

  async syncInsurance(patientId: string): Promise<void> {
    // Handled inside syncPatients per current OpenDentalService implementation
    return;
  }

  async syncClaims(patientId: string): Promise<void> {
    // Handled inside syncPatients currently
    return;
  }
}


