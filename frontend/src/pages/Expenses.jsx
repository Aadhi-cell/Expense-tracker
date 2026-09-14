import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Plus, Trash2, Edit2, Search, X, Zap, Send,
  AlertTriangle, Filter, Calendar, CreditCard, Tag, Store, FileText, CheckCircle2
} from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Natural Language Entry State
  const [nlText, setNlText] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Food',
    payment_method: 'Credit Card',
    expense_date: new Date().toISOString().split('T')[0],
    merchant: '',
    notes: ''
  });

  // Anomaly check state
  const [anomalyWarning, setAnomalyWarning] = useState(null);
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(false);

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

  const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'UPI', 'Net Banking', 'Other'];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/expenses/');
      setExpenses(response.data);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Handle Natural Language Parse
  const handleNLExpense = async (e) => {
    e.preventDefault();
    if (!nlText.trim()) return;

    setNlLoading(true);
    try {
      const response = await api.post('/ai/natural-language-expense', { text: nlText });
      setNlResult(response.data);
      // Auto-check anomaly
      if (response.data.amount > 0 && response.data.category) {
        checkAnomaly(response.data.amount, response.data.category);
      }
    } catch (error) {
      console.error("Quick entry parsing failed", error);
      alert("Could not extract expense info from text.");
    } finally {
      setNlLoading(false);
    }
  };

  const confirmNLSave = async () => {
    if (!nlResult) return;
    try {
      await api.post('/expenses/', {
        amount: nlResult.amount,
        category: nlResult.category,
        description: nlResult.description,
        expense_date: nlResult.date,
        payment_method: 'UPI',
        merchant: nlResult.merchant || '',
        notes: 'Added via Quick Entry'
      });
      setNlResult(null);
      setNlText('');
      setAnomalyWarning(null);
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense", error);
      alert("Failed to save expense.");
    }
  };

  // Check Anomaly when amount/category changes
  const checkAnomaly = async (amount, category) => {
    if (!amount || isNaN(amount) || amount <= 0) {
      setAnomalyWarning(null);
      return;
    }
    try {
      const res = await api.post('/ai/detect-anomalies', {
        amount: parseFloat(amount),
        category: category
      });
      if (res.data.is_anomaly) {
        setAnomalyWarning(res.data.explanation);
      } else {
        setAnomalyWarning(null);
      }
    } catch (e) {
      setAnomalyWarning(null);
    }
  };

  // Auto-categorize on description blur
  const handleDescriptionBlur = async () => {
    if (isCategoryManuallySet) return;
    if (!formData.description || formData.description.length < 3) return;
    try {
      const res = await api.post('/ai/categorize', { description: formData.description });
      if (res.data.category && res.data.category !== 'Other' && (res.data.confidence || 0) >= 0.25 && categories.includes(res.data.category)) {
        setFormData(prev => ({ ...prev, category: res.data.category }));
        if (formData.amount) {
          checkAnomaly(formData.amount, res.data.category);
        }
      }
    } catch (e) {
      console.error("Auto-categorize failed", e);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await api.delete(`/expenses/${id}`);
        setExpenses(expenses.filter(e => e.id !== id));
      } catch (error) {
        console.error("Failed to delete expense", error);
      }
    }
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setAnomalyWarning(null);
    setIsCategoryManuallySet(false);
    setFormData({
      amount: '',
      description: '',
      category: 'Food',
      payment_method: 'Credit Card',
      expense_date: new Date().toISOString().split('T')[0],
      merchant: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setAnomalyWarning(null);
    setIsCategoryManuallySet(true);
    setFormData({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      payment_method: expense.payment_method,
      expense_date: expense.expense_date,
      merchant: expense.merchant || '',
      notes: expense.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setAnomalyWarning(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        await api.post('/expenses/', payload);
      }
      handleModalClose();
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense", error);
      alert("Failed to save expense. Please verify all inputs.");
    }
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.merchant && exp.merchant.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Log, categorize, and gain deep insights into your spending.</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </header>

      {/* Quick Expense Entry Card */}
      <div className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 p-4 sm:p-6 rounded-2xl text-white shadow-md">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-300" />
          <h2 className="text-base sm:text-lg font-bold">Quick Expense Entry</h2>
          <span className="text-[10px] sm:text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium ml-1">Fast Log</span>
        </div>
        <p className="text-white/80 text-xs sm:text-sm mb-3 sm:mb-4">
          Type quickly: <span className="italic">"Spent ₹650 on dinner at KFC"</span> or <span className="italic">"Paid 1200 for electricity bill"</span>
        </p>

        <form onSubmit={handleNLExpense} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder="Type your expense (e.g. 500 for petrol)..."
            className="flex-1 px-3.5 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white transition-all text-xs sm:text-sm"
            disabled={nlLoading}
          />
          <button
            type="submit"
            disabled={nlLoading || !nlText.trim()}
            className="w-full sm:w-auto px-4 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
          >
            {nlLoading ? 'Processing...' : <><Send className="h-3.5 w-3.5" /> Quick Add</>}
          </button>
        </form>

        {/* Parsed Confirmation Box */}
        {nlResult && (
          <div className="mt-3.5 p-3.5 sm:p-4 bg-white rounded-xl text-slate-800 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Extracted Expense Details
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Ready to confirm</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Amount</span>
                <span className="text-sm font-extrabold text-slate-900">₹{nlResult.amount}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Category</span>
                <span className="font-semibold text-primary-700">{nlResult.category}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Date</span>
                <span className="font-medium text-slate-700">{nlResult.date}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Merchant</span>
                <span className="font-medium text-slate-700 truncate block">{nlResult.merchant || 'None'}</span>
              </div>
            </div>

            {anomalyWarning && (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>{anomalyWarning}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setNlResult(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmNLSave}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
              >
                Confirm & Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Expenses Table & Filters */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center bg-slate-50/50">
          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Search description, merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Category Filter Pills (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${selectedCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              All ({expenses.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No expenses found matching your filter criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description & Merchant</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        {new Date(expense.expense_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{expense.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          {expense.merchant && <span>🏪 {expense.merchant}</span>}
                          {expense.notes && <span>📝 {expense.notes}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs font-medium">
                        {expense.payment_method}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-base">
                        ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
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

            {/* Mobile Card Feed View (Native App Feel) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{expense.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                        <span>{new Date(expense.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        {expense.merchant && (
                          <>
                            <span>•</span>
                            <span className="truncate">🏪 {expense.merchant}</span>
                          </>
                        )}
                        {expense.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate">📝 {expense.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                        -₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {expense.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {expense.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
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

        {/* Table Footer with Total */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-700">
          <span>{filteredExpenses.length} transaction{filteredExpenses.length === 1 ? '' : 's'}</span>
          <span>Total: <span className="text-slate-900 text-sm sm:text-base font-extrabold">₹{totalFilteredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
        </div>
      </div>

      {/* Modal for Standard Add/Edit Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
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
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    checkAnomaly(e.target.value, formData.category);
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="0.00"
                />
              </div>

              {anomalyWarning && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{anomalyWarning}</span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs sm:text-sm font-medium text-slate-700">Description</label>
                  <span className="text-[10px] sm:text-xs text-primary-600 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Auto-categorize
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  onBlur={handleDescriptionBlur}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="e.g. KFC Zinger Burger lunch"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      setIsCategoryManuallySet(true);
                      setFormData({ ...formData, category: e.target.value });
                      checkAnomaly(formData.amount, e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Payment</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-xs sm:text-sm"
                  >
                    {paymentMethods.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Merchant</label>
                  <input
                    type="text"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs sm:text-sm"
                    placeholder="e.g. KFC, Amazon"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs sm:text-sm"
                  placeholder="e.g. Split with friends"
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
                  className="px-5 py-2 text-xs sm:text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {editingExpense ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
