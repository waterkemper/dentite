import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { SequenceBuilder, SequenceStep } from '../components/SequenceBuilder';
import { Layers, MessageSquare } from 'lucide-react';

interface CampaignForm {
  name: string;
  description?: string;
  triggerType: string;
  messageType: string;
  messageTemplate: string;
  minBenefitAmount: number;
  isActive: boolean;
  isSequence?: boolean;
  autoStopOnAppointment?: boolean;
  autoStopOnResponse?: boolean;
  autoStopOnOptOut?: boolean;
}

export const OutreachEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    description: '',
    triggerType: 'expiring_60',
    messageType: 'both',
    messageTemplate: '',
    minBenefitAmount: 200,
    isActive: true,
    isSequence: false,
    autoStopOnAppointment: true,
    autoStopOnResponse: true,
    autoStopOnOptOut: true,
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    try {
      const res = await api.get(`/outreach/campaigns/${id}`);
      const { campaign, metrics } = res.data;
      setForm({
        name: campaign.name,
        description: campaign.description || '',
        triggerType: campaign.triggerType,
        messageType: campaign.messageType,
        messageTemplate: campaign.messageTemplate,
        minBenefitAmount: campaign.minBenefitAmount,
        isActive: campaign.isActive,
        isSequence: campaign.isSequence || false,
        autoStopOnAppointment: campaign.autoStopOnAppointment !== undefined ? campaign.autoStopOnAppointment : true,
        autoStopOnResponse: campaign.autoStopOnResponse !== undefined ? campaign.autoStopOnResponse : true,
        autoStopOnOptOut: campaign.autoStopOnOptOut !== undefined ? campaign.autoStopOnOptOut : true,
      });
      
      // Load steps if it's a sequence campaign
      if (campaign.isSequence) {
        try {
          const stepsRes = await api.get(`/outreach/campaigns/${id}/steps`);
          setSteps(stepsRes.data.steps || []);
        } catch (error) {
          console.error('Error loading steps:', error);
        }
      }
      
      const delivered = metrics?.find((m: any) => m.status === 'delivered')?._count?._all || 0;
      const responded = metrics?.find((m: any) => m.status === 'responded')?._count?._all || 0;
      setDeliveredCount(delivered + responded);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Update campaign
      await api.put(`/outreach/campaigns/${id}`, form);
      
      // Update steps if it's a sequence campaign
      if (form.isSequence) {
        // Get current steps from API
        const currentStepsRes = await api.get(`/outreach/campaigns/${id}/steps`);
        const currentSteps = currentStepsRes.data.steps || [];
        
        // Delete existing steps
        for (const step of currentSteps) {
          await api.delete(`/outreach/campaigns/${id}/steps/${step.id}`);
        }
        
        // Create new steps
        for (const step of steps) {
          await api.post(`/outreach/campaigns/${id}/steps`, step);
        }
      }
      
      navigate('/app/outreach');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deliveredCount > 0) return; // Guard in UI
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/outreach/campaigns/${id}`);
      navigate('/app/outreach');
    } finally {
      setDeleting(false);
    }
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
            {form.isSequence && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                <Layers className="w-4 h-4" />
                Sequence
              </div>
            )}
          </div>
          <p className="text-gray-600 mt-1">Update settings or delete if unused</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting || deliveredCount > 0}
          className={`btn ${deliveredCount > 0 ? 'btn-secondary' : 'btn-danger'}`}
          title={deliveredCount > 0 ? 'Cannot delete after delivery' : 'Delete campaign'}
        >
          {deliveredCount > 0 ? 'Cannot Delete (Delivered)' : deleting ? 'Deleting...' : 'Delete Campaign'}
        </button>
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Active</label>
            <select className="input" value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Trigger</label>
            <select className="input" value={form.triggerType} onChange={(e) => setForm({ ...form, triggerType: e.target.value })}>
              <option value="expiring_60">60 days before expiry</option>
              <option value="expiring_30">30 days before expiry</option>
              <option value="expiring_14">14 days before expiry</option>
            </select>
          </div>
          <div>
            <label className="label">Message Type</label>
            <select className="input" value={form.messageType} onChange={(e) => setForm({ ...form, messageType: e.target.value })}>
              <option value="both">SMS + Email</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Minimum Benefit Amount</label>
            <input type="number" className="input" value={form.minBenefitAmount} onChange={(e) => setForm({ ...form, minBenefitAmount: Number(e.target.value) })} />
          </div>
        </div>

        {/* Message Template - only show for single campaigns */}
        {!form.isSequence && (
          <div>
            <label className="label">Message Template</label>
            <textarea className="input" rows={5} value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} />
          </div>
        )}

        {/* Sequence Steps - only show for sequence campaigns */}
        {form.isSequence && (
          <div>
            <label className="label">Sequence Steps</label>
            <SequenceBuilder steps={steps} onChange={setSteps} />
          </div>
        )}

        {/* Auto-stop options - only show for sequence campaigns */}
        {form.isSequence && (
          <div className="space-y-3">
            <label className="label">Auto-Stop Conditions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoStopOnAppointment || false}
                  onChange={(e) => setForm({ ...form, autoStopOnAppointment: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Stop when patient books appointment</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoStopOnResponse || false}
                  onChange={(e) => setForm({ ...form, autoStopOnResponse: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Stop when patient responds</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoStopOnOptOut || false}
                  onChange={(e) => setForm({ ...form, autoStopOnOptOut: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Stop when patient opts out</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/app/outreach')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};


