import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HardHat, Users, ClipboardList, AlertTriangle, ShieldCheck, LayoutDashboard, UserPlus } from 'lucide-react';

export function AppHeader() {
  const navigate = useNavigate();
  const navItems = [
    { path: '/', label: '晨会看板', icon: LayoutDashboard },
    { path: '/meeting/create', label: '创建晨会', icon: ClipboardList },
    { path: '/meeting/signin', label: '工人签到', icon: UserPlus },
    { path: '/hazard', label: '隐患登记', icon: AlertTriangle },
    { path: '/briefing', label: '专项交底', icon: ShieldCheck },
    { path: '/team', label: '班组管理', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#1E3A5F] text-white shadow-lg border-b-4 border-[#F59E0B]">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-lg bg-[#F59E0B] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <HardHat className="w-7 h-7 text-[#1E3A5F]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">工地安全晨会看板</h1>
              <p className="text-xs text-slate-300">管住签到 · 管住作业 · 管住异常</p>
            </div>
          </Link>
          <div className="text-right">
            <p className="text-sm font-mono text-[#F59E0B]">{new Date().toLocaleDateString('zh-CN')}</p>
            <p className="text-xs text-slate-300">{new Date().toLocaleDateString('zh-CN', { weekday: 'long' })}</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 flex-wrap">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => navigate(path)}
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-[#F59E0B] text-[#1E3A5F] shadow-md'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
