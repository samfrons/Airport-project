'use client';

import Link from 'next/link';
import { ArrowLeft, TowerControl } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AirportDiagram } from '@/components/airport-diagram';

export default function AirportDiagramPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-transparent">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft size={16} />
                <span className="text-xs font-medium">Dashboard</span>
              </Link>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-blue-600 p-2 hidden sm:block">
                <TowerControl className="text-white" size={18} strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  Airport Diagram
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-500">
                  KJPX / East Hampton Town Airport
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">
        <AirportDiagram className="h-[calc(100vh-140px)] min-h-[500px]" />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/60 mt-auto">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-wider">
            <p>Based on FAA Airport Diagram</p>
            <p>For reference only - not for navigation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
