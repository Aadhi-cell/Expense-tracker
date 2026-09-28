import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { getCachedData, setCachedData, invalidateCache } from '../utils/cache';
import { Target, Plus, Minus, Trash2, Edit2, CheckCircle2, TrendingUp, Calendar, X, Laptop, Plane, ShieldCheck, Bike, Gift } from 'lucide-react';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributeMode, setContributeMode] = useState('add'); // 'add' or 'withdraw'
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contributionAmount, setContributionAmount] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    current_amount: '0',
    target_date: ''
  });

  const fetchGoals = async () => {
    const cached = getCachedData('goals_list');
    if (cached) {
      setGoals(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get('/goals/');
      setGoals(res.data);
      setCachedData('goals_list', res.data, 180);
    } catch (error) {
      console.error("Failed to fetch financial goals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await api.delete(`/goals/${id}`);
        invalidateCache('goals');
        setGoals(goals.filter(g => g.id !== id));
      } catch (error) {
        console.error("Failed to delete goal", error);
      }
    }
  };


  const openAddModal = () => {
    setSelectedGoal(null);
    setFormData({
      name: '',
      target_amount: '',
      current_amount: '0',
      target_date: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (goal) => {
    setSelectedGoal(goal);
    setFormData({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount || 0,
      target_date: goal.target_date || ''
    });
    setIsModalOpen(true);
  };

  const openContributeModal = (goal, mode = 'add') => {
    setSelectedGoal(goal);
    setContributeMode(mode);
    setContributionAmount('');
    setIsContributeModalOpen(true);
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount || 0),
        target_date: formData.target_date || null
      };

      if (selectedGoal) {
        await api.put(`/goals/${selectedGoal.id}`, payload);
      } else {
        await api.post('/goals/', payload);
      }
      invalidateCache('goals');
      setIsModalOpen(false);
      fetchGoals();
    } catch (error) {
      console.error("Failed to save goal", error);
      alert("Failed to save goal.");
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !contributionAmount) return;
    const amountNum = parseFloat(contributionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    if (contributeMode === 'withdraw' && amountNum > (selectedGoal.current_amount || 0)) {
      alert(`Cannot withdraw more than current savings (₹${(selectedGoal.current_amount || 0).toLocaleString('en-IN')})`);
      return;
    }

    try {
      if (contributeMode === 'withdraw') {
        try {
          await api.post(`/goals/${selectedGoal.id}/withdraw?amount=${amountNum}`);
        } catch (err) {
          if (err.response?.status === 404 || err.response?.status === 405) {
            // Graceful fallback while Render backend is redeploying
            const newAmount = Math.max(0, (selectedGoal.current_amount || 0) - amountNum);
            await api.put(`/goals/${selectedGoal.id}`, { current_amount: newAmount });
          } else {
            throw err;
          }
        }
      } else {
        await api.post(`/goals/${selectedGoal.id}/contribute?amount=${amountNum}`);
      }
      invalidateCache('goals');
      setIsContributeModalOpen(false);
      fetchGoals();
    } catch (error) {
      console.error(`Failed to ${contributeMode} savings`, error);
      const msg = error.response?.data?.detail || `Failed to ${contributeMode === 'withdraw' ? 'withdraw' : 'add'} savings.`;
      alert(msg);
    }
  };

  const getGoalIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('laptop') || lower.includes('mac') || lower.includes('pc')) return <Laptop className="h-6 w-6 text-blue-600" />;
    if (lower.includes('bike') || lower.includes('car') || lower.includes('vehicle')) return <Bike className="h-6 w-6 text-amber-600" />;
    if (lower.includes('vacation') || lower.includes('trip') || lower.includes('travel')) return <Plane className="h-6 w-6 text-purple-600" />;
    if (lower.includes('emergency') || lower.includes('fund') || lower.includes('health')) return <ShieldCheck className="h-6 w-6 text-emerald-600" />;
    return <Gift className="h-6 w-6 text-primary-600" />;
  };

  const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const completedGoals = goals.filter(g => (g.current_amount || 0) >= g.target_amount).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Financial Goals</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Set milestones, allocate savings, and watch your dreams become reality.</p>
        </div>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow transition-all"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-primary-50 rounded-xl text-primary-600 shrink-0">
            <Target className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Savings Goals</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 sm:mt-1">₹{totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Accumulated Savings</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5 sm:mt-1">
              ₹{totalSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-400 ml-1.5">({overallProgress}%)</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Targets</p>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-600 mt-0.5 sm:mt-1">{completedGoals} of {goals.length} Goals</p>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 text-sm">
          Loading your financial goals...
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
          <Target className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800">No Financial Goals Created Yet</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 mb-5 max-w-sm mx-auto">
            Create goals for a New Laptop, Bike, Vacation, or an Emergency Fund to keep your savings organized.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-xs"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {goals.map((g) => {
            const current = g.current_amount || 0;
            const target = g.target_amount;
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const remaining = Math.max(0, target - current);
            const isCompleted = current >= target;

            // Target date calculation
            let dateText = "No target date";
            if (g.target_date) {
              const targetDate = new Date(g.target_date);
              const today = new Date();
              const diffTime = targetDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (isCompleted) {
                dateText = "Goal Achieved! 🎉";
              } else if (diffDays > 0) {
                dateText = `${diffDays}d left (${targetDate.toLocaleDateString(undefined, { month: 'short' })})`;
              } else {
                dateText = `Passed on ${targetDate.toLocaleDateString()}`;
              }
            }

            return (
              <div key={g.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-100 rounded-xl shrink-0">
                        {getGoalIcon(g.name)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight">{g.name}</h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dateText}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Achieved
                      </span>
                    )}
                  </div>

                  <div className="mt-3 mb-1.5 flex justify-between items-baseline">
                    <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      ₹{current.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Target: ₹{target.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-primary-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-500 mb-4">
                    <span>{pct}% Completed</span>
                    <span className="truncate ml-1">{isCompleted ? 'Fully Funded' : `₹${remaining.toLocaleString('en-IN')} to go`}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-1 sm:gap-2 flex-wrap">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <button
                      onClick={() => openContributeModal(g, 'add')}
                      disabled={isCompleted}
                      className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Add Savings"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Savings
                    </button>

                    {(g.current_amount || 0) > 0 && (
                      <button
                        onClick={() => openContributeModal(g, 'withdraw')}
                        className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Withdraw / Remove Savings"
                      >
                        <Minus className="h-3.5 w-3.5" />
                        Withdraw
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(g)}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Edit Goal"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                {selectedGoal ? 'Edit Goal' : 'Create Financial Goal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="e.g. MacBook Pro, Emergency Fund, Bali Trip"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="e.g. 150000"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Initial Saved Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.current_amount}
                  onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
                  placeholder="e.g. 25000"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Target Date (Optional)</label>
                <input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-xs sm:text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  {selectedGoal ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute / Add or Withdraw Funds Modal */}
      {isContributeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {contributeMode === 'withdraw' ? 'Withdraw Savings' : 'Add Savings'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  {contributeMode === 'withdraw' ? 'Deducting from' : 'Contributing to'} {selectedGoal?.name}
                </p>
              </div>
              <button
                onClick={() => setIsContributeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab switch between Add and Withdraw */}
            <div className="px-4 sm:px-5 pt-4">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setContributeMode('add'); setContributionAmount(''); }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    contributeMode === 'add'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Savings
                </button>
                <button
                  type="button"
                  onClick={() => { setContributeMode('withdraw'); setContributionAmount(''); }}
                  className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    contributeMode === 'withdraw'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Minus className="h-3.5 w-3.5" />
                  Withdraw
                </button>
              </div>
            </div>

            <form onSubmit={handleContribute} className="p-4 sm:p-5 pt-3 space-y-3 sm:space-y-4">
              {/* Context Summary Banner */}
              {contributeMode === 'withdraw' ? (
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-rose-800 flex justify-between items-center">
                  <span className="font-medium">Currently Saved:</span>
                  <span className="font-extrabold text-sm text-rose-900">
                    ₹{(selectedGoal?.current_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ) : (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 flex justify-between items-center">
                  <span className="font-medium">Remaining to Goal:</span>
                  <span className="font-extrabold text-sm text-emerald-900">
                    ₹{Math.max(0, (selectedGoal?.target_amount || 0) - (selectedGoal?.current_amount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                  {contributeMode === 'withdraw' ? 'Amount to Withdraw / Remove (₹)' : 'Amount to Add (₹)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={contributeMode === 'withdraw' ? (selectedGoal?.current_amount || 0) : undefined}
                    required
                    autoFocus
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-bold text-slate-800"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>

              {/* Quick presets */}
              {contributeMode === 'withdraw' ? (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Quick Withdraw:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '25%', frac: 0.25 },
                      { label: '50%', frac: 0.5 },
                      { label: '75%', frac: 0.75 },
                      { label: 'All', frac: 1.0 }
                    ].map(({ label, frac }) => {
                      const val = Math.floor((selectedGoal?.current_amount || 0) * frac);
                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={!selectedGoal?.current_amount || selectedGoal.current_amount <= 0}
                          onClick={() => setContributionAmount(val.toString())}
                          className="py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Quick Add:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setContributionAmount(amt.toString())}
                        className="py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        +₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContributeModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs sm:text-sm text-white font-semibold rounded-xl transition-colors shadow-xs cursor-pointer ${
                    contributeMode === 'withdraw'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {contributeMode === 'withdraw' ? 'Withdraw Funds' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
