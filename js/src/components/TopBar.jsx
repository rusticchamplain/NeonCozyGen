// js/src/components/TopBar.jsx

import React from "react";
import { Link, NavLink } from "react-router-dom";

function navLinkClasses({ isActive }) {
  return [
    'ui-button is-compact',
    isActive ? 'is-primary' : 'is-ghost',
  ].join(' ');
}

export default function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-[#050716E6] border-b border-[#3EF0FF33] backdrop-blur-md">
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    {/* Brand */}
    <Link
    to="/"
    className="flex items-center gap-2 hover:opacity-95 transition-opacity"
    >
    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[radial-gradient(circle_at_0_0,#FF60D0_0,#3EF0FF_55%,#050716_100%)] flex items-center justify-center text-[#050716] text-sm sm:text-base font-extrabold shadow-[0_0_18px_rgba(255,96,208,0.9)]">
    CG
    </div>
    <div className="flex flex-col leading-tight">
    <span className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-[#F8F4FF]">
    CozyGen
    </span>
    <span className="hidden xs:block text-[9px] sm:text-[10px] text-[#A0A4FFCC] tracking-[0.18em] uppercase">
    ComfyUI lab surface
    </span>
    </div>
    </Link>

    {/* Navigation */}
    <nav className="w-full sm:w-auto flex justify-center sm:justify-end">
    <div className="ui-toolbar flex-wrap justify-center">
    <NavLink to="/" className={navLinkClasses} end>
    Wizard
    </NavLink>
    <NavLink to="/studio" className={navLinkClasses}>
    Studio
    </NavLink>
    <NavLink to="/presets" className={navLinkClasses}>
    Presets
    </NavLink>
    <NavLink to="/gallery" className={navLinkClasses}>
    Gallery
    </NavLink>
    </div>
    </nav>
    </div>
    </header>
  );
}
