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
  { href: "/vendedores", label: "Vendedores", icon: Users },
  { href: "/canais", label: "Canais", icon: BarChart3 },
  { href: "/ia", label: "IA/SDR", icon: Bot },
  { href: "/perdas", label: "Perdas", icon: XCircle },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col"
      style={{
        background: "linear-gradient(180deg, #0A0C10 0%, #0D0F15 100%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Logo area ── */}
      <div
        className="flex h-20 items-center gap-3 px-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.webp"
          alt="Motocor Logo"
          style={{ height: "36px", width: "auto", objectFit: "contain" }}
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 px-3 py-5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
              style={{
                background: isActive
                  ? "linear-gradient(90deg, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.04) 100%)"
                  : "transparent",
                color: isActive ? "#fff" : "#6b7280",
                borderLeft: isActive
                  ? "2px solid #8b5cf6"
                  : "2px solid transparent",
                boxShadow: isActive
                  ? "0 0 20px rgba(139,92,246,0.12) inset"
                  : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0 transition-colors"
                style={{ color: isActive ? "#8b5cf6" : "inherit" }}
              />
              <span className="tracking-wide">{item.label}</span>

              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: "#8b5cf6",
                    boxShadow: "0 0 6px #8b5cf6",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-3 px-1">
          {/* Status dot */}
          <div className="relative">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: "#00FF87",
                boxShadow: "0 0 8px #00FF87",
              }}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-300">Dashboard Comercial</p>
            <p
              className="text-[10px] font-mono uppercase tracking-widest mt-0.5"
              style={{ color: "#444" }}
            >
              v0.1 · Live
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            document.cookie = "auth_token=; path=/; max-age=0";
            window.location.href = "/login";
          }}
          className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Sair"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
