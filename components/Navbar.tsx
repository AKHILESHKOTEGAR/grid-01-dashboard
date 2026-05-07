"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const LINKS = [
  { href: "/",          label: "Dashboard" },
  { href: "/compare",   label: "Labs"      },
  { href: "/paddock",   label: "Paddock"   },
  { href: "/telemetry", label: "Telemetry" },
  { href: "/replay",    label: "Replay"    },
];

function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const fmt = () => {
      const now = new Date();
      return now.toLocaleTimeString("en-GB", {
        hour:   "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    };
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "var(--border-strong)" }}>
      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
      <span className="font-mono text-[10px] font-bold tracking-widest tabular-nums whitespace-nowrap"
        style={{ color: "var(--text-3)" }}>
        {time}
      </span>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-4 left-1/2 z-[200] flex items-center gap-1 px-2 py-2 rounded-full border shadow-2xl overflow-x-auto"
      style={{
        transform: "translateX(-50%)",
        maxWidth: "calc(100vw - 1.5rem)",
        scrollbarWidth: "none",
        background: "var(--nav-bg)",
        borderColor: "var(--border)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 px-4 mr-1 group">
        <div className="w-1 h-5 rounded-full" style={{ background: "#E10600", boxShadow: "0 0 12px #E10600" }} />
        <span className="text-sm font-black italic tracking-tighter uppercase transition-colors" style={{ color: "var(--text)" }}>
          GRID<span style={{ color: "#E10600" }}>.01</span>
        </span>
      </Link>

      <div className="w-px h-5 mx-1" style={{ background: "var(--border-strong)" }} />

      {LINKS.map(link => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="relative px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap"
            style={{
              background: active ? "#E10600" : "transparent",
              color:      active ? "#fff" : "var(--text-2)",
              boxShadow:  active ? "0 0 18px rgba(225,6,0,0.45)" : "none",
            }}
          >
            {link.label}
          </Link>
        );
      })}

      <LiveClock />
    </motion.nav>
  );
}
