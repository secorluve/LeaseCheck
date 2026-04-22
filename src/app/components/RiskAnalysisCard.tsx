import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'

interface RiskAnalysisCardProps {
  risks: {
    positive: string[]
    negative: string[]
    uncertainty: string[]
    items: Array<{
      title: string
      description: string
      severity: 'low' | 'medium' | 'high'
    }>
  }
}

export function RiskAnalysisCard({ risks }: RiskAnalysisCardProps) {
  const severityClass = (severity: 'low' | 'medium' | 'high') => {
    if (severity === 'high') return 'border-red-500/30 bg-red-500/5 text-red-500'
    if (severity === 'medium') return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500'
    return 'border-primary/30 bg-primary/5 text-primary'
  }

  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <h3 className="mb-6 text-xl font-semibold">Анализ рисков</h3>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <h4 className="font-medium">Положительные сигналы</h4>
          </div>
          <div className="space-y-2">
            {risks.positive.map((signal, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 transition-all hover:border-primary/30 hover:bg-primary/10"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm">{signal}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <h4 className="font-medium">Подозрительные признаки</h4>
          </div>
          <div className="space-y-2">
            {risks.negative.length === 0 ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm">
                Явных признаков мошенничества не найдено
              </div>
            ) : null}
            {risks.negative.map((signal, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 transition-all hover:border-red-500/30 hover:bg-red-500/10"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <span className="text-sm">{signal}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-yellow-500">
            <HelpCircle className="h-5 w-5" />
            <h4 className="font-medium">Что осталось неопределённым</h4>
          </div>
          <div className="space-y-2">
            {risks.uncertainty.length === 0 ? (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm">
                Существенных зон неопределённости не выявлено
              </div>
            ) : null}
            {risks.uncertainty.map((signal, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 transition-all hover:border-yellow-500/30 hover:bg-yellow-500/10"
              >
                <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                <span className="text-sm">{signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {risks.items.length > 0 ? (
        <div className="mt-8 space-y-3">
          <h4 className="text-base font-medium">Подробные найденные риски</h4>
          <div className="space-y-3">
            {risks.items.map((risk, index) => (
              <div key={`${risk.title}-${index}`} className="rounded-xl border border-border/40 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{risk.title}</div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${severityClass(risk.severity)}`}>
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{risk.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
