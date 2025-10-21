import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, 
  BookOpen, 
  Video, 
  MessageCircle, 
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Search,
  FileText,
  Settings,
  Users,
  BarChart3,
  MessageSquare
} from 'lucide-react';

export const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('getting-started');

  const helpCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      articles: [
        {
          title: 'Welcome to Dentite',
          description: 'Learn the basics of our platform and how to get started',
          url: '/help/getting-started'
        },
        {
          title: 'Setting up your practice',
          description: 'Configure your practice information and preferences',
          url: '/help/practice-setup'
        },
        {
          title: 'Connecting your PMS',
          description: 'Step-by-step guide to connect your practice management system',
          url: '/help/pms-connection'
        }
      ]
    },
    {
      id: 'messaging',
      title: 'Messaging & Communication',
      icon: MessageSquare,
      articles: [
        {
          title: 'Configuring SendGrid',
          description: 'Set up email delivery with SendGrid',
          url: '/help/sendgrid-setup'
        },
        {
          title: 'Setting up Twilio SMS',
          description: 'Configure SMS messaging with Twilio',
          url: '/help/twilio-setup'
        },
        {
          title: 'Customizing message templates',
          description: 'Create personalized patient communications',
          url: '/help/message-templates'
        }
      ]
    },
    {
      id: 'campaigns',
      title: 'Campaigns & Outreach',
      icon: Users,
      articles: [
        {
          title: 'Creating your first campaign',
          description: 'Learn how to set up automated patient outreach',
          url: '/help/first-campaign'
        },
        {
          title: 'Campaign best practices',
          description: 'Tips for effective patient communication',
          url: '/help/campaign-best-practices'
        },
        {
          title: 'Managing patient lists',
          description: 'Organize and segment your patients',
          url: '/help/patient-management'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics & Reporting',
      icon: BarChart3,
      articles: [
        {
          title: 'Understanding your dashboard',
          description: 'Learn what each metric means and how to use them',
          url: '/help/dashboard-metrics'
        },
        {
          title: 'Revenue recovery tracking',
          description: 'Monitor your practice\'s revenue recovery progress',
          url: '/help/revenue-tracking'
        },
        {
          title: 'Exporting reports',
          description: 'Generate and export detailed reports',
          url: '/help/report-export'
        }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: Settings,
      articles: [
        {
          title: 'Common connection issues',
          description: 'Fix PMS and messaging service connection problems',
          url: '/help/connection-troubleshooting'
        },
        {
          title: 'Email delivery problems',
          description: 'Resolve email delivery and deliverability issues',
          url: '/help/email-troubleshooting'
        },
        {
          title: 'Data sync issues',
          description: 'Troubleshoot patient data synchronization problems',
          url: '/help/sync-troubleshooting'
        }
      ]
    }
  ];

  const quickActions = [
    {
      title: 'Restart Onboarding',
      description: 'Go through the setup process again',
      icon: RefreshCw,
      action: () => window.location.href = '/app/onboarding'
    },
    {
      title: 'Contact Support',
      description: 'Get help from our support team',
      icon: MessageCircle,
      action: () => window.location.href = 'mailto:support@dentite.com'
    },
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: Video,
      action: () => window.open('https://youtube.com/dentite', '_blank')
    }
  ];

  const filteredArticles = helpCategories
    .find(cat => cat.id === selectedCategory)
    ?.articles.filter(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <HelpCircle className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          </div>
          <p className="text-lg text-gray-600">
            Find answers, tutorials, and support resources to help you get the most out of Dentite.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <nav className="space-y-2">
                {helpCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {category.title}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className="w-full flex items-center p-3 text-left rounded-lg border border-gray-200 hover:border-primary hover:bg-blue-50 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-primary mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">{action.title}</div>
                        <div className="text-sm text-gray-600">{action.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {helpCategories.find(cat => cat.id === selectedCategory)?.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                </p>
              </div>

              <div className="p-6">
                {filteredArticles.length > 0 ? (
                  <div className="space-y-4">
                    {filteredArticles.map((article, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">{article.title}</h3>
                          <p className="text-sm text-gray-600">{article.description}</p>
                        </div>
                        <div className="flex items-center">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
                    <p className="text-gray-600">
                      Try adjusting your search terms or browse different categories.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-primary rounded-lg p-6 mt-6 text-white">
              <div className="flex items-center mb-4">
                <MessageCircle className="w-6 h-6 mr-3" />
                <h3 className="text-lg font-semibold">Still need help?</h3>
              </div>
              <p className="text-blue-100 mb-4">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:support@dentite.com"
                  className="inline-flex items-center px-4 py-2 bg-white text-primary rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Email Support
                </a>
                <a
                  href="https://calendly.com/dentite/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-white text-white rounded-lg font-medium hover:bg-white hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Schedule Call
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
