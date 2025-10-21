import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  MessageSquare, 
  BarChart3, 
  Database, 
  Shield, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Calendar,
  Users,
  Clock
} from 'lucide-react';

export const Home = () => {
  const features = [
    {
      icon: Database,
      title: 'Automated Benefits Tracking',
      description: 'Seamlessly sync with OpenDental and Ortho2Edge to automatically track patient insurance benefits, deductibles, and expiration dates.',
    },
    {
      icon: MessageSquare,
      title: 'Smart Patient Outreach',
      description: 'Send personalized SMS and email campaigns to patients with expiring benefits. Automated sequences keep patients engaged.',
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track recovered revenue, campaign performance, and patient engagement with comprehensive analytics dashboards.',
    },
    {
      icon: Calendar,
      title: 'PMS Integration',
      description: 'Direct integration with OpenDental and Ortho2Edge practice management systems. No manual data entry required.',
    },
    {
      icon: Shield,
      title: 'HIPAA-Compliant',
      description: 'Enterprise-grade security with encrypted messaging, secure webhooks, and full HIPAA compliance built-in.',
    },
    {
      icon: DollarSign,
      title: 'Revenue Recovery',
      description: 'Identify at-risk revenue and convert expiring benefits into scheduled appointments. Track ROI in real-time.',
    },
  ];

  const benefits = [
    'Prevent thousands in lost revenue annually',
    'Automated patient communications',
    'Real-time benefit expiration alerts',
    'Multi-channel outreach (SMS + Email)',
    'Campaign sequence automation',
    'Stripe billing integration',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary">🦷 Dentite</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-primary font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Prevent Revenue Loss from
            <span className="text-primary"> Expiring Benefits</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Dentite helps dental practices automatically track insurance benefits, 
            send automated reminders, and recover thousands in revenue before coverage expires.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link to="/register" className="btn btn-primary text-lg px-8 py-3 min-w-[200px] text-center inline-flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link to="/login" className="btn bg-white text-primary border-2 border-primary hover:bg-blue-50 text-lg px-8 py-3 min-w-[200px] text-center">
              Sign In
            </Link>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-8 h-8 text-success" />
              </div>
              <p className="text-3xl font-bold text-gray-900">$1M+</p>
              <p className="text-gray-600">Revenue Recovered</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <p className="text-3xl font-bold text-gray-900">10K+</p>
              <p className="text-gray-600">Patients Engaged</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-8 h-8 text-warning" />
              </div>
              <p className="text-3xl font-bold text-gray-900">90%</p>
              <p className="text-gray-600">Time Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Maximize Revenue
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for dental practices to recover lost revenue from expiring insurance benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-primary to-blue-700 py-20 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Why Dental Practices Choose Dentite
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Stop losing thousands in revenue every year. Dentite automates the entire process 
              of tracking and recovering expiring insurance benefits.
            </p>
          </div>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-300 mr-3 flex-shrink-0 mt-1" />
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start recovering revenue today
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-xl p-8 text-gray-900 border border-gray-200">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-primary mb-2">
                $200-300
                <span className="text-2xl text-gray-600 font-normal">/month</span>
              </div>
              <p className="text-gray-600">per practice</p>
            </div>
            
            <ul className="space-y-4 mb-8 max-w-md mx-auto">
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>Unlimited patient tracking</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>Automated SMS & Email campaigns</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>Real-time analytics dashboard</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>PMS integration (OpenDental, Ortho2Edge)</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>HIPAA-compliant security</span>
              </li>
              <li className="flex items-center">
                <CheckCircle className="w-5 h-5 text-success mr-3" />
                <span>Priority support</span>
              </li>
            </ul>
            
            <div className="text-center">
              <Link to="/register" className="btn btn-primary text-lg px-8 py-3 min-w-[200px] text-center inline-flex items-center justify-center">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Stop Losing Revenue?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of dental practices already maximizing their revenue with Dentite.
            Get started in minutes with our simple setup process.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="btn btn-primary text-lg px-8 py-3 min-w-[200px] text-center inline-flex items-center justify-center">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link to="/login" className="btn bg-gray-100 text-gray-900 hover:bg-gray-200 text-lg px-8 py-3 min-w-[200px] text-center">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <span className="text-2xl font-bold text-white">🦷 Dentite</span>
              </div>
              <p className="text-gray-400 mb-4">
                Helping dental practices prevent revenue loss from expiring insurance benefits 
                through automated tracking and patient outreach.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/register" className="hover:text-white">Get Started</Link></li>
                <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="hover:text-white">About</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
                <li><a href="#privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Dentite. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

