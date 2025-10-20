import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export const Register = () => {
  const [formData, setFormData] = useState({
    practice: {
      name: '',
      email: '',
      phone: '',
    },
    user: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section: 'practice' | 'user', field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">🦷 Dentite</h1>
          <p className="text-gray-600">Start your free trial today</p>
        </div>

        <div className="card p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Practice Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Practice Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.practice.name}
                    onChange={(e) => handleChange('practice', 'name', e.target.value)}
                    required
                    placeholder="Springfield Dental Care"
                  />
                </div>
                <div>
                  <label className="label">Practice Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.practice.email}
                    onChange={(e) => handleChange('practice', 'email', e.target.value)}
                    required
                    placeholder="office@practice.com"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.practice.phone}
                    onChange={(e) => handleChange('practice', 'phone', e.target.value)}
                    placeholder="555-1234"
                  />
                </div>
              </div>
            </div>

            {/* Admin User Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin User</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.user.firstName}
                    onChange={(e) => handleChange('user', 'firstName', e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.user.lastName}
                    onChange={(e) => handleChange('user', 'lastName', e.target.value)}
                    required
                    placeholder="Smith"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.user.email}
                    onChange={(e) => handleChange('user', 'email', e.target.value)}
                    required
                    placeholder="john@practice.com"
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    className="input"
                    value={formData.user.password}
                    onChange={(e) => handleChange('user', 'password', e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

