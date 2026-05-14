"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/",          label: "Dashboard", emoji: "⬡" },
  { href: "/compare",   label: "Labs",      emoji: "⚔" },
  { href: "/paddock",   label: "Paddock",   emoji: "🔧" },
  { href: "/telemetry", label: "Telemetry", emoji: "📡" },
  { href: "/replay",    label: "Replay",    emoji: "▶" },
];

function LiveClock() {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
    });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!time) return null;
  return (
    <div className="hidden md:flex items-center gap-2 pl-3 border-l" style={{ borderColor: "var(--border-strong)" }}>
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
      <span className="font-mono text-[10px] font-bold tracking-widest tabular-nums whitespace-nowrap" style={{ color: "var(--text-3)" }}>
        {time}
      </span>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      {/* PITWALL logo — fixed top-left */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-4 left-4 z-[200]"
      >
        <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-xl"
          style={{
            background: "var(--nav-bg)",
            borderColor: "var(--border)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
          }}
        >
          <div className="w-1 h-5 rounded-full shrink-0" style={{ background: "#E10600", boxShadow: "0 0 12px #E10600" }} suppressHydrationWarning />
          <span className="text-sm font-black italic tracking-tighter uppercase" style={{ color: "var(--text)" }} suppressHydrationWarning>
            PIT<span style={{ color: "#E10600" }} suppressHydrationWarning>WALL</span>
          </span>
        </Link>
      </motion.div>

      {/* Main nav pill — centered, links only */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed top-4 left-1/2 z-[200] flex items-center gap-1 px-2 py-2 rounded-full border shadow-2xl"
        style={{
          transform: "translateX(-50%)",
          maxWidth: "calc(100vw - 10rem)",
          background: "var(--nav-bg)",
          borderColor: "var(--border)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
        }}
        suppressHydrationWarning
      >
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map(link => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap"
                style={{
                  background: active ? "#E10600" : "transparent",
                  color:      active ? "#fff"    : "var(--text-2)",
                  boxShadow:  active ? "0 0 18px rgba(225,6,0,0.45)" : "none",
                }}
                suppressHydrationWarning
              >
                {link.label}
              </Link>
            );
          })}
          <LiveClock />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full ml-1 shrink-0 transition-all"
          style={{
            background: open ? "#E10600" : "var(--card)",
            color: open ? "#fff" : "var(--text-2)",
            border: "1px solid var(--border)",
          }}
          suppressHydrationWarning
        >
          {open ? <X size={14} /> : <Menu size={14} />}
        </button>
      </motion.nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[198] md:hidden"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setOpen(false)}
            />
            {/* Menu panel */}
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed top-[4.5rem] left-4 right-4 z-[199] rounded-[1.75rem] border shadow-2xl overflow-hidden md:hidden"
              style={{
                background: "var(--nav-bg)",
                borderColor: "var(--border)",
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            >
              <div className="p-3 flex flex-col gap-1">
                {LINKS.map(link => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all"
                      style={{
                        background: active ? "#E10600" : "transparent",
                        color:      active ? "#fff"    : "var(--text-2)",
                      }}
                    >
                      <span className="text-base">{link.emoji}</span>
                      <span className="text-[13px] font-black uppercase tracking-widest">{link.label}</span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                    </Link>
                  );
                })}
              </div>
              {/* Footer in menu */}
              <div className="px-5 py-3 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
                  PITWALL · F1 Analytics
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
