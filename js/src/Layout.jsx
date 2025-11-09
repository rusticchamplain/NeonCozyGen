import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="relative inline-flex h-9 w-9 items-center justify-center">
      {/* Outer neon ring */}
      <div className="absolute inset-0 rounded-2xl border border-[#3EF0FF80] shadow-[0_0_18px_rgba(62,240,255,0.65)]" />
      {/* Inner glyph */}
      <div className="relative h-7 w-7 rounded-2xl bg-[radial-gradient(circle_at_30%_0,#FF60D0_0,#1B0B2E_40%,#050716_100%)] flex items-center justify-center">
        <span className="text-[15px] font-black tracking-tight text-[#EAF5FF]">
          CG
        </span>
      </div>
    </div>
    <div className="leading-tight">
      <div className="text-sm sm:text-base font-semibold tracking-[0.14em] uppercase text-[#F8F4FF]">
        CozyGen
      </div>
      <div className="text-[10px] sm:text-[11px] text-[#9CA4FF] tracking-[0.16em] uppercase">
        Synth-wave Studio
      </div>
    </div>
  </div>
);

const linkBase =
  'relative px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium tracking-[0.14em] uppercase transition-colors duration-150';
const activeClasses =
  'text-[#050716]';
const inactiveClasses =
  'text-[#C3C7FFB3] hover:text-[#F8F4FF]';

const NeonNavLink = ({ to, end, children, className }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      [
        linkBase,
        className || '',
        isActive ? activeClasses : inactiveClasses,
      ].join(' ')
    }
  >
    {({ isActive }) => (
      <span className="relative inline-flex items-center">
        {isActive && (
          <span className="absolute -inset-1 rounded-full bg-[radial-gradient(circle_at_0_0,#FF60D0_0,#3EF0FF_45%,#3EF0FF00_70%)] opacity-90 shadow-[0_0_22px_rgba(255,96,208,0.9)]" />
        )}
        <span
          className={[
            'relative z-[1] px-2 py-0.5 rounded-full',
            isActive
              ? 'bg-[#3EF0FF] text-[#050716]'
              : '',
          ].join(' ')}
        >
          {children}
        </span>
      </span>
    )}
  </NavLink>
);

const Layout = () => {
  return (
    <div className="min-h-screen text-[#F8F4FF] bg-[#050716] overflow-x-hidden">
      {/* Big synth-wave background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_#3D1B78_0,_#050716_40%,_#020308_100%)]" />
      {/* Subtle scanline / noise overlay */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.08] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:100%_3px]" />

      {/* Top marquee header */}
      <header className="sticky top-0 z-40 border-b border-[#3EF0FF33] bg-[#050716E6] backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right mr-1">
              <span className="text-[9px] font-medium tracking-[0.18em] uppercase text-[#8B93FFCC]">
                Render Queue
              </span>
              <span className="text-[9px] tracking-[0.16em] uppercase text-[#3EF0FFCC]">
                Online
              </span>
            </div>

            <div className="inline-flex items-center rounded-full border border-[#3EF0FF40] bg-[#050716CC] shadow-[0_0_18px_rgba(8,217,255,0.35)] px-1.5 py-1">
              <NeonNavLink to="/" end>
                Generate
              </NeonNavLink>
              <NeonNavLink to="/gallery">
                Gallery
              </NeonNavLink>
              <NeonNavLink to="/prompts" className="hidden sm:inline-block">
                Prompts
              </NeonNavLink>
              <NeonNavLink to="/aliases" className="hidden sm:inline-block">
                Aliases
              </NeonNavLink>
            </div>
          </div>
        </nav>
      </header>

      {/* Studio canvas */}
      <main className="max-w-7xl mx-auto px-3 sm:px-5 py-4 pb-24">
        <div className="relative rounded-[26px] border border-[#3EF0FF33] bg-[#050716F2] shadow-[0_0_40px_rgba(12,248,255,0.18)]">
          {/* inner gradient edge */}
          <div className="pointer-events-none absolute inset-px rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(255,96,208,0.18)_0,transparent_55%)] opacity-80" />
          <div className="relative p-3 sm:p-4 md:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
