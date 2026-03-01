"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Filter,
  BarChart3,
  Users,
  Bot,
  XCircle,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/funil", label: "Funil", icon: Filter },
  { href: "/canais", label: "Canais", icon: BarChart3 },
  { href: "/vendedores", label: "Vendedores", icon: Users },
  { href: "/ia", label: "IA", icon: Bot },
  { href: "/perdas", label: "Perdas", icon: XCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-950">
      <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white text-sm">
          M
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Motocor</h1>
          <p className="text-xs text-gray-500">Dashboard Comercial</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <p className="text-xs text-gray-600">Motocor Dashboard v0.1</p>
      </div>
    </aside>
  );
}
