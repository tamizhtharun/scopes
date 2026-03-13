import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Plus, LogOut, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || 'User');
      } else {
        navigate('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[var(--color-border)] flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
            </div>
            <span>ScopeAI</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4">Menu</div>
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
              isActive('/') 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${isActive('/') ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/new-project"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-all ${
              isActive('/new-project') 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Plus className={`w-5 h-5 ${isActive('/new-project') ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>New Project</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-[var(--color-border)] bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-xs">
                    {userEmail?.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm truncate max-w-[120px] text-slate-700 font-medium" title={userEmail || ''}>
                {userEmail}
                </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[var(--color-bg-primary)]">
        <div className="container py-8 max-w-7xl mx-auto px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
