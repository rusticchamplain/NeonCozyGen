// js/src/App.jsx
import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import TopBar from './components/TopBar';
import MainPage from './pages/MainPage';
import Gallery from './pages/Gallery';
import Prompts from './pages/Prompts';
import PersonalizeWorkflows from './pages/PersonalizeWorkflows';
import WizardPage from './pages/WizardPage';
import Presets from './pages/Presets';

/* Scroll to top on route change */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#050716] text-[#F8F4FF]">
        <TopBar />
        <ScrollToTop />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
          <Routes>
            <Route path="/" element={<WizardPage />} />
            <Route path="/studio" element={<MainPage />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/personalize" element={<PersonalizeWorkflows />} />
            <Route path="/presets" element={<Presets />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
