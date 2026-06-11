import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from '@/components/common/AppHeader';
import Dashboard from '@/pages/Dashboard';
import CreateMeeting from '@/pages/CreateMeeting';
import SignIn from '@/pages/SignIn';
import Hazard from '@/pages/Hazard';
import Briefing from '@/pages/Briefing';
import TeamManage from '@/pages/TeamManage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col industrial-pattern">
        <AppHeader />
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/meeting/create" element={<CreateMeeting />} />
            <Route path="/meeting/signin" element={<SignIn />} />
            <Route path="/hazard" element={<Hazard />} />
            <Route path="/briefing" element={<Briefing />} />
            <Route path="/team" element={<TeamManage />} />
          </Routes>
        </main>
        <footer className="bg-[#1E3A5F] text-slate-300 text-xs text-center py-3 border-t-2 border-[#F59E0B]/40">
          工地安全晨会看板 · 数据本地存储 · 支持容器化部署
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
