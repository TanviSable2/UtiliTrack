import { NavLink, useNavigate } from "react-router-dom";
import {
  IconLayoutDashboard, IconBuilding, IconDoor, IconUsers,
  IconGauge, IconFileInvoice, IconCreditCard, IconMessageReport,
  IconAdjustmentsHorizontal, IconCalendarStats, IconLogout,
} from "@tabler/icons-react";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../../utils/helpers";
import toast from "react-hot-toast";

function UtiliLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="white" />
      <path d="M16 4 L6 11 L6 28 L12 28 L12 21 L20 21 L20 28 L26 28 L26 11 Z" fill="#1e3a5f" />
      <rect x="12" y="21" width="8" height="7" rx="1" fill="#1e3a5f" />
    </svg>
  );
}

const adminNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard",        icon: IconLayoutDashboard, to: "/admin/dashboard" },
      { label: "Billing calendar", icon: IconCalendarStats,   to: "/admin/calendar"  },
    ],
  },
  {
    group: "Properties",
    items: [
      { label: "Buildings", icon: IconBuilding, to: "/admin/buildings" },
      { label: "Units",     icon: IconDoor,     to: "/admin/units"     },
      { label: "Tenants",   icon: IconUsers,    to: "/admin/tenants"   },
    ],
  },
  {
    group: "Billing",
    items: [
      { label: "Meter readings", icon: IconGauge,                to: "/admin/meters"   },
      { label: "Bills",          icon: IconFileInvoice,          to: "/admin/bills"    },
      { label: "Payments",       icon: IconCreditCard,           to: "/admin/payments" },
      { label: "Disputes",       icon: IconMessageReport,        to: "/admin/disputes" },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Utility rates", icon: IconAdjustmentsHorizontal, to: "/admin/rates" },
    ],
  },
];

export default function Sidebar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
    toast.success("Signed out");
    navigate("/login");
  }

  return (
    <aside
      className="w-52 bg-navy-700 flex flex-col flex-shrink-0"
      style={{ height: "100vh", position: "sticky", top: 0 }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2.5 flex-shrink-0">
        <UtiliLogo />
        <div>
          <p className="text-sm font-medium text-white leading-none">UtiliTrack</p>
          <p className="text-2xs text-navy-300 mt-0.5">Billing system</p>
        </div>
      </div>

      {/* Nav — scrollable if content overflows */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {adminNav.map((group) => (
          <div key={group.group} className="mb-1">
            <p className="text-2xs font-medium text-navy-400 uppercase tracking-widest px-4 py-2">
              {group.group}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors border-l-2
                  ${isActive
                    ? "text-white bg-white/10 border-blue-400"
                    : "text-navy-300 border-transparent hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer — always visible at bottom */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center text-2xs font-medium text-white flex-shrink-0">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-2xs text-navy-400 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-navy-400 hover:text-white transition-colors w-full py-1"
        >
          <IconLogout size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}