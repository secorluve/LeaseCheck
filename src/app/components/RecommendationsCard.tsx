import { Lightbulb, ChevronRight } from 'lucide-react';

interface RecommendationsCardProps {
  recommendations: string[];
}

export function RecommendationsCard({ recommendations }: RecommendationsCardProps) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-6 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Рекомендации</h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((recommendation, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
              {index + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{recommendation}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}
