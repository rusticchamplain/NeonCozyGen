import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const Logo = () => (
  <div className="flex items-center space-x-3">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="rounded-md bg-accent p-1">
      <path d="M4 12c0-4.418 3.582-8 8-8v16c-4.418 0-8-3.582-8-8z" fill="white" fillOpacity="0.9"/>
      <path d="M12 4c4.418 0 8 3.582 8 8s-3.582 8-8 8V4z" fill="black" fillOpacity="0.06"/>
    </svg>
    <div>
      <div className="text-lg font-semibold">CozyGen</div>
      <div className="text-xs small-muted">Local ComfyUI frontend</div>
    </div>
  </div>
);

const Layout = () => {
    return (
        <div className="min-h-screen font-sans">
            <header className="bg-base-200/60 backdrop-blur-sm shadow sticky top-0 z-50">
                <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center">
                        <Logo />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <NavLink 
                            to="/" 
                            className={({ isActive }) => 
                                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-base-300'}`
                            }
                        >
                            Generate
                        </NavLink>
                        <NavLink 
                            to="/gallery" 
                            className={({ isActive }) => 
                                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-base-300'}`
                            }
                        >
                            Gallery
                        </NavLink>
                        <NavLink 
                            to="/prompts" 
                            className={({ isActive }) => 
                                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-base-300'}`
                            }
                        >
                            Prompts
                        </NavLink>
                        <NavLink 
                            to="/aliases" 
                            className={({ isActive }) => 
                                `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-accent text-white' : 'text-gray-300 hover:bg-base-300'}`
                            }
                        >
                            Aliases
                        </NavLink>
                    </div>
                </nav>
            </header>
            <main className="container mx-auto p-4">
                <div className="card">
                  <Outlet />
                </div>
            </main>
        </div>
    );
}

export default Layout;
