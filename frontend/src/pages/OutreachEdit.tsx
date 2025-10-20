import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface CampaignForm {
  name: string;
  description?: string;
  triggerType: string;
  messageType: string;
  messageTemplate: string;
  minBenefitAmount: number;
  isActive: boolean;
}

export const OutreachEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    description: '',
    triggerType: 'expiring_60',
    messageType: 'both',
    messageTemplate: '',
    minBenefitAmount: 200,
    isActive: true,
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
      });
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
      await api.put(`/outreach/campaigns/${id}`, form);
      navigate('/outreach');
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
      navigate('/outreach');
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Campaign</h1>
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

        <div>
          <label className="label">Message Template</label>
          <textarea className="input" rows={5} value={form.messageTemplate} onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })} />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/outreach')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </div>
  );
};


