import { IPMSAdapter } from './IPMSAdapter';
import { OpenDentalAdapter } from './adapters/OpenDentalAdapter';
import { Ortho2EdgeAdapter } from './adapters/Ortho2EdgeAdapter';

export class PMSFactory {
  static create(practice: any): IPMSAdapter {
    const type = (practice.pmsType || (practice.openDentalApiKey ? 'opendental' : undefined)) as
      | 'opendental'
      | 'ortho2edge'
      | undefined;

    switch (type) {
      case 'ortho2edge': {
        const adapter = new Ortho2EdgeAdapter();
        adapter.initialize(practice);
        return adapter;
      }
      case 'opendental':
      default: {
        const adapter = new OpenDentalAdapter();
        adapter.initialize(practice);
        return adapter;
      }
    }
  }
}


