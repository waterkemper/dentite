import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { OnboardingProgress } from '../components/OnboardingProgress';
import { 
  CheckCircle, 
  Building2, 
  MessageSquare, 
  Mail, 
  Phone,
  FileText,
  Database,
  CreditCard,
  Users,
  RefreshCw
} from 'lucide-react';

interface OnboardingData {
  planSelected: boolean;
  pmsConfigured: boolean;
  messagingConfigured: boolean;
  templatesCustomized: boolean;
  dataSynced: boolean;
  pmsType?: string;
  pmsCredentials?: any;
  sendGridApiKey?: string;
  twilioCredentials?: any;
  customDomain?: string;
}

export const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    planSelected: false,
    pmsConfigured: false,
    messagingConfigured: false,
    templatesCustomized: false,
    dataSynced: false
  });

  const totalSteps = 6;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      try {
        await api.post('/onboarding/complete');
        navigate('/app/dashboard');
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/app/dashboard');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return <PlanSelectionStep onboardingData={onboardingData} setOnboardingData={setOnboardingData} />;
      case 3:
        return <PMSConfigurationStep />;
      case 4:
        return <MessagingSetupStep />;
      case 5:
        return <TemplateCustomizationStep />;
      case 6:
        return <DataSyncStep />;
      default:
        return <WelcomeStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={currentStep > 1 ? handlePrevious : undefined}
        onNext={handleNext}
        onSkip={handleSkip}
        isLastStep={currentStep === totalSteps}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {renderStep()}
      </div>
    </div>
  );
};

// Step 1: Welcome
const WelcomeStep = () => (
  <div className="text-center">
    <div className="mb-8">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to Dentite! 🦷
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Let's get your practice set up in just a few minutes. We'll guide you through the essential steps to start recovering revenue from expiring insurance benefits.
      </p>
    </div>

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">What we'll set up:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Choose your plan</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Connect your PMS</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Configure messaging</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Customize templates</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Sync patient data</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-success mr-3" />
          <span>Start your first campaign</span>
        </div>
      </div>
    </div>

    <div className="text-sm text-gray-500">
      This should take about 5-10 minutes. You can skip any step and return later.
    </div>
  </div>
);

// Step 2: Plan Selection
const PlanSelectionStep = ({ onboardingData, setOnboardingData }: { onboardingData: OnboardingData; setOnboardingData: (data: OnboardingData) => void }) => (
  <div>
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <CreditCard className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
      <p className="text-xl text-gray-600">Start with a 14-day free trial, then choose the plan that works best for your practice.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Trial</h3>
        <div className="text-3xl font-bold text-primary mb-4">$0<span className="text-lg text-gray-600">/14 days</span></div>
        <ul className="space-y-2 mb-6">
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Full access to all features</span>
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Up to 100 patients</span>
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Email support</span>
          </li>
        </ul>
        <button className="btn btn-secondary w-full">Start Free Trial</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border-2 border-primary p-6 relative">
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">Recommended</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional</h3>
        <div className="text-3xl font-bold text-primary mb-4">$200-300<span className="text-lg text-gray-600">/month</span></div>
        <ul className="space-y-2 mb-6">
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Unlimited patients</span>
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">All messaging features</span>
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Priority support</span>
          </li>
          <li className="flex items-center">
            <CheckCircle className="w-4 h-4 text-success mr-2" />
            <span className="text-sm">Advanced analytics</span>
          </li>
        </ul>
        <button 
          className="btn btn-primary w-full"
          onClick={() => setOnboardingData({...onboardingData, planSelected: true})}
        >
          Select Plan
        </button>
      </div>
    </div>
  </div>
);

