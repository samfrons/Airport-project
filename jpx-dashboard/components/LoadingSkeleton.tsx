'use client';

import React from 'react';

// ─── Skeleton primitives ────────────────────────────────────────────────────

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-zinc-300/60 dark:bg-zinc-800/60 ${className}`}
      style={style}
    />
  );
}

// ─── Stats skeleton ─────────────────────────────────────────────────────────

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-zinc-800">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 p-6">
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-8 w-16 mb-5" />
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Map skeleton ───────────────────────────────────────────────────────────

export function MapSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 h-[480px] lg:h-[580px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Skeleton className="h-10 w-10 mx-auto rounded-full" />
        <Skeleton className="h-3 w-32 mx-auto" />
        <Skeleton className="h-2 w-24 mx-auto" />
      </div>
    </div>
  );
}

// ─── Table skeleton ─────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-7 w-28" />
      </div>
      {/* Header */}
      <div className="flex px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-16" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center px-5 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 gap-6"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-2 w-10" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-12" />
          </div>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// ─── Chart skeleton ─────────────────────────────────────────────────────────

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex justify-end gap-4 mb-5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="h-56 flex items-end justify-between gap-1.5 px-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Panel skeleton ─────────────────────────────────────────────────────────

export function PanelSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2 w-64" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-zinc-200/60 dark:border-zinc-800/60 px-3 py-2.5 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  sectionName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="bg-white dark:bg-zinc-900 border border-red-200/30 dark:border-red-900/30 p-6">
          <div className="text-center space-y-2">
            <div className="text-red-400 text-sm font-medium">
              {this.props.sectionName
                ? `Error loading ${this.props.sectionName}`
                : 'Something went wrong'}
            </div>
            <p className="text-[11px] text-zinc-500">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-4 py-1.5 text-[10px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
