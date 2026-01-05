/**
 * MobileLayout - Main layout wrapper for mobile app
 *
 * Provides:
 * - Mobile header with hamburger menu and project selector
 * - Safe area support for notched devices
 * - Bottom navigation bar
 * - Offline indicator
 * - Quick action FAB
 */

import { useState, type ReactNode } from 'react';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MobileOfflineIndicator } from '../../components/mobile/MobileOfflineIndicator';

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Offline status indicator */}
      <MobileOfflineIndicator />

      {/* Mobile header */}
      <MobileHeader onMenuClick={() => setIsDrawerOpen(true)} />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overscroll-contain pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav onMoreClick={() => setIsDrawerOpen(true)} />

      {/* Navigation drawer */}
      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}

export default MobileLayout;