// Step 3: PMS Configuration
const PMSConfigurationStep = () => {
  const [pmsType, setPmsType] = useState('');

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Database className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Connect Your Practice Management System</h1>
        <p className="text-xl text-gray-600">Choose your PMS and enter your API credentials to sync patient data.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your PMS</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setPmsType('opendental')}
            className={`p-4 border rounded-lg text-left transition-colors ${
              pmsType === 'opendental' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-gray-900">OpenDental</h4>
            <p className="text-sm text-gray-600 mt-1">Most popular dental PMS</p>
          </button>
          <button
            onClick={() => setPmsType('ortho2edge')}
            className={`p-4 border rounded-lg text-left transition-colors ${
              pmsType === 'ortho2edge' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <h4 className="font-medium text-gray-900">Ortho2Edge</h4>
            <p className="text-sm text-gray-600 mt-1">Orthodontic practice management</p>
          </button>
        </div>

        {pmsType && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">API Credentials</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">API URL</label>
                <input type="text" className="input" placeholder="https://your-pms.com/api" />
              </div>
              <div>
                <label className="label">API Key</label>
                <input type="password" className="input" placeholder="Your API key" />
              </div>
            </div>
            <button className="btn btn-primary">
              Test Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Step 4: Messaging Setup
const MessagingSetupStep = () => (
  <div>
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Configure Messaging</h1>
      <p className="text-xl text-gray-600">Set up email and SMS to send automated reminders to your patients.</p>
    </div>

    <div className="space-y-6">
      {/* Email Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Email Configuration (SendGrid)</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">SendGrid API Key</label>
            <input type="password" className="input" placeholder="SG.xxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <label className="label">From Email</label>
            <input type="email" className="input" placeholder="noreply@yourpractice.com" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="customDomain" className="mr-2" />
            <label htmlFor="customDomain" className="text-sm text-gray-700">Use custom domain for better deliverability</label>
          </div>
          <button className="btn btn-secondary">Test Email</button>
        </div>
      </div>

      {/* SMS Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Phone className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">SMS Configuration (Twilio)</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Account SID</label>
              <input type="text" className="input" placeholder="ACxxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div>
              <label className="label">Auth Token</label>
              <input type="password" className="input" placeholder="Your auth token" />
            </div>
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input type="tel" className="input" placeholder="+1234567890" />
          </div>
          <button className="btn btn-secondary">Test SMS</button>
        </div>
      </div>
    </div>
  </div>
);

// Step 5: Template Customization
const TemplateCustomizationStep = () => (
  <div>
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Customize Message Templates</h1>
      <p className="text-xl text-gray-600">Personalize your patient communications with your practice's voice.</p>
    </div>

    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">60-Day Reminder Template</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Email Subject</label>
            <input type="text" className="input" defaultValue="Your dental benefits expire soon - Book your appointment today!" />
          </div>
          <div>
            <label className="label">Message Content</label>
            <textarea 
              className="input h-32" 
              defaultValue="Hi {patientName}, your dental insurance benefits of ${benefitsAmount} expire on {expirationDate}. Don't let this valuable coverage go to waste! Call us at {practicePhone} to schedule your appointment."
            />
          </div>
          <div className="text-sm text-gray-600">
            <strong>Available variables:</strong> {`{patientName}, {benefitsAmount}, {expirationDate}, {practiceName}, {practicePhone}`}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Template</h3>
        <div className="space-y-4">
          <div>
            <label className="label">SMS Message</label>
            <textarea 
              className="input h-20" 
              defaultValue="Hi {patientName}! You have ${benefitsAmount} in dental benefits expiring {expirationDate}. Call {practicePhone} to schedule your appointment."
            />
          </div>
          <div className="text-sm text-gray-600">
            SMS messages are limited to 160 characters. Current length: 120 characters
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Step 6: Data Sync
const DataSyncStep = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [patientsImported, setPatientsImported] = useState(0);

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(0);
    
    // Simulate sync progress
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          setPatientsImported(150);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sync Your Patient Data</h1>
        <p className="text-xl text-gray-600">Let's import your patients and start tracking their benefits.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {!syncing && syncProgress === 0 && (
          <div className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Sync</h3>
            <p className="text-gray-600 mb-6">This will import your patient data and calculate their remaining benefits.</p>
            <button onClick={handleSync} className="btn btn-primary">
              Start Sync
            </button>
          </div>
        )}

        {syncing && (
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Syncing Patient Data...</h3>
            <p className="text-gray-600 mb-4">This may take a few minutes depending on your practice size.</p>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">{syncProgress}% Complete</p>
          </div>
        )}

        {!syncing && syncProgress === 100 && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sync Complete!</h3>
            <p className="text-gray-600 mb-4">
              Successfully imported {patientsImported} patients and calculated their benefits.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success mr-2" />
                <span className="text-green-800 font-medium">Your practice is ready to start recovering revenue!</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
