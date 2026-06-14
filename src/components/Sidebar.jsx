import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Globe,
  Lightbulb,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales Performance', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'regions', label: 'Regions', icon: Globe },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export default function Sidebar({ activeSection, onNavigate, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-6 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-slate-900 tracking-tight">Sales Analytics</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Executive workspace</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                activeSection === id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
