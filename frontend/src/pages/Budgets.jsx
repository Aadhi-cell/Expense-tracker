import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Trash2, Edit2, AlertTriangle, CheckCircle2, AlertCircle, PieChart, ArrowUpRight, X } from 'lucide-react';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({
    category_name: 'Food & Dining',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const categories = [
    'Food',
    'Food & Dining',
    'Travel',
    'Transportation',
    'Housing',
    'Utilities',
    'Bills',
    'Healthcare',
    'Entertainment',
    'Shopping',
    'Personal Care',
    'Groceries',
    'Fitness',
    'Education',
    'Other'
  ];

  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/budgets/?month=${selectedMonth}&year=${selectedYear}`);
      setBudgets(res.data);
    } catch (error) {
      console.error("Failed to fetch budgets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, selectedYear]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await api.delete(`/budgets/${id}`);
        setBudgets(budgets.filter(b => b.id !== id));
      } catch (error) {
        console.error("Failed to delete budget", error);
      }
    }
  };

  const openAddModal = () => {
    setEditingBudget(null);
    setFormData({
      category_name: 'Food & Dining',
      amount: '',
      month: selectedMonth,
      year: selectedYear
    });
    setIsModalOpen(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category_name: budget.category_name,
      amount: budget.amount,
      month: budget.month,
      year: budget.year
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBudget(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        month: parseInt(formData.month),
        year: parseInt(formData.year)
      };

      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, payload);
      } else {
        await api.post('/budgets/', payload);
      }
      handleModalClose();
      fetchBudgets();
    } catch (error) {
      console.error("Failed to save budget", error);
      alert(error.response?.data?.detail || "Failed to save budget");
    }
  };

  // Summaries
  const totalBudgeted = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
  const warningsCount = budgets.filter(b => (b.percentage_used || 0) >= 75).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Budget Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Set monthly category spending caps and monitor real-time limits.</p>
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

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all"
          >
            <Plus className="h-4 w-4" />
            Set Budget
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <PieChart className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Monthly Budget</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">₹{totalBudgeted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent / Remaining</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
              ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 block sm:inline sm:ml-2">
                ({totalBudgeted >= totalSpent ? `₹${(totalBudgeted - totalSpent).toLocaleString('en-IN')} left` : 'Over budget'})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${warningsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {warningsCount > 0 ? <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" /> : <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />}
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Budget Health Status</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
              {warningsCount > 0 ? `${warningsCount} Warning${warningsCount > 1 ? 's' : ''}` : 'All on Track'}
            </p>
          </div>
        </div>
      </div>

      {/* Budget Cards Grid */}
      {loading ? (
        <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 text-sm">
          Loading budgets...
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
          <PieChart className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800">No Budgets Set for This Month</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 mb-5 max-w-sm mx-auto">
            Take control of your spending by setting monthly budgets for categories like Food, Bills, and Travel.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs"
          >
            Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {budgets.map((b) => {
            const pct = b.percentage_used || 0;
            const spent = b.spent_amount || 0;
            const remaining = b.remaining || (b.amount - spent);

            let statusColor = "bg-emerald-500";
            let badgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
            let statusText = "On Track";
            let StatusIcon = CheckCircle2;

            if (pct >= 100) {
              statusColor = "bg-red-500";
              badgeBg = "bg-red-50 text-red-700 border-red-200";
              statusText = "Exceeded";
              StatusIcon = AlertCircle;
            } else if (pct >= 90) {
              statusColor = "bg-red-400";
              badgeBg = "bg-orange-50 text-orange-700 border-orange-200";
              statusText = "Critical (90%+)";
              StatusIcon = AlertTriangle;
            } else if (pct >= 75) {
              statusColor = "bg-amber-400";
              badgeBg = "bg-amber-50 text-amber-700 border-amber-200";
              statusText = "Warning (75%+)";
              StatusIcon = AlertTriangle;
            }

            return (
              <div key={b.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg">{b.category_name}</h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        {months.find(m => m.value === b.month)?.name} {b.year}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border ${badgeBg}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-3 mb-1.5 flex justify-between items-baseline">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900">₹{spent.toLocaleString('en-IN')}</span>
                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium">of ₹{b.amount.toLocaleString('en-IN')} cap</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${statusColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-500 mb-3">
                    <span>{pct}% used</span>
                    <span className={remaining < 0 ? "text-red-500 font-bold" : "text-emerald-600 font-semibold"}>
                      {remaining >= 0 ? `₹${remaining.toLocaleString('en-IN')} left` : `Over by ₹${Math.abs(remaining).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex justify-end gap-1.5">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"
                    title="Edit Cap"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {editingBudget ? 'Update Budget' : 'Set Category Budget'}
              </h3>
              <button
                onClick={handleModalClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-xs sm:text-sm"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Monthly Spending Limit (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="e.g. 8000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {editingBudget ? 'Save Changes' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
