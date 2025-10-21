import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface PracticeMessagingSettings {
  id: string;
  name: string;
  email: string;
  // Email settings
  emailProvider: string;
  sendgridFromEmail: string | null;
  sendgridFromName: string | null;
  emailDomainVerified: boolean;
  emailVerificationStatus: string | null;
  emailDnsRecords: any;
  emailFallbackEnabled: boolean;
  emailLastTestedAt: string | null;
  hasCustomSendGrid: boolean;
  // SMS settings
  smsProvider: string;
  twilioPhoneNumber: string | null;
  smsVerificationStatus: string | null;
  smsFallbackEnabled: boolean;
  smsLastTestedAt: string | null;
  hasCustomTwilio: boolean;
}

const PracticeSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [settings, setSettings] = useState<PracticeMessagingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email form state
  const [emailProvider, setEmailProvider] = useState('system');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [sendgridFromEmail, setSendgridFromEmail] = useState('');
  const [sendgridFromName, setSendgridFromName] = useState('');
  const [emailFallbackEnabled, setEmailFallbackEnabled] = useState(true);

  // SMS form state
  const [smsProvider, setSmsProvider] = useState('system');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [smsFallbackEnabled, setSmsFallbackEnabled] = useState(true);

  // DNS verification state
  const [showDnsWizard, setShowDnsWizard] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/practices/${user?.practiceId}/messaging-settings`);
      const data = response.data;
      setSettings(data);

      // Populate form fields
      setEmailProvider(data.emailProvider || 'system');
      setSendgridFromEmail(data.sendgridFromEmail || '');
      setSendgridFromName(data.sendgridFromName || '');
      setEmailFallbackEnabled(data.emailFallbackEnabled ?? true);

      setSmsProvider(data.smsProvider || 'system');
      setTwilioPhoneNumber(data.twilioPhoneNumber || '');
      setSmsFallbackEnabled(data.smsFallbackEnabled ?? true);
    } catch (error: any) {
      showMessage('error', 'Failed to load settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailConfig = async () => {
    try {
      setSaving(true);
      const payload: any = {
        emailProvider,
        sendgridFromEmail: emailProvider === 'custom_sendgrid' ? sendgridFromEmail : undefined,
        sendgridFromName: emailProvider === 'custom_sendgrid' ? sendgridFromName : undefined,
        emailFallbackEnabled,
      };

      // Only include API key if it's been entered
      if (sendgridApiKey) {
        payload.sendgridApiKey = sendgridApiKey;
      }

      await api.put(`/practices/${user?.practiceId}/email-config`, payload);
      showMessage('success', 'Email configuration saved successfully');
      setSendgridApiKey(''); // Clear API key field after saving
      loadSettings();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const saveSmsConfig = async () => {
    try {
      setSaving(true);
      const payload: any = {
        smsProvider,
        twilioPhoneNumber: smsProvider === 'custom_twilio' ? twilioPhoneNumber : undefined,
        smsFallbackEnabled,
      };

      // Only include credentials if they've been entered
      if (twilioAccountSid) {
        payload.twilioAccountSid = twilioAccountSid;
      }
      if (twilioAuthToken) {
        payload.twilioAuthToken = twilioAuthToken;
      }

      await api.put(`/practices/${user?.practiceId}/sms-config`, payload);
      showMessage('success', 'SMS configuration saved successfully');
      setTwilioAccountSid(''); // Clear credentials after saving
      setTwilioAuthToken('');
      loadSettings();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Failed to save SMS configuration');
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    const email = prompt('Enter email address to send test message:');
    if (!email) return;

    try {
      setSaving(true);
      const response = await api.post(`/practices/${user?.practiceId}/email-config/test`, {
        recipientEmail: email,
      });
      showMessage('success', response.data.message);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Test email failed');
    } finally {
      setSaving(false);
    }
  };

  const testSms = async () => {
    const phone = prompt('Enter phone number (E.164 format, e.g., +1234567890):');
    if (!phone) return;

    try {
      setSaving(true);
      const response = await api.post(`/practices/${user?.practiceId}/sms-config/test`, {
        recipientPhone: phone,
      });
      showMessage('success', response.data.message);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Test SMS failed');
    } finally {
      setSaving(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      setVerifying(true);
      const response = await api.get(`/practices/${user?.practiceId}/email-config/verify-status`);
      const status = response.data;

      if (status.verified) {
        showMessage('success', 'Domain verified successfully!');
        loadSettings();
      } else {
        showMessage('error', status.message);
      }
    } catch (error: any) {
      showMessage('error', 'Failed to check verification status');
    } finally {
      setVerifying(false);
    }
  };

  const deleteEmailConfig = async () => {
    if (!confirm('Are you sure you want to delete your custom email configuration?')) return;

    try {
      setSaving(true);
      await api.delete(`/practices/${user?.practiceId}/email-config`);
      showMessage('success', 'Email configuration deleted successfully');
      setSendgridApiKey('');
      setSendgridFromEmail('');
      setSendgridFromName('');
      setEmailProvider('system');
      loadSettings();
    } catch (error: any) {
      showMessage('error', 'Failed to delete email configuration');
    } finally {
      setSaving(false);
    }
  };

  const deleteSmsConfig = async () => {
    if (!confirm('Are you sure you want to delete your custom SMS configuration?')) return;

    try {
      setSaving(true);
      await api.delete(`/practices/${user?.practiceId}/sms-config`);
      showMessage('success', 'SMS configuration deleted successfully');
      setTwilioAccountSid('');
      setTwilioAuthToken('');
      setTwilioPhoneNumber('');
      setSmsProvider('system');
      loadSettings();
    } catch (error: any) {
      showMessage('error', 'Failed to delete SMS configuration');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Messaging Settings</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('email')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email Configuration
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SMS Configuration
          </button>
        </nav>
      </div>

      {/* Email Configuration Tab */}
      {activeTab === 'email' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Provider</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="system"
                  checked={emailProvider === 'system'}
                  onChange={(e) => setEmailProvider(e.target.value)}
                  className="mr-2"
                />
                <span>Use System Email (Default)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom_sendgrid"
                  checked={emailProvider === 'custom_sendgrid'}
                  onChange={(e) => setEmailProvider(e.target.value)}
                  className="mr-2"
                />
                <span>Use Custom Domain (SendGrid)</span>
              </label>
            </div>
          </div>

          {/* Custom SendGrid Configuration */}
          {emailProvider === 'custom_sendgrid' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SendGrid API Key {!settings?.hasCustomSendGrid && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={sendgridApiKey}
                  onChange={(e) => setSendgridApiKey(e.target.value)}
                  placeholder={settings?.hasCustomSendGrid ? '••••••••••••••••' : 'Enter SendGrid API key'}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings?.hasCustomSendGrid
                    ? 'Leave blank to keep existing key'
                    : 'Required: Get your API key from SendGrid dashboard'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={sendgridFromEmail}
                  onChange={(e) => setSendgridFromEmail(e.target.value)}
                  placeholder="noreply@yourclinic.com"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <input
                  type="text"
                  value={sendgridFromName}
                  onChange={(e) => setSendgridFromName(e.target.value)}
                  placeholder="Your Clinic Name"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              {/* Domain Verification Status */}
              {settings?.hasCustomSendGrid && (
                <div className="bg-gray-50 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Domain Verification Status</p>
                      <p className="text-sm text-gray-600">
                        {settings.emailDomainVerified ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600">⚠ Not Verified</span>
                        )}
                      </p>
                    </div>
                    {!settings.emailDomainVerified && (
                      <div className="space-x-2">
                        <button
                          onClick={() => setShowDnsWizard(true)}
                          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                          Setup DNS
                        </button>
                        <button
                          onClick={checkVerificationStatus}
                          disabled={verifying}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                        >
                          {verifying ? 'Checking...' : 'Check Status'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailFallback"
                  checked={emailFallbackEnabled}
                  onChange={(e) => setEmailFallbackEnabled(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="emailFallback" className="text-sm text-gray-700">
                  Enable fallback to system email if custom configuration fails
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={saveEmailConfig}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            {settings?.hasCustomSendGrid && (
              <>
                <button
                  onClick={testEmail}
                  disabled={saving}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Send Test Email
                </button>
                <button
                  onClick={deleteEmailConfig}
                  disabled={saving}
                  className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Delete Configuration
                </button>
              </>
            )}
          </div>

          {settings?.emailLastTestedAt && (
            <p className="text-xs text-gray-500 mt-4">
              Last tested: {new Date(settings.emailLastTestedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* SMS Configuration Tab */}
      {activeTab === 'sms' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">SMS Configuration</h2>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">SMS Provider</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="system"
                  checked={smsProvider === 'system'}
                  onChange={(e) => setSmsProvider(e.target.value)}
                  className="mr-2"
                />
                <span>Use System SMS (Default)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom_twilio"
                  checked={smsProvider === 'custom_twilio'}
                  onChange={(e) => setSmsProvider(e.target.value)}
                  className="mr-2"
                />
                <span>Use Custom Twilio Account</span>
              </label>
            </div>
          </div>

          {/* Custom Twilio Configuration */}
          {smsProvider === 'custom_twilio' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio Account SID {!settings?.hasCustomTwilio && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={twilioAccountSid}
                  onChange={(e) => setTwilioAccountSid(e.target.value)}
                  placeholder={settings?.hasCustomTwilio ? '••••••••••••••••' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings?.hasCustomTwilio ? 'Leave blank to keep existing' : 'Found in Twilio console'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Twilio Auth Token {!settings?.hasCustomTwilio && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={twilioAuthToken}
                  onChange={(e) => setTwilioAuthToken(e.target.value)}
                  placeholder={settings?.hasCustomTwilio ? '••••••••••••••••' : 'Enter Auth Token'}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings?.hasCustomTwilio ? 'Leave blank to keep existing' : 'Found in Twilio console'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={twilioPhoneNumber}
                  onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">E.164 format (e.g., +1234567890)</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="smsFallback"
                  checked={smsFallbackEnabled}
                  onChange={(e) => setSmsFallbackEnabled(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="smsFallback" className="text-sm text-gray-700">
                  Enable fallback to system SMS if custom configuration fails
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={saveSmsConfig}
              disabled={saving}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            {settings?.hasCustomTwilio && (
              <>
                <button
                  onClick={testSms}
                  disabled={saving}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Send Test SMS
                </button>
                <button
                  onClick={deleteSmsConfig}
                  disabled={saving}
                  className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  Delete Configuration
                </button>
              </>
            )}
          </div>

          {settings?.smsLastTestedAt && (
            <p className="text-xs text-gray-500 mt-4">
              Last tested: {new Date(settings.smsLastTestedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* DNS Wizard Modal (simplified version) */}
      {showDnsWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Domain Verification Setup</h3>
            <p className="mb-4">
              To complete domain verification, please contact your domain administrator or follow the DNS setup
              instructions in your SendGrid dashboard.
            </p>
            <button
              onClick={() => setShowDnsWizard(false)}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeSettings;

