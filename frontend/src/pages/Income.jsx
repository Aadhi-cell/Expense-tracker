import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Trash2, Edit2, Search, X, DollarSign, Calendar, RefreshCw, Briefcase, TrendingUp } from 'lucide-react';

const Income = () => {
  const [incomes, setIncomes] = useState([]);
  const [summary, setSummary] = useState({
    monthly_income: 0,
    total_income: 0,
    recurring_income: 0,
    type_breakdown: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    source: '',
    income_type: 'Salary',
    payment_method: 'Bank Transfer',
    income_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    notes: ''
  });

  const incomeTypes = ['Salary', 'Business', 'Freelance', 'Bonus', 'Other'];
  const paymentMethods = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'];

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const [incomesRes, summaryRes] = await Promise.all([
        api.get('/income/'),
        api.get('/income/summary')
      ]);
      setIncomes(incomesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Failed to fetch income data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeData();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this income record?')) {
      try {
        await api.delete(`/income/${id}`);
        fetchIncomeData();
      } catch (error) {
        console.error("Failed to delete income", error);
        alert("Could not delete income record.");
      }
    }
  };

  const openAddModal = () => {
    setEditingIncome(null);
    setFormData({
      amount: '',
      source: '',
      income_type: 'Salary',
      payment_method: 'Bank Transfer',
      income_date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (income) => {
    setEditingIncome(income);
    setFormData({
      amount: income.amount,
      source: income.source,
      income_type: income.income_type,
      payment_method: income.payment_method || 'Bank Transfer',
      income_date: income.income_date,
      is_recurring: income.is_recurring,
      notes: income.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingIncome) {
        await api.put(`/income/${editingIncome.id}`, payload);
      } else {
        await api.post('/income/', payload);
      }
      handleModalClose();
      fetchIncomeData();
    } catch (error) {
      console.error("Failed to save income", error);
      alert("Failed to save income. Please check your inputs.");
    }
  };

  const filteredIncomes = incomes.filter(inc => {
    const matchesType = selectedType === 'All' || inc.income_type === selectedType;
    const matchesSearch = inc.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (inc.payment_method && inc.payment_method.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (inc.notes && inc.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Income Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track your salary, freelance earnings, and multiple income streams.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </button>
      </header>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month's Income</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">₹{summary.monthly_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Income (All-Time)</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">₹{summary.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Recurring Monthly</p>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-0.5 sm:mt-1">₹{summary.recurring_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Main Content Table & Filters */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50/50">
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Search source or notes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedType('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                selectedType === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({incomes.length})
            </button>
            {incomeTypes.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedType === t ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading your income records...</div>
        ) : filteredIncomes.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No income entries found. Click "Add Income" to log your salary or earnings!
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Recurring</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredIncomes.map((income) => (
                    <tr key={income.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {new Date(income.income_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div>{income.source}</div>
                        {income.notes && <div className="text-xs text-slate-400 mt-0.5">{income.notes}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {income.income_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {income.payment_method || 'Bank Transfer'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {income.is_recurring ? (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 font-medium">
                            <RefreshCw className="h-3 w-3" /> Monthly
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">One-time</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 text-base">
                        +₹{income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => openEditModal(income)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(income.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed (Native App Feel) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredIncomes.map((income) => (
                <div key={income.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{income.source}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                        <span>{new Date(income.income_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        {income.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate">{income.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-emerald-600 text-sm sm:text-base">
                        +₹{income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {income.income_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {income.payment_method || 'Bank Transfer'}
                      </span>
                      {income.is_recurring && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 font-medium">
                          <RefreshCw className="h-2.5 w-2.5" /> Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(income)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {editingIncome ? 'Edit Income' : 'Add Income Stream'}
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
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  placeholder="e.g. 50000"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Income Source / Employer</label>
                <input
                  type="text"
                  required
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                  placeholder="e.g. Tech Corp / Freelance Client"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Income Type</label>
                  <select
                    value={formData.income_type}
                    onChange={(e) => setFormData({ ...formData, income_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    {incomeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Date Received</label>
                <input
                  type="date"
                  required
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-xs sm:text-sm"
                />
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="recurring" className="text-xs sm:text-sm font-medium text-slate-700 cursor-pointer">
                  Recurring Monthly Income (e.g. Monthly Salary)
                </label>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-xs sm:text-sm"
                  placeholder="e.g. Performance bonus or project milestone"
                />
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
                  className="px-5 py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {editingIncome ? 'Save Changes' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Income;
