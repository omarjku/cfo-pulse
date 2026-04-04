import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import Anthropic from '@anthropic-ai/sdk';

function App() {
  const [financialData, setFinancialData] = useState([]);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('Analyze our Q3 revenue trends');

  // Debug: Check if environment variable is available
  useEffect(() => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    console.log('VITE_ANTHROPIC_API_KEY exists:', !!apiKey);
    console.log('VITE_ANTHROPIC_API_KEY length:', apiKey ? apiKey.length : 0);
    console.log('VITE_ANTHROPIC_API_KEY first chars:', apiKey ? `${apiKey.substring(0, 8)}...` : 'none');
    console.log('import.meta.env keys:', Object.keys(import.meta.env));
  }, []);

  // Sample financial data
  const sampleData = [
    { month: 'Jan', revenue: 45000, expenses: 32000, profit: 13000 },
    { month: 'Feb', revenue: 52000, expenses: 35000, profit: 17000 },
    { month: 'Mar', revenue: 48000, expenses: 34000, profit: 14000 },
    { month: 'Apr', revenue: 61000, expenses: 38000, profit: 23000 },
    { month: 'May', revenue: 55000, expenses: 36000, profit: 19000 },
    { month: 'Jun', revenue: 72000, expenses: 42000, profit: 30000 },
  ];

  useEffect(() => {
    setFinancialData(sampleData);
  }, []);

  const getClaudeInsight = async () => {
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      setInsight('Error: API key not configured. Please set VITE_ANTHROPIC_API_KEY environment variable.');
      return;
    }

    setLoading(true);
    try {
      const anthropic = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      });

      const prompt = `As a CFO AI assistant, analyze this financial data and provide insights: ${JSON.stringify(sampleData)}. User query: ${query}`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      setInsight(response.content[0].text);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        status: error.status,
        statusText: error.statusText,
        response: error.response
      });
      setInsight(`Error fetching insights: ${error.message}. Please check your API key and network connection.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">CFO Pulse</h1>
        <p className="text-gray-600 mt-2">AI-Powered Financial Insights Dashboard</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Key Metrics */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Metrics</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-500">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">$333,000</p>
            </div>
            <div>
              <p className="text-gray-500">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600">$217,000</p>
            </div>
            <div>
              <p className="text-gray-500">Net Profit</p>
              <p className="text-3xl font-bold text-blue-600">$116,000</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Revenue & Expenses</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Chart */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Monthly Profit</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="profit" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Financial Insights</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ask Claude for financial insights..."
              />
              <button
                onClick={getClaudeInsight}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 min-h-48">
              {insight ? (
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{insight}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">Click "Analyze" to get AI-powered financial insights from Claude.</p>
              )}
            </div>
            <div className="text-sm text-gray-500">
              <p>Powered by Anthropic Claude API. Ensure VITE_ANTHROPIC_API_KEY is set in your environment.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>CFO Pulse Dashboard • {format(new Date(), 'MMMM d, yyyy')}</p>
        <p className="mt-1">Deploy on Vercel with environment variables configured.</p>
      </footer>
    </div>
  );
}

export default App;