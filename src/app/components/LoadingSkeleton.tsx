import { motion } from 'motion/react';

export function LoadingSkeleton() {
  return (
    <div className="space-y-8 py-8 pb-20">
      {/* Trust Score Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-64 rounded-2xl border border-border/50 bg-card p-8"
      >
        <div className="flex h-full flex-col items-center justify-center space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-24 w-32 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-6 w-32 animate-pulse rounded-lg bg-muted/50" />
        </div>
      </motion.div>

      {/* Cards Grid Skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-96 rounded-2xl border border-border/50 bg-card p-6"
          >
            <div className="mb-6 h-6 w-40 animate-pulse rounded-lg bg-muted/50" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-16 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full Width Card Skeleton */}
      <div className="h-80 rounded-2xl border border-border/50 bg-card p-6">
        <div className="mb-6 h-6 w-40 animate-pulse rounded-lg bg-muted/50" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 animate-pulse rounded-lg bg-muted/50" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-16 animate-pulse rounded-lg bg-muted/30"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
