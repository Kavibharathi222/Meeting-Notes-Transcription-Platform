"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme, useToast, useMobileMenu } from "./Providers";
import { 
  BarChart2, 
  Settings, 
  Plug, 
  Sun, 
  Moon, 
  Folder,
  Search,
  Sparkles,
  Zap,
  X
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { isMobileMenuOpen, setMobileMenuOpen } = useMobileMenu();

  const navItems = [
    { name: "Meetings", href: "/", icon: Folder, active: pathname === "/" || pathname.startsWith("/meetings") },
    { name: "Search", href: "/?search=true", icon: Search, active: false },
    { name: "Analytics", href: "#", icon: BarChart2, active: false, badge: "Soon" },
    { name: "Integrations", href: "#", icon: Plug, active: false, badge: "Soon" },
    { name: "Settings", href: "#", icon: Settings, active: false, badge: "Soon" },
  ];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[260px] flex flex-col h-screen flex-shrink-0 transition-transform duration-300 ff-sidebar bg-background ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* ── Brand Logo ─────────────────────────────── */}
        <div className="px-5 py-5 flex items-center justify-between gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            {/* Fireflies logo grid icon */}
            <div className="relative w-9 h-9 flex-shrink-0 animate-pulse-glow rounded-lg overflow-hidden">
              <div className="absolute inset-0 ff-gradient-bg rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block ff-gradient-text">
                fireflies.ai
              </span>
              <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
                Workspace Clone
              </span>
            </div>
          </div>
          
          {/* Mobile Close button */}
          <button 
            className="md:hidden p-1.5 text-muted hover:text-foreground rounded-lg bg-muted-bg"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* ── Main Navigation ─────────────────────────── */}
      <nav className="flex px-3 py-5 space-y-0.5 overflow-y-auto flex-col">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                item.active ? "ff-nav-active" : ""
              }`}
              style={
                item.active
                  ? { color: "white" }
                  : { color: "var(--foreground-2)" }
              }
              onMouseEnter={e => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background = "var(--muted-bg)";
                  (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                }
              }}
              onMouseLeave={e => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--foreground-2)";
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className="w-4 h-4 transition-transform group-hover:scale-110"
                  style={item.active ? { color: "white" } : { color: "var(--muted)" }}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="ff-badge-outline">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Invite Bot Card ─────────────────────────── */}
      <div
        className="mx-3 mb-4 p-4 rounded-2xl text-xs relative overflow-hidden"
        style={{ background: "var(--grad-subtle)", border: "1px solid var(--border-strong)" }}
      >
        {/* decorative glow orb */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
          style={{ background: "var(--grad-brand)", opacity: 0.15, filter: "blur(16px)" }}
        />
        <div className="flex items-center gap-2 mb-2 relative">
          <div className="p-1.5 rounded-lg ff-gradient-bg">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold" style={{ color: "var(--foreground)" }}>
            Join Live Meeting
          </span>
        </div>
        <p className="leading-relaxed mb-3 relative" style={{ color: "var(--muted)" }}>
          Invite Fred the Bot to auto-record, transcribe &amp; summarize your calls.
        </p>
        <button
          onClick={() => toast("Fred the Bot integration coming soon!", "info")}
          className="ff-btn w-full py-2 rounded-xl font-bold text-sm cursor-pointer relative"
        >
          Invite Bot
        </button>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="p-4 mt-auto space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          style={{ color: "var(--foreground-2)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "var(--muted-bg)";
            (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--foreground-2)";
          }}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
            style={{ background: "var(--grad-btn)", boxShadow: "var(--shadow-glow)" }}
          >
            U
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold block truncate" style={{ color: "var(--foreground)" }}>
              Default User
            </span>
            <span className="text-xs block truncate" style={{ color: "var(--muted)" }}>
              user@workspace.ai
            </span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
