import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  X, TrendingUp, TrendingDown, Calendar, CreditCard, Tag, 
  AlertTriangle, AlertCircle, Search, ArrowUpRight, Flame, 
  Wallet, Layers, Sparkles, Filter, ChevronRight, PiggyBank
} from 'lucide-react';

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#64748b'
];

const MonthlyExpenseModal = ({ isOpen, onClose, selectedMonth, selectedYear, months = [] }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/dashboard/monthly-expense-details?month=${selectedMonth}&year=${selectedYear}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to load monthly expense details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, selectedMonth, selectedYear]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentMonthName = months.find(m => m.value === selectedMonth)?.name || data?.month_name || `Month ${selectedMonth}`;

  const filteredTransactions = (data?.transactions || []).filter(tx => {
    const matchesSearch = 
      (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.merchant && tx.merchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.category && tx.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = activeCategoryFilter === 'All' || tx.category === activeCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div 
        className="bg-white w-full max-w-5xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden my-0 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar Indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-600 rounded-xl sm:rounded-2xl shrink-0">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {currentMonthName} {selectedYear} Details
                </h2>
                {data && (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {data.expense_count} {data.expense_count === 1 ? 'Expense' : 'Expenses'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Spending breakdown, burn rate, payment modes, and transactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs sm:text-sm font-medium text-slate-500">Compiling monthly expense breakdown...</p>
            </div>
          ) : !data ? (
            <div className="p-6 text-center text-red-500 bg-red-50 rounded-2xl text-xs sm:text-sm">
              Failed to load expense details for this month.
            </div>
          ) : (
            <>
              {/* Monthly Cashflow Overview Strip */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 sm:px-5 space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between text-xs">
                {/* 3 Metrics in Compact Mobile Grid */}
                <div className="grid grid-cols-3 gap-2 text-center sm:text-left sm:flex sm:items-center sm:gap-3">
                  <div className="bg-white/80 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-slate-100 sm:border-none">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block sm:inline">Earned: </span>
                    <span className="font-extrabold text-emerald-600 text-xs sm:text-sm">
                      ₹{(data.monthly_income || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-white/80 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-slate-100 sm:border-none">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block sm:inline">Spent: </span>
                    <span className="font-extrabold text-amber-600 text-xs sm:text-sm">
                      ₹{data.total_spent.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-white/80 sm:bg-transparent p-2 sm:p-0 rounded-xl border border-slate-100 sm:border-none">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block sm:inline">Total Saved: </span>
                    <span className="font-extrabold text-purple-600 text-xs sm:text-sm">
                      ₹{(data.cumulative_savings || data.monthly_savings || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {data.monthly_savings > 0 && (
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs">
                    <PiggyBank className="h-3.5 w-3.5 shrink-0" />
                    <span>+₹{data.monthly_savings.toLocaleString('en-IN')} set aside in {currentMonthName}</span>
                  </div>
                )}
              </div>

              {/* Row 1: KPI Summary Cards (Mobile: 2 cols, Desktop: 5 cols) */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
                {/* 1. Total Spent */}
                <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-3 sm:p-4 rounded-2xl border border-amber-100/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider">Total Spent</span>
                    <div className="p-1 sm:p-1.5 bg-amber-100/80 text-amber-700 rounded-lg shrink-0">
                      <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
                      ₹{data.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    {data.total_budget > 0 ? (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex justify-between text-[10px] sm:text-xs text-slate-500">
                          <span>{data.budget_percentage}% used</span>
                          <span>₹{data.total_budget.toLocaleString('en-IN')} limit</span>
                        </div>
                        <div className="w-full bg-amber-200/50 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${data.budget_percentage > 100 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(data.budget_percentage || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">No budget set</p>
                    )}
                  </div>
                </div>

                {/* 2. Total Savings Card */}
                <div className="bg-gradient-to-br from-purple-50/80 to-fuchsia-50/50 p-3 sm:p-4 rounded-2xl border border-purple-100/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-wider">Total Savings</span>
                    <div className="p-1 sm:p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                      <PiggyBank className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-lg sm:text-2xl font-black text-purple-950 leading-tight">
                      ₹{(data.cumulative_savings || data.monthly_savings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] sm:text-xs">
                      <span className="text-slate-500 truncate mr-1">
                        {data.monthly_savings > 0 
                          ? `+₹${data.monthly_savings.toLocaleString('en-IN')} this month` 
                          : 'Not set this month'}
                      </span>
                      {data.cumulative_savings > (data.monthly_savings || 0) && (
                        <span className="text-purple-700 font-bold bg-purple-100/70 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] shrink-0">
                          Accumulated
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Daily Average & Burn Rate */}
                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-3 sm:p-4 rounded-2xl border border-blue-100/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider">Daily Avg</span>
                    <div className="p-1 sm:p-1.5 bg-blue-100/80 text-blue-700 rounded-lg shrink-0">
                      <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <p className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
                      ₹{data.daily_average.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] sm:text-xs font-normal text-slate-500"> /d</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
                      Est. End: <span className="font-semibold text-slate-700">₹{data.projected_month_end.toLocaleString('en-IN')}</span>
                    </p>
                  </div>
                </div>

                {/* 4. Last Month Comparison */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">vs. Last Mo</span>
                    <div className={`p-1 sm:p-1.5 rounded-lg shrink-0 ${data.diff_vs_last_month > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {data.diff_vs_last_month > 0 ? <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base sm:text-xl font-black leading-tight ${data.diff_vs_last_month > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {data.diff_vs_last_month > 0 ? `+${data.pct_change_vs_last_month}%` : `${data.pct_change_vs_last_month}%`}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400 truncate">
                        ({data.diff_vs_last_month > 0 ? '+' : ''}₹{data.diff_vs_last_month.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">
                      {data.prev_month_name}: ₹{data.previous_month_spent.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* 5. Peak Spending Day (Full width on 2-col mobile) */}
                <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-purple-50/70 to-fuchsia-50/40 p-3 sm:p-4 rounded-2xl border border-purple-100/80 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-wider">Peak Spend Day</span>
                    <div className="p-1 sm:p-1.5 bg-purple-100/80 text-purple-700 rounded-lg shrink-0">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    {data.highest_spending_day ? (
                      <>
                        <p className="text-lg sm:text-xl font-black text-purple-900 leading-tight">
                          ₹{data.highest_spending_day.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] sm:text-xs text-purple-600 mt-1 font-medium">
                          {new Date(data.highest_spending_day.date).toLocaleDateString(undefined, { 
                            weekday: 'short', month: 'short', day: 'numeric' 
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 mt-1">No expenses recorded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Budget Alerts Banner (if any) */}
              {data.budget_alerts && data.budget_alerts.length > 0 && (
                <div className="p-3 sm:p-4 bg-amber-50/80 border border-amber-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    Budget Threshold Alerts ({data.budget_alerts.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {data.budget_alerts.map((alert, idx) => (
                      <span 
                        key={idx}
                        className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                          alert.alert_level === 'exceeded' 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {alert.alert_level === 'exceeded' && <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />}
                        {alert.category}: {alert.percentage_used}% used (₹{alert.spent_amount.toLocaleString('en-IN')} / ₹{alert.budget_amount.toLocaleString('en-IN')})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: Category Breakdown & Payment Methods & Top 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {/* Category Breakdown Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        <Tag className="h-4 w-4 text-primary-600 shrink-0" />
                        Category Breakdown
                      </h3>
                      <span className="text-[11px] text-slate-400">{data.category_breakdown.length} categories</span>
                    </div>

                    {data.category_breakdown.length > 0 ? (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {data.category_breakdown.map((item, idx) => {
                          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                          return (
                            <div key={item.category} className="space-y-1">
                              <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                <span className="font-medium text-slate-700 flex items-center gap-1.5 truncate pr-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                                  <span className="truncate">{item.category}</span>
                                </span>
                                <span className="font-semibold text-slate-900 shrink-0">
                                  ₹{item.amount.toLocaleString('en-IN')} ({item.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${item.percentage}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No categories recorded</p>
                    )}
                  </div>
                </div>

                {/* Payment Method Split Card */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />
                        Payment Methods
                      </h3>
                      <span className="text-[11px] text-slate-400">{data.payment_method_breakdown.length} methods</span>
                    </div>

                    {data.payment_method_breakdown.length > 0 ? (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {data.payment_method_breakdown.map((pm) => (
                          <div key={pm.payment_method} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px] sm:text-xs">
                              <span className="font-medium text-slate-700">{pm.payment_method}</span>
                              <span className="font-semibold text-slate-900">
                                ₹{pm.amount.toLocaleString('en-IN')} ({pm.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${pm.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No payment methods recorded</p>
                    )}
                  </div>
                </div>

                {/* Top 5 High-Value Expenses */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between md:col-span-2 lg:col-span-1">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0" />
                        Top 5 Largest Spends
                      </h3>
                      <span className="text-[11px] text-slate-400">Peak Purchases</span>
                    </div>

                    {data.top_expenses.length > 0 ? (
                      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                        {data.top_expenses.map((top, idx) => (
                          <div key={top.id || idx} className="py-2 flex justify-between items-center text-xs">
                            <div className="truncate pr-2">
                              <p className="font-semibold text-slate-800 truncate">{top.description}</p>
                              <p className="text-[11px] text-slate-400">
                                {top.category} • {new Date(top.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 shrink-0">
                              ₹{top.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-6 text-center">No purchases recorded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: All Monthly Transactions (Mobile Responsive) */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">Monthly Transactions List</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400">Filtered list of all expenses in {currentMonthName} {selectedYear}</p>
                  </div>

                  {/* Search & Category Filter */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <select
                      value={activeCategoryFilter}
                      onChange={(e) => setActiveCategoryFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700"
                    >
                      <option value="All">All Categories</option>
                      {data.category_breakdown.map(c => (
                        <option key={c.category} value={c.category}>{c.category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredTransactions.length > 0 ? (
                  <>
                    {/* Mobile View: Touch-friendly Card Feed (< 640px) */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => (
                        <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 text-xs truncate">{tx.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span>
                                {new Date(tx.expense_date).toLocaleDateString(undefined, { 
                                  month: 'short', day: 'numeric' 
                                })}
                              </span>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                                {tx.category}
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">{tx.payment_method}</span>
                            </div>
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs shrink-0">
                            ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tablet/Desktop View: Clean Table (>= 640px) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Payment</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {filteredTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                                {new Date(tx.expense_date).toLocaleDateString(undefined, { 
                                  month: 'short', day: 'numeric', year: 'numeric' 
                                })}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-slate-800">{tx.description}</p>
                                {tx.merchant && (
                                  <p className="text-[11px] text-slate-400">{tx.merchant}</p>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  {tx.category}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500">
                                {tx.payment_method}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No transactions match your search or filter.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-[11px] sm:text-xs text-slate-400">
            {data ? `${data.expense_count} total entries` : ''}
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 sm:py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer text-center"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyExpenseModal;
