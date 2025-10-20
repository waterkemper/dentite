import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard,
  Send,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface PatientDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  createdSource?: string;
  lastVisitDate: string;
  nextAppointmentDate: string;
  insurance: Array<{
    insurancePlan: {
      carrierName: string;
    };
    annualMaximum: number;
    deductible: number;
    deductibleMet: number;
    usedBenefits: number;
    remainingBenefits: number;
    expirationDate: string;
  }>;
  benefitsSnapshots: Array<{
    snapshotDate: string;
    remainingBenefits: number;
  }>;
  outreachLogs: Array<{
    messageType: string;
    status: string;
    sentAt: string;
    campaign: {
      name: string;
    };
  }>;
}

export const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const fetchPatient = async () => {
    try {
      const response = await api.get(`/patients/${id}`);
      setPatient(response.data);
      setForm({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        dateOfBirth: response.data.dateOfBirth ? response.data.dateOfBirth.substring(0,10) : '',
        address: response.data.address || '',
        city: response.data.city || '',
        state: response.data.state || '',
        zipCode: response.data.zipCode || '',
      });
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      // Get first active campaign
      const campaignsResponse = await api.get('/outreach/campaigns');
      const campaign = campaignsResponse.data.campaigns.find((c: any) => c.isActive);
      
      if (campaign) {
        await api.post(`/outreach/send/${id}`, {
          campaignId: campaign.id,
          messageType: campaign.messageType,
        });
        alert('Message sent successfully!');
        await fetchPatient();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/patients/${id}` , form);
      setEditing(false);
      await fetchPatient();
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to save changes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  const primaryInsurance = patient.insurance.find((ins) => ins);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/patients')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {patient.createdSource && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${patient.createdSource === 'manual' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {patient.createdSource === 'manual' ? 'Manual' : 'API'}
                </span>
              )}
              {patient.email && (
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  {patient.email}
                </div>
              )}
              {patient.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {patient.phone}
                </div>
              )}
              {patient.dateOfBirth && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Born {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(!editing)}
            className="btn btn-secondary"
          >
            {editing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            onClick={handleSendMessage}
            disabled={sending}
            className="btn btn-primary flex items-center"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send Reminder'}
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Edit Patient</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Birth</label>
              <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="label">Zip Code</label>
              <input className="input" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      )}

      {/* Insurance Benefits */}
      {primaryInsurance && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-gray-900">Insurance Benefits</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Carrier</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {primaryInsurance.insurancePlan.carrierName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Annual Maximum</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                ${primaryInsurance.annualMaximum.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Used Benefits</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                ${primaryInsurance.usedBenefits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Remaining Benefits</p>
              <p className="text-lg font-semibold text-success mt-1">
                ${primaryInsurance.remainingBenefits.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Deductible</p>
                <p className="text-base text-gray-900 mt-1">
                  ${primaryInsurance.deductibleMet.toLocaleString()} of $
                  {primaryInsurance.deductible.toLocaleString()} met
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expiration Date</p>
                <p className="text-base text-gray-900 mt-1">
                  {format(new Date(primaryInsurance.expirationDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilization</p>
                <p className="text-base text-gray-900 mt-1">
                  {Math.round(
                    (primaryInsurance.usedBenefits / primaryInsurance.annualMaximum) * 100
                  )}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Timeline */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">Benefits Timeline</h2>
        </div>
        <div className="space-y-3">
          {patient.benefitsSnapshots.slice(0, 6).map((snapshot, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">
                {format(new Date(snapshot.snapshotDate), 'MMM d, yyyy')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                ${snapshot.remainingBenefits.toLocaleString()} remaining
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Outreach History */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Outreach History</h2>
        <div className="space-y-3">
          {patient.outreachLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No outreach messages sent yet</p>
          ) : (
            patient.outreachLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.campaign.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.messageType.toUpperCase()} • {format(new Date(log.sentAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    log.status === 'delivered' || log.status === 'sent'
                      ? 'bg-success text-white'
                      : log.status === 'failed'
                      ? 'bg-danger text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

