/**
 * Main layout component for the Narratium application
 * 
 * This component provides the core layout structure including:
 * - Responsive sidebar navigation
 * - Model settings sidebar
 * - Login modal integration
 * - Settings dropdown
 * - Mobile responsiveness handling
 * - Mobile bottom navigation
 * 
 * The layout uses a fantasy-themed UI with dynamic sidebar states
 * and responsive design considerations.
 * 
 * Dependencies:
 * - Sidebar: Main navigation component
 * - ModelSidebar: Model settings panel
 * - SettingsDropdown: Global settings menu
 * - LoginModal: Authentication modal
 * - MobileBottomNav: Mobile bottom navigation
 */

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ModelSidebar from "@/components/ModelSidebar";
import SettingsDropdown from "@/components/SettingsDropdown";
import LoginModal from "@/components/LoginModal";
import MobileBottomNav from "@/components/MobileBottomNav";
import "@/app/styles/fantasy-ui.css";

/**
 * Main layout wrapper component that manages the application's core structure
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be rendered in the main content area
 * @returns {JSX.Element} The complete layout structure with sidebars and content area
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelSidebarOpen, setModelSidebarOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    
    window.addEventListener("resize", checkIfMobile);
    
    // Handle closing model sidebar when character sidebar opens on mobile
    const handleCloseModelSidebar = () => {
      setModelSidebarOpen(false);
    };

    window.addEventListener("closeModelSidebar", handleCloseModelSidebar);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
      window.removeEventListener("closeModelSidebar", handleCloseModelSidebar);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleModelSidebar = () => {
    const newModelSidebarState = !modelSidebarOpen;
    setModelSidebarOpen(newModelSidebarState);
    
    // On mobile, when opening ModelSidebar, close CharacterSidebar to prevent conflicts
    if (isMobile && newModelSidebarState) {
      // Dispatch custom event to notify character page to close its sidebar
      const closeCharacterSidebarEvent = new CustomEvent("closeCharacterSidebar");
      window.dispatchEvent(closeCharacterSidebarEvent);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-full overflow-hidden fantasy-bg relative"> 
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <div className="fixed left-0 top-0 h-full z-10 hidden md:block">
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar} 
          openLoginModal={() => setIsLoginModalOpen(true)} 
        />
      </div>
      <main
        className={`flex-1 h-full overflow-auto transition-all duration-300
            ml-0 ${sidebarOpen ? "md:ml-72" : "md:ml-0"}
            ${modelSidebarOpen ? "mr-64" : "mr-0"}
            pb-20 md:pb-0
          `}
      >
        <div className="h-full relative">
          <div className={`absolute top-4 right-4 z-[999] ${isMobile && modelSidebarOpen ? "hidden" : ""}`}>
            <SettingsDropdown toggleModelSidebar={toggleModelSidebar} />
          </div>

          {children}
        </div>
      </main>

      <div className="fixed right-0 top-0 h-full z-40">
        <ModelSidebar isOpen={modelSidebarOpen} toggleSidebar={toggleModelSidebar} />
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav openLoginModal={() => setIsLoginModalOpen(true)} />
    </div>
  );
}
