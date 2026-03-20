import React from 'react';
import { Home, Cloud, MessageCircle, Activity, Leaf, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'weather', icon: Cloud, label: 'Weather' },
    { id: 'chat', icon: Leaf, label: 'AI Assistant', primary: true },
    { id: 'sensors', icon: Activity, label: 'Sensors' },
    { id: 'scan', icon: ImageIcon, label: 'Scan' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tabId);
    }
  };

  return (
    <nav 
      role="navigation" 
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 pb-8 z-50 flex items-center justify-between safe-area-bottom"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.primary) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className="relative -top-8 bg-emerald-600 text-white p-4 rounded-full shadow-xl shadow-emerald-600/40 active:scale-95 transition-transform focus:outline-none focus:ring-4 focus:ring-emerald-300"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={0}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300 rounded",
              isActive ? "text-emerald-600" : "text-black/40"
            )}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            tabIndex={0}
          >
            <Icon className={cn("w-5 h-5", isActive && "fill-emerald-600/10")} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
