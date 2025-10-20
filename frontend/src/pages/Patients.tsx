import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, Mail, Phone, Clock, Plus } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastVisitDate: string;
  nextAppointmentDate: string;
  insurance: {
    carrierName: string;
    remainingBenefits: number;
    expirationDate: string;
    daysUntilExpiry: number;
  };
}

export const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('daysUntilExpiry');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchPatients();
  }, [searchParams]);

  const fetchPatients = async () => {
    try {
      const filter = searchParams.get('filter');
      const params: any = {};
      
      if (filter === 'expiring') {
        params.daysUntilExpiry = 60;
        params.minBenefits = 200;
      }

      const response = await api.get('/patients', { params });
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/patients', form);
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', address: '', city: '', state: '', zipCode: '' });
      await fetchPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  const filteredPatients = patients
    .filter(
      (p) =>
        p.firstName.toLowerCase().includes(search.toLowerCase()) ||
        p.lastName.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'daysUntilExpiry') {
        return a.insurance.daysUntilExpiry - b.insurance.daysUntilExpiry;
      }
      if (sortBy === 'remainingBenefits') {
        return b.insurance.remainingBenefits - a.insurance.remainingBenefits;
      }
      return a.lastName.localeCompare(b.lastName);
    });

  const getExpiryColor = (days: number) => {
    if (days <= 14) return 'text-danger bg-red-50 border-red-200';
    if (days <= 30) return 'text-warning bg-yellow-50 border-yellow-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
        <p className="text-gray-600 mt-1">Manage patients and their benefits</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                className="input py-2"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="daysUntilExpiry">Days Until Expiry</option>
                <option value="remainingBenefits">Remaining Benefits</option>
                <option value="name">Name</option>
              </select>
            </div>
            <button className="btn btn-primary flex items-center" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Patient
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{filteredPatients.length}</span> patients with{' '}
          <span className="font-semibold">
            ${filteredPatients.reduce((sum, p) => sum + p.insurance.remainingBenefits, 0).toLocaleString()}
          </span>{' '}
          in total benefits at risk
        </p>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add Patient</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
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
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patients List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insurance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining Benefits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires In
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {patient.firstName} {patient.lastName}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {patient.email && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {patient.email}
                          </div>
                        )}
                        {patient.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="w-3 h-3 mr-1" />
                            {patient.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{patient.insurance.carrierName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      ${patient.insurance.remainingBenefits.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getExpiryColor(
                        patient.insurance.daysUntilExpiry
                      )}`}
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {patient.insurance.daysUntilExpiry} days
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="text-primary font-medium text-sm hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No patients found</p>
          </div>
        )}
      </div>
    </div>
  );
};

