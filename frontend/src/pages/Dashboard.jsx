import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, Plus,
  ArrowUpRight, AlertTriangle, CheckCircle2, AlertCircle,
  Clock, Sparkles, ChevronRight, ShieldAlert, Edit2, X, Target
} from 'lucide-react';
import MonthlyExpenseModal from '../components/MonthlyExpenseModal';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Month & Year Selector
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  // Savings Target Modal State
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [savingTargetLoading, setSavingTargetLoading] = useState(false);

  // Monthly Expense Details Drill-Down Modal State
  const [isExpenseDetailsModalOpen, setIsExpenseDetailsModalOpen] = useState(false);

  const fetchDashboard = async (m = selectedMonth, y = selectedYear) => {
    try {
      const response = await api.get(`/dashboard/?month=${m}&year=${y}`);
      setData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handleSaveSavingsTarget = async (e) => {
    e.preventDefault();
    try {
      setSavingTargetLoading(true);
      const targetVal = parseFloat(targetInput) || 0;
      await api.post('/dashboard/savings-target', { 
        target: targetVal,
        month: selectedMonth,
        year: selectedYear
      });
      setIsSavingsModalOpen(false);
      fetchDashboard();
    } catch (error) {
      console.error("Failed to update savings target", error);
      alert("Failed to update monthly savings target");
    } finally {
      setSavingTargetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
        Failed to load financial dashboard. Please check your backend connection.
      </div>
    );
  }

  // Transform category data for pie chart
  const pieData = (data.category_expenses || []).map(item => ({
    name: item.category,
    value: item.amount
  }));

  // Historical Monthly Trends
  const trendData = data.monthly_trends && data.monthly_trends.length > 0
    ? data.monthly_trends
    : [
      { name: 'Month 1', expenses: data.monthly_expenses * 0.7, income: data.monthly_income * 0.9, savings: 0 },
      { name: 'Month 2', expenses: data.monthly_expenses * 0.85, income: data.monthly_income, savings: 0 },
      { name: 'This Month', expenses: data.monthly_expenses, income: data.monthly_income, savings: data.savings_amount },
    ];

  const savingsRate = data.savings_percentage || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Quick Actions */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Financial Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Real-time overview of your cashflow, savings, and budgets.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Month / Year Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <Link
              to="/income"
              state={{ openModal: true }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs sm:text-sm rounded-xl transition-colors text-center"
            >
              <Plus className="h-4 w-4" />
              Add Income
            </Link>
            <Link
              to="/expenses"
              state={{ openModal: true }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all text-center"
            >
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </div>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Available Balance */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Available Balance</span>
            <div className={`p-1.5 sm:p-2 rounded-xl ${data.available_balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className={`text-lg sm:text-2xl font-extrabold truncate ${data.available_balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              ₹{data.available_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-2">
              {data.savings_amount > 0
                ? `After ₹${data.savings_amount.toLocaleString('en-IN')} savings`
                : 'Net available funds'}
            </p>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Income</span>
            <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-lg sm:text-2xl font-extrabold text-emerald-600 truncate">
              ₹{data.monthly_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Earned this month</p>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div
          onClick={() => setIsExpenseDetailsModalOpen(true)}
          className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-100 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view full monthly expense breakdown & cards"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
              Monthly Expenses
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[11px] font-bold text-amber-600 bg-amber-50 group-hover:bg-amber-100 px-1.5 sm:px-2 py-0.5 rounded-full transition-colors flex items-center gap-0.5">
                Breakdown <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
              <div className="p-1.5 sm:p-2 bg-amber-50 group-hover:bg-amber-100 text-amber-600 rounded-xl transition-colors">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-lg sm:text-2xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors truncate">
              ₹{data.monthly_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>Spent this month</span>
              <span className="text-[10px] sm:text-[11px] text-amber-600 font-semibold group-hover:underline">Details →</span>
            </p>
          </div>
        </div>

        {/* Savings & Rate */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Savings</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setTargetInput(data.monthly_savings_target ? data.monthly_savings_target.toString() : '');
                  setIsSavingsModalOpen(true);
                }}
                title="Set / Edit Monthly Savings Target"
                className="p-1 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
              <div className="p-1.5 sm:p-2 bg-purple-50 text-purple-600 rounded-xl">
                <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-baseline justify-between gap-1">
              <p className={`text-lg sm:text-2xl font-extrabold truncate ${data.savings_amount >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                ₹{data.savings_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              {data.monthly_savings_target > 0 ? (
                <span className={`text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${
                  (data.this_month_savings !== undefined ? data.this_month_savings : data.savings_amount) >= data.monthly_savings_target
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {(data.this_month_savings !== undefined ? data.this_month_savings : data.savings_amount) >= data.monthly_savings_target
                    ? '✓ Met'
                    : `${Math.round(((data.this_month_savings !== undefined ? data.this_month_savings : data.savings_amount) / data.monthly_savings_target) * 100)}%`}
                </span>
              ) : (
                <button
                  onClick={() => {
                    setTargetInput('');
                    setIsSavingsModalOpen(true);
                  }}
                  className="text-[9px] sm:text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-1.5 sm:px-2 py-0.5 rounded-lg transition-colors flex items-center gap-0.5 cursor-pointer shrink-0"
                >
                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Target
                </button>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
              {data.this_month_savings > 0 ? (
                <>
                  <span className="font-medium text-slate-600">
                    ₹{data.this_month_savings.toLocaleString('en-IN')}
                  </span>{' '}
                  this month
                </>
              ) : (
                'No savings allocated this month'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Historical Cashflow Trend (Income vs Expenses) */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Income vs. Expense Trend</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Monthly historical spending and revenue pattern</p>
            </div>
          </div>
          <div className="flex-1 min-h-[240px] sm:min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px' }}
                  formatter={(value) => `₹${Number(value).toFixed(2)}`}
                />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5">Category Breakdown</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mb-2 sm:mb-3">Where your money went this month</p>
          <div className="flex-1 min-h-[200px] sm:min-h-[240px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                    formatter={(value) => `₹${Number(value).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs sm:text-sm py-6">
                No expense entries yet this month.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2 justify-center max-h-24 overflow-y-auto no-scrollbar">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-slate-50 px-2 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-700 font-medium truncate max-w-[100px]">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Budget Status & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Status Warnings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Budget Status</h2>
                <p className="text-xs text-slate-400">Real-time category spending alerts</p>
              </div>
              <Link to="/budgets" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data.budget_status && data.budget_status.length > 0 ? (
              <div className="space-y-4">
                {data.budget_status.slice(0, 4).map((b, idx) => {
                  const pct = b.percentage_used || 0;
                  let barColor = "bg-emerald-500";
                  let alertBadge = null;

                  if (pct >= 100) {
                    barColor = "bg-red-500";
                    alertBadge = (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Exceeded
                      </span>
                    );
                  } else if (pct >= 90) {
                    barColor = "bg-orange-500";
                    alertBadge = (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> 90%+ Used
                      </span>
                    );
                  } else if (pct >= 75) {
                    barColor = "bg-amber-400";
                    alertBadge = (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> 75% Used
                      </span>
                    );
                  }

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-800">{b.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            ₹{b.spent_amount.toLocaleString('en-IN')} / ₹{b.budget_amount.toLocaleString('en-IN')}
                          </span>
                          {alertBadge}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No active budgets for this month. <Link to="/budgets" className="text-primary-600 font-medium underline">Create one now</Link>!
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
                <p className="text-xs text-slate-400">Latest expense entries</p>
              </div>
              <Link to="/expenses" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {data.recent_transactions && data.recent_transactions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.recent_transactions.map((tx) => (
                  <div key={tx.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{tx.description}</p>
                      <p className="text-xs text-slate-400">
                        {tx.category} • {new Date(tx.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {tx.merchant && ` • ${tx.merchant}`}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 text-sm">
                      -₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No recent transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Set Monthly Savings Target Modal */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <PiggyBank className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Set Monthly Savings Target</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400">Set the amount you plan to save this month</p>
                </div>
              </div>
              <button
                onClick={() => setIsSavingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSavingsTarget} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Target Savings Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    required
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-base sm:text-lg font-bold text-slate-800"
                    placeholder="5000"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick select buttons */}
              <div>
                <span className="text-[11px] sm:text-xs text-slate-400 block mb-1.5">Quick Presets:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[3000, 5000, 10000, 15000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTargetInput(amt.toString())}
                      className="py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 transition-colors text-slate-700 border border-slate-200"
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSavingsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTargetLoading}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {savingTargetLoading ? 'Saving...' : 'Save Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly Expense Details Drill-Down Modal */}
      <MonthlyExpenseModal
        isOpen={isExpenseDetailsModalOpen}
        onClose={() => setIsExpenseDetailsModalOpen(false)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        months={months}
      />
    </div>
  );
};

export default Dashboard;
