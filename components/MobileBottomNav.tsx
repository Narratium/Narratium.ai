/**
 * Mobile Bottom Navigation Component
 * 
 * This component provides a mobile-specific bottom navigation bar with the following features:
 * - Responsive mobile navigation interface
 * - Home, character cards, creator, and login/logout navigation
 * - User authentication state management
 * - Smooth transitions and hover effects
 * - Safe area handling for devices with home indicators
 * 
 * The component handles:
 * - Mobile device detection and responsive behavior
 * - User authentication state from localStorage
 * - Navigation routing and active state management
 * - Logout functionality and state clearing
 * - Responsive design adaptation
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - useRouter, usePathname: For navigation
 * - fantasy-ui.css: For styling
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useLanguage } from "@/app/i18n";
import { useAuth } from "@/hooks/useAuth";
import "@/app/styles/fantasy-ui.css";

/**
 * Interface definitions for the component's props
 */
interface MobileBottomNavProps {
  openLoginModal: () => void;
  openAccountModal?: () => void;
}

/**
 * Mobile bottom navigation component
 * 
 * Provides a mobile-specific navigation interface with:
 * - Bottom navigation bar with key app sections
 * - User authentication state management
 * - Responsive design with safe area handling
 * - Smooth animations and transitions
 * 
 * @param {MobileBottomNavProps} props - Component props
 * @returns {JSX.Element | null} The mobile bottom navigation or null on desktop
 */
export default function MobileBottomNav({ openLoginModal, openAccountModal }: MobileBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const { t, fontClass } = useLanguage();

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkIfMobile();
    
    window.addEventListener("resize", checkIfMobile);
    
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleOpenAccount = () => {
    if (openAccountModal) {
      openAccountModal();
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-[#1a1714]/95 backdrop-blur-md border-t border-[#534741]/50"></div>
      
      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-3">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ${
            isActive("/") 
              ? "text-[#f8d36a] bg-[#2a231c]/50" 
              : "text-[#a18d6f] hover:text-[#f8d36a] hover:bg-[#2a231c]/30"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className={`text-[10px] ${fontClass}`}>{t("sidebar.home")}</span>
        </Link>

        {/* Character Cards */}
        <Link
          href="/character-cards"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ${
            isActive("/character-cards") 
              ? "text-[#f8d36a] bg-[#2a231c]/50" 
              : "text-[#a18d6f] hover:text-[#f8d36a] hover:bg-[#2a231c]/30"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <span className={`text-[10px] ${fontClass}`}>{t("sidebar.characterCards")}</span>
        </Link>

        {/* Creator */}
        <Link
          href="/creator-input"
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ${
            isActive("/creator-input") 
              ? "text-[#f8d36a] bg-[#2a231c]/50" 
              : "text-[#a18d6f] hover:text-[#f8d36a] hover:bg-[#2a231c]/30"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              <path d="M12 2v1" />
              <path d="M3.05 11.05l.76.76" />
              <path d="M20.95 11.05l-.76.76" />
            </svg>
          </div>
          <span className={`text-[10px] ${fontClass}`}>{t("sidebar.creator")}</span>
        </Link>

        {/* Login/User */}
        <button
          onClick={isAuthenticated ? handleOpenAccount : openLoginModal}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ${
            isAuthenticated 
              ? "text-[#f8d36a] hover:bg-[#2a231c]/30" 
              : "text-[#a18d6f] hover:text-[#f8d36a] hover:bg-[#2a231c]/30"
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center mb-1">
            {isAuthenticated ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            )}
          </div>
          <span className={`text-[10px] ${fontClass}`}>
            {isAuthenticated ? t("sidebar.openAccount") : t("sidebar.nologin")}
          </span>
        </button>
      </div>

      {/* Bottom safe area for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-[#1a1714]/95 mobile-bottom-nav"></div>
    </div>
  );
} 
