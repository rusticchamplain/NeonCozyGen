import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold tracking-tight text-white">
      CG
    </div>
    <div className="leading-tight">
      <div className="text-sm font-semibold tracking-[0.25em] uppercase text-white">
        CozyGen
      </div>
      <div className="text-[11px] text-white/50">ComfyUI companion</div>
    </div>
  </div>
);

const navLinks = [
  { to: '/', label: 'Studio', end: true },
  { to: '/gallery', label: 'Gallery' },
  { to: '/presets', label: 'Presets' },
  { to: '/prompts', label: 'Prompts' },
  { to: '/aliases', label: 'Aliases' },
];

const HeaderLink = ({ to, end, children }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      [
        'inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase transition-colors',
        isActive ? 'text-white' : 'text-white/50 hover:text-white',
      ].join(' ')
    }
  >
    <span className="inline-flex items-center gap-2">
      <span className="h-1 w-1 rounded-full bg-current opacity-70" />
      {children}
    </span>
  </NavLink>
);

const Layout = () => {
  return (
    <div className="min-h-screen text-white bg-[#050716] overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_55%)]" />
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050716]/85 backdrop-blur-sm">
        <nav className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <HeaderLink key={link.to} to={link.to} end={link.end}>
                {link.label}
              </HeaderLink>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/gallery"
              className="md:hidden text-[11px] tracking-[0.18em] uppercase text-white/60"
            >
              Gallery
            </Link>
            <Link
              to="/wizard"
              className="btn-modern text-[11px] tracking-[0.18em] uppercase"
            >
              Wizard
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 pb-20">
        <div className="relative rounded-3xl border border-white/5 bg-[#060a16]/90 p-4 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
