import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, Mail, Phone, Clock, Plus, X, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lastVisitDate: string;
  nextAppointmentDate: string;
  insurance?: {
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreate, setShowCreate] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{
    daysUntilExpiry?: number;
    minBenefits?: number;
    carrierName?: string;
  }>({});
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
    // Insurance fields
    carrierName: '',
    policyNumber: '',
    annualMaximum: '',
    deductible: '',
    expirationDate: '',
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
    loadFiltersFromUrl();
  }, [searchParams]);

  const loadFiltersFromUrl = () => {
    const filter = searchParams.get('filter');
    const daysUntilExpiry = searchParams.get('daysUntilExpiry');
    const minBenefits = searchParams.get('minBenefits');
    const carrierName = searchParams.get('carrierName');
    
    const filters: any = {};
    
    // Handle generic 'filter' parameter - convert to specific parameters
    if (filter === 'expiring') {
      // Convert generic filter to specific URL parameters
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('filter');
      newParams.set('daysUntilExpiry', '60');
      newParams.set('minBenefits', '200');
      setSearchParams(newParams, { replace: true }); // Use replace to avoid creating history entry
      
      filters.daysUntilExpiry = 60;
      filters.minBenefits = 200;
    } else {
      // Handle specific filter parameters
      if (daysUntilExpiry) filters.daysUntilExpiry = parseInt(daysUntilExpiry);
      if (minBenefits) filters.minBenefits = parseInt(minBenefits);
      if (carrierName) filters.carrierName = carrierName;
    }
    
    setActiveFilters(filters);
  };

  const fetchPatients = async () => {
    try {
      const filter = searchParams.get('filter');
      const daysUntilExpiry = searchParams.get('daysUntilExpiry');
      const minBenefits = searchParams.get('minBenefits');
      const carrierName = searchParams.get('carrierName');
      
      const params: any = {};
      
      // Handle generic 'filter' parameter
      if (filter === 'expiring') {
        params.daysUntilExpiry = 60;
        params.minBenefits = 200;
      }
      
      // Handle specific filter parameters
      if (daysUntilExpiry) {
        params.daysUntilExpiry = parseInt(daysUntilExpiry);
      }
      if (minBenefits) {
        params.minBenefits = parseInt(minBenefits);
      }
      if (carrierName) {
        params.carrierName = carrierName;
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
    console.log('Form submitted with data:', form);
    try {
      const response = await api.post('/patients', form);
      console.log('Patient created successfully:', response.data);
      setShowCreate(false);
      setForm({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        phone: '', 
        dateOfBirth: '', 
        address: '', 
        city: '', 
        state: '', 
        zipCode: '',
        carrierName: '',
        policyNumber: '',
        annualMaximum: '',
        deductible: '',
        expirationDate: '',
      });
      await fetchPatients();
    } catch (error) {
      console.error('Error creating patient:', error);
      alert('Failed to create patient. Please check the console for details.');
    }
  };

  const applyFilters = (patients: Patient[]) => {
    return patients.filter((p) => {
      // Search filter
      const matchesSearch = 
        p.firstName.toLowerCase().includes(search.toLowerCase()) ||
        p.lastName.toLowerCase().includes(search.toLowerCase()) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Active filters
      if (activeFilters.daysUntilExpiry !== undefined) {
        const days = p.insurance?.daysUntilExpiry || 999999;
        if (days > activeFilters.daysUntilExpiry) return false;
      }
      
      if (activeFilters.minBenefits !== undefined) {
        const benefits = p.insurance?.remainingBenefits || 0;
        if (benefits < activeFilters.minBenefits) return false;
      }
      
      if (activeFilters.carrierName) {
        const carrier = p.insurance?.carrierName?.toLowerCase() || '';
        if (!carrier.includes(activeFilters.carrierName.toLowerCase())) return false;
      }
      
      return true;
    });
  };

  const sortPatients = (patients: Patient[]) => {
    return [...patients].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'daysUntilExpiry') {
        const aDays = a.insurance?.daysUntilExpiry || 999999;
        const bDays = b.insurance?.daysUntilExpiry || 999999;
        comparison = aDays - bDays;
      } else if (sortBy === 'remainingBenefits') {
        const aBenefits = a.insurance?.remainingBenefits || 0;
        const bBenefits = b.insurance?.remainingBenefits || 0;
        comparison = aBenefits - bBenefits;
      } else if (sortBy === 'name') {
        comparison = a.lastName.localeCompare(b.lastName);
      } else if (sortBy === 'carrier') {
        const aCarrier = a.insurance?.carrierName || '';
        const bCarrier = b.insurance?.carrierName || '';
        comparison = aCarrier.localeCompare(bCarrier);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const filteredPatients = sortPatients(applyFilters(patients));

  const getExpiryColor = (days: number) => {
    if (days <= 14) return 'text-danger bg-red-50 border-red-200';
    if (days <= 30) return 'text-warning bg-yellow-50 border-yellow-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-gray-600" /> : 
      <ArrowDown className="w-4 h-4 text-gray-600" />;
  };

  const applyFilter = (key: string, value: any) => {
    const newFilters = { ...activeFilters, [key]: value };
    setActiveFilters(newFilters);
    
    // Update URL parameters
    const newParams = new URLSearchParams(searchParams);
    
    // Remove the generic 'filter' parameter when setting specific filters
    if (key !== 'filter' && newParams.has('filter')) {
      newParams.delete('filter');
    }
    
    if (value !== undefined && value !== '') {
      newParams.set(key, value.toString());
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...activeFilters };
    delete (newFilters as any)[key as keyof typeof newFilters as keyof typeof activeFilters];
    setActiveFilters(newFilters);
    
    // Update URL parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    
    // If no specific filters remain, also remove generic filter
    const hasSpecificFilters = newParams.has('daysUntilExpiry') || 
                               newParams.has('minBenefits') || 
                               newParams.has('carrierName');
    
    if (!hasSpecificFilters) {
      newParams.delete('filter');
    }
    
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setActiveFilters({});
    setSearch('');
    setSortBy('daysUntilExpiry');
    setSortOrder('asc');
    setSearchParams({});
    // Force refetch with no filters
    fetchPatients();
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || search !== '';

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

      {/* Enhanced Filters */}
      <div className="card p-4">
        <div className="space-y-4">
          {/* Search and Quick Actions */}
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
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="btn btn-secondary flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset Filters
                </button>
              )}
              <button className="btn btn-primary flex items-center" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Patient
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Days Until Expiry
              </label>
              <select
                className="input py-2"
                value={activeFilters.daysUntilExpiry || ''}
                onChange={(e) => applyFilter('daysUntilExpiry', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All</option>
                <option value="7">7 days or less</option>
                <option value="14">14 days or less</option>
                <option value="30">30 days or less</option>
                <option value="60">60 days or less</option>
                <option value="90">90 days or less</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Benefits ($)
              </label>
              <input
                type="number"
                className="input py-2"
                placeholder="e.g., 200"
                value={activeFilters.minBenefits || ''}
                onChange={(e) => applyFilter('minBenefits', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insurance Carrier
              </label>
              <input
                type="text"
                className="input py-2"
                placeholder="e.g., Blue Cross"
                value={activeFilters.carrierName || ''}
                onChange={(e) => applyFilter('carrierName', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort by
              </label>
              <select
                className="input py-2"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="daysUntilExpiry">Days Until Expiry</option>
                <option value="remainingBenefits">Remaining Benefits</option>
                <option value="name">Name</option>
                <option value="carrier">Insurance Carrier</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600 flex items-center">
                <Filter className="w-4 h-4 mr-1" />
                Active filters:
              </span>
              {activeFilters.daysUntilExpiry !== undefined && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  ≤ {activeFilters.daysUntilExpiry} days
                  <button
                    onClick={() => removeFilter('daysUntilExpiry')}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFilters.minBenefits !== undefined && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  ≥ ${activeFilters.minBenefits}
                  <button
                    onClick={() => removeFilter('minBenefits')}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {activeFilters.carrierName && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  {activeFilters.carrierName}
                  <button
                    onClick={() => removeFilter('carrierName')}
                    className="ml-1 hover:text-purple-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  "{search}"
                  <button
                    onClick={() => setSearch('')}
                    className="ml-1 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Showing <span className="font-semibold">{filteredPatients.length}</span> patients with{' '}
          <span className="font-semibold">
            ${filteredPatients.reduce((sum, p) => sum + (p.insurance?.remainingBenefits || 0), 0).toLocaleString()}
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
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Patient
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('carrier')}
                >
                  <div className="flex items-center gap-2">
                    Insurance
                    {getSortIcon('carrier')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('remainingBenefits')}
                >
                  <div className="flex items-center gap-2">
                    Remaining Benefits
                    {getSortIcon('remainingBenefits')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('daysUntilExpiry')}
                >
                  <div className="flex items-center gap-2">
                    Expires In
                    {getSortIcon('daysUntilExpiry')}
                  </div>
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
                    <div className="text-sm text-gray-900">{patient.insurance?.carrierName || 'No Insurance'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">
                      ${(patient.insurance?.remainingBenefits || 0).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {patient.insurance ? (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getExpiryColor(
                          patient.insurance.daysUntilExpiry
                        )}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {patient.insurance.daysUntilExpiry} days
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border text-gray-500 bg-gray-50 border-gray-200">
                        N/A
                      </span>
                    )}
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

