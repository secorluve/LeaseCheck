import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type PriceAnalysisViewModel = {
  listingPrice: number | null
  cityAveragePrice: number | null
  districtAveragePrice?: number | null
  comparisonPercent: number | null
  comparisonText: string | null
  marketPositionLabel?: string | null
  disclaimer?: string | null
  periodLabel: string
  chart: Array<{
    label: string
    city: number | null
    district?: number | null
    listing?: number | null
  }>
  hasDistrictData?: boolean
}

interface PriceAnalyticsCardProps {
  analysis: PriceAnalysisViewModel
}

const formatPrice = (value: number | null) => {
  if (value == null) return '—'

  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const getComparisonColor = (percent: number | null) => {
  if (percent == null) return 'text-muted-foreground'
  if (percent > 0) return 'text-red-400'
  if (percent < 0) return 'text-emerald-400'
  return 'text-muted-foreground'
}

const getComparisonIcon = (percent: number | null) => {
  if (percent == null) return <Minus className="h-4 w-4" />
  if (percent > 0) return <TrendingUp className="h-4 w-4 text-red-400" />
  if (percent < 0) return <TrendingDown className="h-4 w-4 text-emerald-400" />
  return <Minus className="h-4 w-4" />
}

const buildComparisonText = (analysis: PriceAnalysisViewModel) => {
  if (analysis.comparisonText) return analysis.comparisonText
  if (analysis.comparisonPercent == null) return 'Сравнение цены пока недоступно.'

  const absPercent = Math.abs(analysis.comparisonPercent).toFixed(1)
  if (analysis.comparisonPercent > 0) {
    return `Цена выше доступного ориентира примерно на ${absPercent}%.`
  }

  if (analysis.comparisonPercent < 0) {
    return `Цена ниже доступного ориентира примерно на ${absPercent}%.`
  }

  return 'Цена объявления находится рядом с ориентиром.'
}

export function PriceAnalyticsCard({ analysis }: PriceAnalyticsCardProps) {
  const comparisonText = buildComparisonText(analysis)

  return (
    <div className="rounded-3xl border border-border/40 bg-card p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 text-2xl font-semibold text-foreground">Анализ цены</h3>

      <div className="mb-4 rounded-3xl border border-border/60 bg-slate-950/70 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Цена объявления</p>
        <p className="mt-3 text-2xl font-semibold text-emerald-200">{formatPrice(analysis.listingPrice)}</p>
      </div>

      <div className="mb-4 rounded-3xl border border-border/50 bg-slate-950/70 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {getComparisonIcon(analysis.comparisonPercent)}
          <span className={getComparisonColor(analysis.comparisonPercent)}>{comparisonText}</span>
        </div>
        {analysis.marketPositionLabel ? (
          <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">{analysis.marketPositionLabel}</p>
        ) : null}
      </div>

      <div className="text-sm text-muted-foreground">
        <p>
          {analysis.disclaimer ??
            'Автоматически получить рыночное сравнение не удалось. Сопоставьте объект с похожими объявлениями вручную.'}
        </p>
      </div>
    </div>
  )
}
