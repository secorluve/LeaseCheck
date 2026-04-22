import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/chart';
import type { MockPriceAnalyticsData } from '@/lib/analysis/mockPriceAnalytics';

interface PriceAnalyticsDemoProps {
  data: MockPriceAnalyticsData;
}

const formatPrice = (value: number | null) => {
  if (value == null) return '—';

  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getComparisonColor = (percent: number) => {
  if (percent > 0) return 'text-red-400';
  if (percent < 0) return 'text-emerald-400';
  return 'text-muted-foreground';
};

const getComparisonIcon = (percent: number) => {
  if (percent > 0) return <TrendingUp className="h-4 w-4 text-red-400" />;
  if (percent < 0) return <TrendingDown className="h-4 w-4 text-emerald-400" />;
  return <Minus className="h-4 w-4" />;
};

export function PriceAnalyticsDemo({ data }: PriceAnalyticsDemoProps) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      {/* TOP ROW: Title + Period Selector */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Анализ цены</h3>
        <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {data.periodLabel}
        </div>
      </div>

      {/* FIRST BLOCK: Listing Price Card */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
        <div className="mt-0.5 h-5 w-5 rounded bg-emerald-500/20 flex items-center justify-center">
          <span className="text-xs text-emerald-600 font-bold">₸</span>
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">Цена объявления</div>
          <div className="font-medium text-lg">{formatPrice(data.listingPrice)}</div>
        </div>
      </div>

      {/* SECOND BLOCK: Two Cards Side by Side */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
          <div className="mt-0.5 h-5 w-5 rounded bg-sky-500/20 flex items-center justify-center">
            <span className="text-xs text-sky-600 font-bold">🏙️</span>
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground leading-tight">Похожие квартиры в Астане</div>
            <div className="font-medium">{formatPrice(data.cityAveragePrice)}</div>
          </div>
        </div>

        {data.hasDistrictData && (
          <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
            <div className="mt-0.5 h-5 w-5 rounded bg-violet-500/20 flex items-center justify-center">
              <span className="text-xs text-violet-600 font-bold">🏘️</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground leading-tight">Похожие квартиры в районе</div>
              <div className="font-medium">{formatPrice(data.districtAveragePrice)}</div>
            </div>
          </div>
        )}
      </div>

      {/* THIRD BLOCK: Comparison Text */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-3">
        {getComparisonIcon(data.comparisonPercent)}
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">Сравнение</div>
          <div className={`font-medium leading-relaxed ${getComparisonColor(data.comparisonPercent)}`}>
            {data.comparisonText}
          </div>
        </div>
      </div>

      {/* FOURTH BLOCK: Chart Card */}
      <div className="rounded-lg border border-border/30 bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm text-muted-foreground">Средняя цена</div>
          <div className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {data.periodLabel}
          </div>
        </div>

        <div className="mb-3">
          <ChartContainer
            config={{
              city: { label: 'Астана', color: '#60A5FA' },
              district: { label: 'Район', color: '#A78BFA' },
              listing: { label: 'Это объявление', color: '#34D399' },
            }}
            className="h-[180px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart} margin={{ top: 6, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'rgba(226, 232, 240, 0.65)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(226, 232, 240, 0.65)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatPrice}
                />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), '']}
                  labelStyle={{ color: '#F8FAFC' }}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="city"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                {data.hasDistrictData && (
                  <Line
                    type="monotone"
                    dataKey="district"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="listing"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Legend inside chart card */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span>Астана</span>
          </div>
          {data.hasDistrictData && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
              <span>Район</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span>Это объявление</span>
          </div>
        </div>
      </div>
    </div>
  );
}