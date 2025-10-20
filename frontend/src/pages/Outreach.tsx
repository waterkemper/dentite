import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { Plus, Send, MessageSquare, Mail, Smartphone, CheckCircle, Eye, MousePointer, Layers } from 'lucide-react';
import { SequenceBuilder, SequenceStep } from '../components/SequenceBuilder';

interface Campaign {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  messageType: string;
  messageTemplate: string;
  isActive: boolean;
  minBenefitAmount: number;
  isSequence?: boolean;
  autoStopOnAppointment?: boolean;
  autoStopOnResponse?: boolean;
  autoStopOnOptOut?: boolean;
  metrics?: {
    totalSent: number;
    delivered: number;
    responded: number;
    deliveryRate: number;
    responseRate: number;
  };
}

export const Outreach = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [performance, setPerformance] = useState<Campaign[]>([]);
  const [messagingStats, setMessagingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campaignType, setCampaignType] = useState<'single' | 'sequence'>('single');
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    triggerType: 'expiring_60',
    messageType: 'both',
    messageTemplate: '',
    minBenefitAmount: 200,
    isSequence: false,
    autoStopOnAppointment: true,
    autoStopOnResponse: true,
    autoStopOnOptOut: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, performanceRes, messagingRes] = await Promise.all([
        api.get('/outreach/campaigns'),
        api.get('/analytics/campaign-performance'),
        api.get('/analytics/messaging-performance'),
      ]);
      setCampaigns(campaignsRes.data.campaigns);
      setPerformance(performanceRes.data.campaigns);
      setMessagingStats(messagingRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate sequence steps if creating a sequence
      if (campaignType === 'sequence') {
        const hasIncompleteSteps = sequenceSteps.some(step => 
          !step.name.trim() || !step.messageTemplate.trim()
        );
        
        if (hasIncompleteSteps) {
          alert('Please complete all step details before saving the campaign.');
          return;
        }
        
        if (sequenceSteps.length === 0) {
          alert('Please add at least one step to your sequence campaign.');
          return;
        }
      }

      const campaignData = {
        ...newCampaign,
        isSequence: campaignType === 'sequence',
      };

      // Create campaign
      const response = await api.post('/outreach/campaigns', campaignData);
      const campaignId = response.data.campaign.id;

      // If sequence, create steps
      if (campaignType === 'sequence' && sequenceSteps.length > 0) {
        for (const step of sequenceSteps) {
          await api.post(`/outreach/campaigns/${campaignId}/steps`, step);
        }
      }

      setShowCreateModal(false);
      setCampaignType('single');
      setSequenceSteps([]);
      setNewCampaign({
        name: '',
        description: '',
        triggerType: 'expiring_60',
        messageType: 'both',
        messageTemplate: '',
        minBenefitAmount: 200,
        isSequence: false,
        autoStopOnAppointment: true,
        autoStopOnResponse: true,
        autoStopOnOptOut: true,
      });
      await fetchData();
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const getTriggerLabel = (type: string) => {
    switch (type) {
      case 'expiring_60':
        return '60 days before expiry';
      case 'expiring_30':
        return '30 days before expiry';
      case 'expiring_14':
        return '14 days before expiry';
      default:
        return type;
    }
  };

  const getMessageTypeIcon = (type: string) => {
    if (type === 'sms') return <Smartphone className="w-4 h-4" />;
    if (type === 'email') return <Mail className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Outreach Campaigns</h1>
          <p className="text-gray-600 mt-1">Manage automated patient outreach</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </button>
      </div>

      {/* Campaign Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Send className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-gray-600">Total Sent</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {messagingStats?.overview?.totalSent || 0}
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-gray-600">Delivery Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {messagingStats?.overview?.deliveryRate 
              ? Math.round(messagingStats.overview.deliveryRate)
              : 0}%
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-gray-600">Avg Response Rate</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {performance.length > 0
              ? Math.round(
                  performance.reduce((sum, c) => sum + (c.metrics?.responseRate || 0), 0) /
                    performance.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Email & SMS Performance */}
      {messagingStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">Email Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Sent</span>
                <span className="text-lg font-semibold">{messagingStats.email.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Open Rate</span>
                </div>
                <span className="text-lg font-semibold text-success">
                  {Math.round(messagingStats.email.openRate)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Click Rate</span>
                </div>
                <span className="text-lg font-semibold text-primary">
                  {Math.round(messagingStats.email.clickRate)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Opens</span>
                <span className="text-lg font-semibold">{messagingStats.email.totalOpens}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Clicks</span>
                <span className="text-lg font-semibold">{messagingStats.email.totalClicks}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-gray-900">SMS Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Sent</span>
                <span className="text-lg font-semibold">{messagingStats.sms.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivery Rate</span>
                <span className="text-lg font-semibold text-success">
                  {Math.round(messagingStats.sms.deliveryRate)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Delivered</span>
                <span className="text-lg font-semibold">{messagingStats.sms.delivered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="text-lg font-semibold text-error">{messagingStats.sms.failed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Campaigns</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No campaigns created yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary mt-4"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const perf = performance.find((p) => p.id === campaign.id);
              return (
                <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                        {campaign.isSequence && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Sequence
                          </span>
                        )}
                        {campaign.isActive ? (
                          <span className="px-2 py-1 bg-success text-white text-xs font-medium rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          {getMessageTypeIcon(campaign.messageType)}
                          <span>{campaign.messageType === 'both' ? 'SMS + Email' : campaign.messageType.toUpperCase()}</span>
                        </div>
                        <span>â€¢</span>
                        <span>{getTriggerLabel(campaign.triggerType)}</span>
                        <span>â€¢</span>
                        <span>Min: ${campaign.minBenefitAmount}</span>
                      </div>
                    </div>
                    {perf?.metrics && (
                      <div className="flex gap-6 ml-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{perf.metrics.totalSent}</p>
                          <p className="text-xs text-gray-600 mt-1">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-success">
                            {Math.round(perf.metrics.deliveryRate)}%
                          </p>
                          <p className="text-xs text-gray-600 mt-1">Delivered</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-warning">
                            {Math.round(perf.metrics.responseRate)}%
                          </p>
                          <p className="text-xs text-gray-600 mt-1">Responded</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    {campaign.isSequence ? (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Layers className="w-4 h-4" />
                        <span>Multi-step sequence campaign</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 font-mono">{campaign.messageTemplate}</p>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link to={`/outreach/${campaign.id}`} className="btn btn-secondary">Edit</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Campaign</h2>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-6">
              {/* Campaign Type Toggle */}
              <div>
                <label className="label">Campaign Type</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setCampaignType('single')}
                    className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                      campaignType === 'single'
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5" />
                      <span className="font-semibold">Single Message</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Send one message to patients matching criteria
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignType('sequence')}
                    className={`flex-1 p-4 border-2 rounded-lg text-left transition-all ${
                      campaignType === 'sequence'
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-5 h-5" />
                      <span className="font-semibold">Multi-Step Sequence</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Send a series of messages over time
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Campaign Name</label>
                <input
                  type="text"
                  className="input"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                  placeholder="Year-End Benefits Reminder"
                />
              </div>

              <div>
                <label className="label">Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Remind patients about expiring benefits"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Trigger Time</label>
                  <select
                    className="input"
                    value={newCampaign.triggerType}
                    onChange={(e) => setNewCampaign({ ...newCampaign, triggerType: e.target.value })}
                  >
                    <option value="expiring_60">60 days before expiry</option>
                    <option value="expiring_30">30 days before expiry</option>
                    <option value="expiring_14">14 days before expiry</option>
                  </select>
                </div>

                {campaignType === 'single' && (
                  <div>
                    <label className="label">Message Type</label>
                    <select
                      className="input"
                      value={newCampaign.messageType}
                      onChange={(e) => setNewCampaign({ ...newCampaign, messageType: e.target.value })}
                    >
                      <option value="both">SMS + Email</option>
                      <option value="sms">SMS Only</option>
                      <option value="email">Email Only</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">Minimum Benefit Amount ($)</label>
                  <input
                    type="number"
                    className="input"
                    value={newCampaign.minBenefitAmount}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, minBenefitAmount: Number(e.target.value) })
                    }
                    required
                    min="0"
                  />
                </div>
              </div>

              {/* Single Message Template */}
              {campaignType === 'single' && (
                <div>
                  <label className="label">Message Template</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={newCampaign.messageTemplate}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, messageTemplate: e.target.value })
                    }
                    required
                    placeholder="Hi {firstName}, you have {amount} in dental benefits expiring on {expirationDate}. Don't let them go to waste! Call us to schedule your appointment."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {'{firstName}'}, {'{lastName}'}, {'{fullName}'}, {'{amount}'},{' '}
                    {'{expirationDate}'}, {'{daysRemaining}'}, {'{carrier}'}
                  </p>
                </div>
              )}

              {/* Sequence Builder */}
              {campaignType === 'sequence' && (
                <>
                  <SequenceBuilder steps={sequenceSteps} onChange={setSequenceSteps} />

                  {/* Auto-stop Options */}
                  <div className="border-t pt-4">
                    <label className="label mb-3">Automatic Stop Conditions</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCampaign.autoStopOnAppointment}
                          onChange={(e) =>
                            setNewCampaign({
                              ...newCampaign,
                              autoStopOnAppointment: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-gray-700">
                          Stop when patient books an appointment
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCampaign.autoStopOnResponse}
                          onChange={(e) =>
                            setNewCampaign({
                              ...newCampaign,
                              autoStopOnResponse: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-gray-700">
                          Stop when patient responds to any message
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCampaign.autoStopOnOptOut}
                          onChange={(e) =>
                            setNewCampaign({ ...newCampaign, autoStopOnOptOut: e.target.checked })
                          }
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm text-gray-700">Stop when patient opts out</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

