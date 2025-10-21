import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { HelpHint } from '../components/HelpHint';
import { PageGuide } from '../components/PageGuide';
import { 
  Users, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  RefreshCw,
  Send
} from 'lucide-react';

interface DashboardMetrics {
  totalPatients: number;
  patientsWithExpiringBenefits: number;
  totalValueAtRisk: number;
  appointmentsThisMonth: number;
  recoveredRevenueMTD: number;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/patients/sync');
      console.log('Sync response:', response.data);
      await fetchMetrics();
      // Show success message
      alert('Patient data synced successfully!');
    } catch (error: any) {
      console.error('Error syncing:', error);
      // Show error message
      alert(`Sync failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const guideItems = [
    {
      id: 'configure-pms',
      title: 'Configure your PMS',
      description: 'Connect your practice management system to start importing patient data.',
      action: {
        text: 'Setup PMS',
        onClick: () => window.location.href = '/app/settings'
      }
    },
    {
      id: 'setup-messaging',
      title: 'Configure messaging services',
      description: 'Set up email and SMS to communicate with your patients.',
      action: {
        text: 'Setup Messaging',
        onClick: () => window.location.href = '/app/settings'
      }
    },
    {
      id: 'sync-data',
      title: 'Sync your patient data',
      description: 'Import your patients and start tracking their benefits.',
      action: {
        text: 'Sync Now',
        onClick: handleSync
      }
    }
  ];

  return (
    <div className="space-y-6">
      <PageGuide 
        title="Getting Started with Dentite"
        items={guideItems}
        showProgress={true}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your practice overview.</p>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync PMS'}
          </button>
          <HelpHint
            title="Sync PMS"
            content="This button syncs your patient data from your practice management system. Run this weekly or after major billing cycles to keep data current."
            learnMoreUrl="/help/sync-pms"
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.totalPatients || 0}
              </p>
            </div>
            <Users className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Benefits</p>
              <p className="text-3xl font-bold text-warning mt-2">
                {metrics?.patientsWithExpiringBenefits || 0}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-warning" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium text-gray-600">Value at Risk</p>
                <HelpHint
                  title="Value at Risk"
                  content="This is the total dollar amount of insurance benefits that will expire soon if patients don't use them. This represents potential lost revenue for your practice."
                  learnMoreUrl="/help/value-at-risk"
                />
              </div>
              <p className="text-3xl font-bold text-danger mt-2">
                ${(metrics?.totalValueAtRisk || 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-danger" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recovered (MTD)</p>
              <p className="text-3xl font-bold text-success mt-2">
                ${(metrics?.recoveredRevenueMTD || 0).toLocaleString()}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-success" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/app/patients?filter=expiring"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-warning mr-3" />
                <span className="font-medium">View Expiring Benefits</span>
              </div>
              <span className="text-sm text-gray-500">
                {metrics?.patientsWithExpiringBenefits} patients
              </span>
            </Link>
            
            <Link
              to="/app/outreach"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <Send className="w-5 h-5 text-primary mr-3" />
                <span className="font-medium">Send Campaign</span>
              </div>
            </Link>
            
            <Link
              to="/app/analytics"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-success mr-3" />
                <span className="font-medium">View Analytics</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-success rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Synced patient data from OpenDental
                </p>
                <p className="text-xs text-gray-500 mt-1">Just now</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Outreach campaign sent to {metrics?.patientsWithExpiringBenefits} patients
                </p>
                <p className="text-xs text-gray-500 mt-1">Today at 9:00 AM</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-warning rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  New patients with expiring benefits identified
                </p>
                <p className="text-xs text-gray-500 mt-1">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

