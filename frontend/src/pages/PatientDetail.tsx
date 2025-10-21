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
  const [sequences, setSequences] = useState<any[]>([]);

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const fetchPatient = async () => {
    try {
      const response = await api.get(`/patients/${id}`);
      setPatient(response.data);
      // Get primary insurance data
      const primaryInsurance = response.data.insurance?.find((ins: any) => ins.isPrimary);
      
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
        // Insurance fields
        carrierName: primaryInsurance?.insurancePlan?.carrierName || '',
        policyNumber: primaryInsurance?.policyNumber || '',
        annualMaximum: primaryInsurance?.annualMaximum?.toString() || '',
        deductible: primaryInsurance?.deductible?.toString() || '',
        expirationDate: primaryInsurance?.expirationDate ? primaryInsurance.expirationDate.substring(0,10) : '',
      });

      // Fetch sequences
      try {
        const seqResponse = await api.get(`/outreach/patients/${id}/sequences`);
        setSequences(seqResponse.data.sequences || []);
      } catch (error) {
        console.error('Error fetching sequences:', error);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewMessage = async () => {
    try {
      // Get first active campaign
      const campaignsResponse = await api.get('/outreach/campaigns');
      const campaign = campaignsResponse.data.campaigns.find((c: any) => c.isActive);
      
      if (campaign) {
        // Get patient benefits for personalization
        const benefitsResponse = await api.get(`/patients/${id}`);
        const patientData = benefitsResponse.data;
        
        // Personalize the message template
        const personalizedMessage = campaign.messageTemplate
          .replace(/{firstName}/g, patientData.firstName || '')
          .replace(/{lastName}/g, patientData.lastName || '')
          .replace(/{fullName}/g, `${patientData.firstName} ${patientData.lastName}`)
          .replace(/{amount}/g, patientData.insurance?.[0] ? `$${Math.round(patientData.insurance[0].remainingBenefits)}` : '$0')
          .replace(/{expirationDate}/g, patientData.insurance?.[0] ? new Date(patientData.insurance[0].expirationDate).toLocaleDateString() : 'N/A')
          .replace(/{daysRemaining}/g, patientData.insurance?.[0] ? String(patientData.insurance[0].daysUntilExpiry) : '0')
          .replace(/{carrier}/g, patientData.insurance?.[0]?.insurancePlan?.carrierName || 'N/A');
        
        alert(`Message Preview:\n\n${personalizedMessage}`);
      } else {
        alert('No active campaign found. Please create a campaign first.');
      }
    } catch (error) {
      console.error('Error previewing message:', error);
      alert('Failed to preview message');
    }
  };

  const handleSendMessage = async () => {
    setSending(true);
    try {
      // Get first active campaign
      const campaignsResponse = await api.get('/outreach/campaigns');
      const campaign = campaignsResponse.data.campaigns.find((c: any) => c.isActive);
      
      if (campaign) {
        const response = await api.post(`/outreach/send/${id}`, {
          campaignId: campaign.id,
          messageType: campaign.messageType,
        });
        
        // Show message content in alert
        const messageContent = response.data.messageContent || 'Message sent successfully!';
        alert(`Message sent successfully!\n\nMessage content:\n${messageContent}`);
        await fetchPatient();
      } else {
        alert('No active campaign found. Please create a campaign first.');
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
            onClick={() => navigate('/app/patients')}
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
            onClick={handlePreviewMessage}
            className="btn btn-outline flex items-center"
          >
            <Mail className="w-4 h-4 mr-2" />
            Preview Message
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

          {/* Insurance Information Section */}
          <div className="border-t pt-4 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Insurance Carrier</label>
                <input className="input" value={form.carrierName} onChange={(e) => setForm({ ...form, carrierName: e.target.value })} placeholder="e.g., Blue Cross Blue Shield" />
              </div>
              <div>
                <label className="label">Policy Number</label>
                <input className="input" value={form.policyNumber} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} placeholder="Policy number" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="label">Annual Maximum</label>
                <input className="input" type="number" value={form.annualMaximum} onChange={(e) => setForm({ ...form, annualMaximum: e.target.value })} placeholder="1500" />
              </div>
              <div>
                <label className="label">Deductible</label>
                <input className="input" type="number" value={form.deductible} onChange={(e) => setForm({ ...form, deductible: e.target.value })} placeholder="50" />
              </div>
              <div>
                <label className="label">Expiration Date</label>
                <input className="input" type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
              </div>
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

      {/* Sequence Enrollments */}
      {sequences.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Sequences</h2>
          <div className="space-y-3">
            {sequences.map((seq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{seq.campaign.name}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                      <span>Step {seq.currentStepNumber + 1}</span>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full ${
                        seq.status === 'active' ? 'bg-green-100 text-green-800' :
                        seq.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {seq.status}
                      </span>
                      {seq.nextScheduledAt && seq.status === 'active' && (
                        <>
                          <span>•</span>
                          <span>Next: {format(new Date(seq.nextScheduledAt), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    {seq.stopReason && (
                      <p className="text-xs text-gray-500 mt-1">
                        Stopped: {seq.stopReason.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outreach History */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Outreach History</h2>
        <div className="space-y-3">
          {patient.outreachLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No outreach messages sent yet</p>
          ) : (
            patient.outreachLogs.map((log, index) => (
              <div key={index} className="bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.campaign.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.messageType.toUpperCase()} • {format(new Date(log.sentAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        log.status === 'delivered' || log.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : log.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {log.status}
                    </span>
                    <button
                      onClick={() => {
                        const content = document.getElementById(`message-content-${index}`);
                        if (content) {
                          content.classList.toggle('hidden');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Message
                    </button>
                  </div>
                </div>
                <div id={`message-content-${index}`} className="hidden px-4 pb-4">
                  <div className="bg-white p-3 rounded border-l-4 border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.messageContent}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

