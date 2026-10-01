import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import { getCachedData, setCachedData, invalidateCache } from '../utils/cache';
import {
  Plus, Trash2, Edit2, Search, X, Zap, Send,
  AlertTriangle, CheckCircle2, Sparkles, Calendar,
  ChevronLeft, ChevronRight, TrendingDown, Receipt, CreditCard
} from 'lucide-react';

const Expenses = () => {
  const location = useLocation();
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1; // 1 to 12
  const currentYearNum = now.getFullYear();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month & Year Filter States (Default to Current Month & Year)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum); // 1-12 or 'ALL'
  const [selectedYear, setSelectedYear] = useState(currentYearNum);

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
    expense_date: now.toISOString().split('T')[0],
    merchant: '',
    notes: ''
  });

  // Anomaly check state
  const [anomalyWarning, setAnomalyWarning] = useState(null);
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(false);

  const months = [
    { value: 1, name: 'January', short: 'Jan' },
    { value: 2, name: 'February', short: 'Feb' },
    { value: 3, name: 'March', short: 'Mar' },
    { value: 4, name: 'April', short: 'Apr' },
    { value: 5, name: 'May', short: 'May' },
    { value: 6, name: 'June', short: 'Jun' },
    { value: 7, name: 'July', short: 'Jul' },
    { value: 8, name: 'August', short: 'Aug' },
    { value: 9, name: 'September', short: 'Sep' },
    { value: 10, name: 'October', short: 'Oct' },
    { value: 11, name: 'November', short: 'Nov' },
    { value: 12, name: 'December', short: 'Dec' },
  ];

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

  // Safe Date parsing helper without UTC shift
  const getExpenseDateParts = (dateStr) => {
    if (!dateStr) return { year: 0, month: 0, day: 0 };
    const clean = String(dateStr).split('T')[0];
    const [y, m, d] = clean.split('-').map(Number);
    return { year: y || 0, month: m || 0, day: d || 0 };
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const { year, month, day } = getExpenseDateParts(dateStr);
    if (!year || !month || !day) return dateStr;
    const monthShort = months.find(m => m.value === month)?.short || '';
    return `${day} ${monthShort} ${year}`;
  };

  const fetchExpenses = async () => {
    const cacheKey = 'expenses_list';
    const cached = getCachedData(cacheKey);
    if (cached) {
      setExpenses(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/expenses/?limit=1000');
      setExpenses(response.data);
      setCachedData(cacheKey, response.data, 180);
    } catch (error) {
      console.error("Failed to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Compute available months dynamically from expenses data + current month
  const availableMonthOptions = useMemo(() => {
    const map = new Map();

    // Ensure current month is always present
    const curKey = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;
    const curMonthObj = months.find(m => m.value === currentMonthNum);
    map.set(curKey, {
      key: curKey,
      year: currentYearNum,
      month: currentMonthNum,
      name: curMonthObj ? curMonthObj.name : `Month ${currentMonthNum}`,
      short: curMonthObj ? curMonthObj.short : `M${currentMonthNum}`,
      total: 0,
      count: 0
    });

    // Populate from all expenses
    expenses.forEach(exp => {
      const { year, month } = getExpenseDateParts(exp.expense_date);
      if (year && month) {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (!map.has(key)) {
          const mObj = months.find(m => m.value === month);
          map.set(key, {
            key,
            year,
            month,
            name: mObj ? mObj.name : `Month ${month}`,
            short: mObj ? mObj.short : `M${month}`,
            total: 0,
            count: 0
          });
        }
        const entry = map.get(key);
        entry.total += Number(exp.amount) || 0;
        entry.count += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [expenses, currentMonthNum, currentYearNum]);

  // Available years for dropdown
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYearNum - 1, currentYearNum, currentYearNum + 1]);
    expenses.forEach(exp => {
      const { year } = getExpenseDateParts(exp.expense_date);
      if (year) yearsSet.add(year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [expenses, currentYearNum]);

  // Prev / Next month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(currentMonthNum);
      setSelectedYear(currentYearNum);
      return;
    }
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'ALL') {
      setSelectedMonth(currentMonthNum);
      setSelectedYear(currentYearNum);
      return;
    }
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

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
      const payload = {
        amount: nlResult.amount,
        category: nlResult.category,
        description: nlResult.description,
        expense_date: nlResult.date,
        payment_method: 'UPI',
        merchant: nlResult.merchant || '',
        notes: 'Added via Quick Entry'
      };
      await api.post('/expenses/', payload);
      invalidateCache('expenses');
      invalidateCache('dashboard');

      // Switch to month of added expense
      const { year: addedY, month: addedM } = getExpenseDateParts(payload.expense_date);
      if (addedY && addedM && selectedMonth !== 'ALL') {
        setSelectedYear(addedY);
        setSelectedMonth(addedM);
      }

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
    } catch {
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
        invalidateCache('expenses');
        invalidateCache('dashboard');
        setExpenses(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error("Failed to delete expense", error);
      }
    }
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setAnomalyWarning(null);
    setIsCategoryManuallySet(false);

    let defaultDate = now.toISOString().split('T')[0];
    if (selectedMonth !== 'ALL') {
      if (currentYearNum === selectedYear && currentMonthNum === selectedMonth) {
        defaultDate = now.toISOString().split('T')[0];
      } else {
        defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      }
    }

    setFormData({
      amount: '',
      description: '',
      category: 'Food',
      payment_method: 'Credit Card',
      expense_date: defaultDate,
      merchant: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.openModal) {
      openAddModal();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
        const { year: addedY, month: addedM } = getExpenseDateParts(payload.expense_date);
        if (addedY && addedM && selectedMonth !== 'ALL') {
          setSelectedYear(addedY);
          setSelectedMonth(addedM);
        }
      }
      invalidateCache('expenses');
      invalidateCache('dashboard');
      handleModalClose();
      fetchExpenses();
    } catch (error) {
      console.error("Failed to save expense", error);
      alert("Failed to save expense. Please verify all inputs.");
    }
  };

  // Filter expenses according to month, year, category, and search term
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Month & Year filter
      if (selectedMonth !== 'ALL') {
        const { year, month } = getExpenseDateParts(exp.expense_date);
        if (year !== selectedYear || month !== selectedMonth) {
          return false;
        }
      }

      // 2. Category match
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) {
        return false;
      }

      // 3. Search match
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = exp.description?.toLowerCase().includes(term);
        const matchMerchant = exp.merchant?.toLowerCase().includes(term);
        const matchNotes = exp.notes?.toLowerCase().includes(term);
        if (!matchDesc && !matchMerchant && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, selectedMonth, selectedYear, selectedCategory, searchTerm]);

  // Group filtered expenses by month for clear month-wise split
  const monthGroups = useMemo(() => {
    const groupsMap = new Map();

    filteredExpenses.forEach(exp => {
      const { year, month } = getExpenseDateParts(exp.expense_date);
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!groupsMap.has(key)) {
        const mObj = months.find(m => m.value === month);
        groupsMap.set(key, {
          key,
          year,
          month,
          title: `${mObj ? mObj.name : `Month ${month}`} ${year}`,
          items: [],
          total: 0
        });
      }
      const grp = groupsMap.get(key);
      grp.items.push(exp);
      grp.total += Number(exp.amount) || 0;
    });

    return Array.from(groupsMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredExpenses]);

  // KPI Calculations
  const activeMonthLabel = useMemo(() => {
    if (selectedMonth === 'ALL') {
      return 'All Months Expenses';
    }
    const mObj = months.find(m => m.value === selectedMonth);
    return `${mObj ? mObj.name : ''} ${selectedYear} Expenses`;
  }, [selectedMonth, selectedYear]);

  const activeMonthTotal = useMemo(() => {
    if (selectedMonth === 'ALL') {
      return filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    }
    return expenses
      .filter(exp => {
        const { year, month } = getExpenseDateParts(exp.expense_date);
        return year === selectedYear && month === selectedMonth;
      })
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses, filteredExpenses, selectedMonth, selectedYear]);

  const activeMonthEntriesCount = useMemo(() => {
    if (selectedMonth === 'ALL') {
      return filteredExpenses.length;
    }
    return expenses.filter(exp => {
      const { year, month } = getExpenseDateParts(exp.expense_date);
      return year === selectedYear && month === selectedMonth;
    }).length;
  }, [expenses, filteredExpenses, selectedMonth, selectedYear]);

  const allTimeTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const activeCategoriesCount = useMemo(() => {
    const set = new Set(filteredExpenses.map(e => e.category));
    return set.size;
  }, [filteredExpenses]);

  const isCurrentCalendarMonth = selectedMonth === currentMonthNum && selectedYear === currentYearNum;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Month Navigation Controls */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log, categorize, and track your spending month by month.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Month & Year Navigation Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              disabled={selectedMonth === 'ALL'}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonth(val === 'ALL' ? 'ALL' : parseInt(val, 10));
              }}
              className="px-2.5 py-1.5 bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">📅 All Months (Split)</option>
              {months.map(m => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            {selectedMonth !== 'ALL' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-2 py-1.5 bg-transparent text-xs sm:text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer border-l border-slate-200"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}

            <button
              onClick={handleNextMonth}
              disabled={selectedMonth === 'ALL'}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick jump to Current Month button if navigated away */}
          {!isCurrentCalendarMonth && selectedMonth !== 'ALL' && (
            <button
              onClick={() => {
                setSelectedMonth(currentMonthNum);
                setSelectedYear(currentYearNum);
              }}
              className="px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 text-xs font-bold rounded-xl transition-all shadow-2xs"
            >
              This Month
            </button>
          )}

          {/* Add Expense Button */}
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all ml-auto lg:ml-0"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </header>

      {/* Quick Month Switcher Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider whitespace-nowrap flex items-center gap-1 shrink-0">
          <Calendar className="h-3.5 w-3.5 text-slate-400" /> Split By Month:
        </span>

        {/* All Months Pill */}
        <button
          onClick={() => setSelectedMonth('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all shadow-2xs flex items-center gap-1.5 ${
            selectedMonth === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All Months</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
            selectedMonth === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {expenses.length}
          </span>
        </button>

        {/* Dynamic Month Pills from data */}
        {availableMonthOptions.map(mOpt => {
          const isSelected = selectedMonth === mOpt.month && selectedYear === mOpt.year;
          return (
            <button
              key={mOpt.key}
              onClick={() => {
                setSelectedMonth(mOpt.month);
                setSelectedYear(mOpt.year);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all shadow-2xs flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{mOpt.name} {mOpt.year !== currentYearNum ? mOpt.year : ''}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                ₹{mOpt.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        {/* Active Month Expenses Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              {activeMonthLabel}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-0.5 sm:mt-1">
              ₹{activeMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeMonthEntriesCount} {activeMonthEntriesCount === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
        </div>

        {/* Total Expenses All-Time Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses (All-Time)</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">
              ₹{allTimeTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {expenses.length} total records logged
            </p>
          </div>
        </div>

        {/* Categories Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Categories</p>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-0.5 sm:mt-1">
              {activeCategoriesCount} Categories
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Filtered category count</p>
          </div>
        </div>
      </div>

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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                selectedCategory === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories ({filteredExpenses.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-slate-700 font-bold text-base">
              No expenses found
            </p>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm">
              {selectedMonth !== 'ALL'
                ? `No expenses recorded for ${months.find(m => m.value === selectedMonth)?.name || ''} ${selectedYear}.`
                : 'No expenses found matching your filter criteria.'}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
            >
              + Add Expense for {selectedMonth !== 'ALL' ? `${months.find(m => m.value === selectedMonth)?.name || ''}` : 'this month'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {monthGroups.map((group) => (
              <div key={group.key} className="overflow-hidden">
                {/* Month Group Section Header Banner */}
                <div className="px-4 sm:px-6 py-3 bg-slate-50/90 border-y border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm sm:text-base">
                      {group.title}
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-bold shadow-2xs">
                      {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2 font-medium hidden sm:inline">Monthly Subtotal:</span>
                    <span className="font-extrabold text-rose-600 text-sm sm:text-base">
                      ₹{group.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Description & Merchant</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Payment Method</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {group.items.map((expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium text-xs sm:text-sm">
                            {formatDisplayDate(expense.expense_date)}
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
                          <td className="px-6 py-4 font-extrabold text-slate-900 text-base">
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
                  {group.items.map((expense) => (
                    <div key={expense.id} className="p-3.5 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{expense.description}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                            <span className="font-medium text-slate-600">{formatDisplayDate(expense.expense_date)}</span>
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
                          <span className="font-extrabold text-rose-600 text-sm sm:text-base">
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
              </div>
            ))}
          </div>
        )}

        {/* Table Footer with Filtered Total */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-700">
          <span>{filteredExpenses.length} transaction{filteredExpenses.length === 1 ? '' : 's'} shown</span>
          <span>View Total: <span className="text-slate-900 text-sm sm:text-base font-extrabold">₹{activeMonthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
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
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-semibold"
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
