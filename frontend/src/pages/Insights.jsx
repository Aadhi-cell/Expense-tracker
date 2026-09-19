import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { getCachedData, setCachedData } from '../utils/cache';
import {
  TrendingUp, AlertTriangle,
  ShieldCheck, ArrowRight, Lightbulb, Compass, BarChart3, RefreshCw
} from 'lucide-react';

const Insights = () => {
  const [insights, setInsights] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Interactive Anomaly Checker
  const [checkAmount, setCheckAmount] = useState('');
  const [checkCategory, setCheckCategory] = useState('Food');
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [checkingAnomaly, setCheckingAnomaly] = useState(false);

  const categories = [
    'Food', 'Travel', 'Shopping', 'Bills', 'Entertainment',
    'Healthcare', 'Groceries', 'Fitness', 'Education', 'Personal Care', 'Other'
  ];

  const fetchInsightsData = async () => {
    const cachedInsights = getCachedData('insights_data');
    const cachedPrediction = getCachedData('insights_prediction');
    if (cachedInsights && cachedPrediction) {
      setInsights(cachedInsights);
      setPrediction(cachedPrediction);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const [insightsRes, predictionRes] = await Promise.all([
        api.get('/ai/insights'),
        api.post('/ai/predict-expenses')
      ]);
      const insData = insightsRes.data.insights || [];
      const predData = predictionRes.data;
      setInsights(insData);
      setPrediction(predData);
      setCachedData('insights_data', insData, 300);
      setCachedData('insights_prediction', predData, 300);
    } catch (error) {
      console.error("Failed to fetch insights", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
  }, []);


  const handleTestAnomaly = async (e) => {
    e.preventDefault();
    if (!checkAmount) return;
    setCheckingAnomaly(true);
    try {
      const res = await api.post('/ai/detect-anomalies', {
        amount: parseFloat(checkAmount),
        category: checkCategory
      });
      setAnomalyResult(res.data);
    } catch (error) {
      console.error("Anomaly check failed", error);
    } finally {
      setCheckingAnomaly(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
            <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
            Financial Intelligence & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Statistical forecasts, anomaly checks, and data-driven financial trends.</p>
        </div>
        <button
          onClick={fetchInsightsData}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Analytics
        </button>
      </header>

      {/* Top Banner: ML Prediction Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-lg border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-center">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-1.5 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Monthly Expense Forecast
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-snug">
              Next Month Expense Forecast: <span className="text-emerald-400 block sm:inline">₹{prediction ? prediction.predicted_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---'}</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 sm:mt-2 max-w-xl">
              Calculated from your historical monthly transaction series and moving trend analysis.
            </p>
            {prediction && prediction.factors && prediction.factors.length > 0 && (
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                {prediction.factors.map((factor, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 text-[11px] sm:text-xs bg-white/10 text-indigo-200 px-2.5 py-1 rounded-full border border-white/10">
                    <BarChart3 className="h-3 w-3" />
                    {factor}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between">
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Forecast Engine</span>
            <div className="flex items-center gap-2 mt-1.5">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400 shrink-0" />
              <span className="text-sm sm:text-lg font-bold text-white">Statistical Trend Engine</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5">
              Continuously recalculates averages as you log additional transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Insights List + Anomaly Detector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Dynamic Financial Insights List */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xs border border-slate-100 lg:col-span-2 flex flex-col">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Personalized Financial Findings</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Generated dynamically from your actual ledger entries</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 sm:p-12 text-center text-slate-400 text-xs sm:text-sm">Synthesizing insights...</div>
          ) : insights.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-slate-400 text-xs sm:text-sm">
              No insights found. Log your income and expenses to unlock actionable advice!
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {insights.map((insight, idx) => {
                let cardStyle = "bg-slate-50 border-slate-200 text-slate-800";
                if (insight.includes('⚠️') || insight.includes('Exceeded') || insight.includes('Warning')) {
                  cardStyle = "bg-amber-50/70 border-amber-200 text-amber-900";
                } else if (insight.includes('🌟') || insight.includes('Great job') || insight.includes('decreased')) {
                  cardStyle = "bg-emerald-50/70 border-emerald-200 text-emerald-900";
                } else if (insight.includes('🚨') || insight.includes('Deficit')) {
                  cardStyle = "bg-red-50/70 border-red-200 text-red-900";
                }

                return (
                  <div
                    key={idx}
                    className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-start gap-2.5 sm:gap-3 transition-all hover:shadow-xs ${cardStyle}`}
                  >
                    <Compass className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 shrink-0 opacity-75" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interactive Anomaly Detection Scanner */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Spending Anomaly Scanner</h2>
                <p className="text-xs text-slate-400">Test if an expense deviates from your normal patterns</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter an expense amount to evaluate standard deviation z-scores against your category history.
            </p>

            <form onSubmit={handleTestAnomaly} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={checkAmount}
                  onChange={(e) => setCheckAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={checkCategory}
                  onChange={(e) => setCheckCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={checkingAnomaly || !checkAmount}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {checkingAnomaly ? 'Analyzing...' : 'Scan for Anomaly'}
              </button>
            </form>

            {/* Anomaly Result Card */}
            {anomalyResult && (
              <div className={`mt-4 p-4 rounded-xl border text-xs animate-in fade-in duration-150 ${anomalyResult.is_anomaly
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {anomalyResult.is_anomaly ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span>Unusual Spending Pattern Flagged</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Normal Spending Pattern</span>
                    </>
                  )}
                </div>
                <p className="mt-1 leading-relaxed">{anomalyResult.explanation}</p>
                <div className="mt-2 text-[11px] text-slate-500">
                  Anomaly Score: {(anomalyResult.anomaly_score * 100).toFixed(0)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
