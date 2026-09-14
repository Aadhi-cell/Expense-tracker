import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, PieChart, Target, 
  LogOut, Wallet, BarChart3, TrendingUp, Menu, X, MoreHorizontal
} from 'lucide-react';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Financial Insights', path: '/insights', icon: BarChart3 },
  ];

  // Primary bottom navigation items for mobile
  const bottomNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Budgets', path: '/budgets', icon: PieChart },
  ];

  const isMoreActive = location.pathname.startsWith('/goals') || location.pathname.startsWith('/insights');

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between z-30 shrink-0 sticky top-0 shadow-xs">
        <Link to="/" className="text-base font-bold text-primary-600 flex items-center gap-2">
          <div className="p-1.5 bg-primary-50 rounded-lg">
            <Wallet className="h-5 w-5 text-primary-600" />
          </div>
          <span className="tracking-tight text-slate-900 font-extrabold">Expense<span className="text-primary-600">Tracker</span></span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/insights"
            className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Financial Insights"
          >
            <BarChart3 className="h-5 w-5 text-primary-600" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over / Overlay Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-[280px] max-w-[80vw] bg-white h-full shadow-2xl flex flex-col p-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-50 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">ExpenseTracker</h3>
                  <p className="text-[11px] text-slate-400">Personal Finance</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="py-4 space-y-1 flex-1 overflow-y-auto">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
                Navigation
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-600" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-primary-600 flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            ExpenseTracker
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Personal Finance & Budgeting</p>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 pb-24 md:pb-8">
        <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (App Feel) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive 
                  ? 'text-primary-600 font-semibold' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            isMoreActive 
              ? 'text-primary-600 font-semibold' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg transition-transform ${isMoreActive ? 'scale-110' : ''}`}>
            <MoreHorizontal className={`h-5 w-5 ${isMoreActive ? 'text-primary-600' : 'text-slate-400'}`} />
          </div>
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </div>
  );
};

export default MainLayout;
