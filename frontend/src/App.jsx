import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ColdStartBanner from './components/ColdStartBanner';

// Lazy-loaded pages to make initial bundle tiny and lightning fast
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Income = lazy(() => import('./pages/Income'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Goals = lazy(() => import('./pages/Goals'));
const Insights = lazy(() => import('./pages/Insights'));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Sleek loading skeleton for route transitions
const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh] w-full">
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-12 h-12">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 animate-pulse"></div>
        <div className="w-12 h-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading experience...</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <ColdStartBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="income" element={<Income />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="goals" element={<Goals />} />
            <Route path="insights" element={<Insights />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

