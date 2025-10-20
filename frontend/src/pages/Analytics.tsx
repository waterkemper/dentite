import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  BarChart3 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface RecoveredRevenue {
  totalRecoveredRevenue: number;
  totalAppointments: number;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
  }>;
}

interface CampaignPerformance {
  id: string;
  name: string;
  triggerType: string;
  messageType: string;
  isActive: boolean;
  metrics: {
    totalSent: number;
    delivered: number;
    responded: number;
    deliveryRate: number;
    responseRate: number;
  };
}

export const Analytics = () => {
  const [revenue, setRevenue] = useState<RecoveredRevenue | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [revenueRes, campaignsRes] = await Promise.all([
        api.get('/analytics/recovered-revenue'),
        api.get('/analytics/campaign-performance'),
      ]);
      setRevenue(revenueRes.data);
      setCampaigns(campaignsRes.data.campaigns);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const chartData = revenue?.monthlyBreakdown.map((item) => ({
    month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
    revenue: item.revenue,
  })) || [];

  const campaignChartData = campaigns.map((c) => ({
    name: c.name.substring(0, 20),
    sent: c.metrics.totalSent,
    delivered: c.metrics.delivered,
    responded: c.metrics.responded,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Track your practice's performance and ROI</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recovered Revenue</p>
              <p className="text-3xl font-bold text-success mt-2">
                ${(revenue?.totalRecoveredRevenue || 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-success" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Appointments Booked</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {revenue?.totalAppointments || 0}
              </p>
            </div>
            <Calendar className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Appointment</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                $
                {revenue && revenue.totalAppointments > 0
                  ? Math.round(revenue.totalRecoveredRevenue / revenue.totalAppointments).toLocaleString()
                  : 0}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-warning" />
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-gray-900">Monthly Recovered Revenue</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">No revenue data yet</div>
        )}
      </div>

      {/* Campaign Performance Chart */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Campaign Performance</h2>
        {campaignChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#0066cc" name="Sent" />
              <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
              <Bar dataKey="responded" fill="#f59e0b" name="Responded" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">No campaign data yet</div>
        )}
      </div>

      {/* Campaign Performance Table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Campaign Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No campaigns yet
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-gray-500">{campaign.triggerType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{campaign.messageType}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {campaign.metrics.totalSent}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-success">
                        {campaign.metrics.delivered}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(campaign.metrics.deliveryRate)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-warning">
                        {Math.round(campaign.metrics.responseRate)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

