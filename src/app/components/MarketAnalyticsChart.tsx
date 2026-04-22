import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer } from './ui/chart';

interface PriceAnalysisChartPoint {
  label: string;
  city: number | null;
  district?: number | null;
  listing?: number | null;
}

interface MarketAnalyticsChartProps {
  chart: PriceAnalysisChartPoint[];
  showDistrict?: boolean;
}

export function MarketAnalyticsChart({ chart, showDistrict }: MarketAnalyticsChartProps) {
  const chartData = chart
    .filter((point) => point.label)
    .map((point) => ({
      label: point.label,
      city: point.city,
      district: point.district ?? null,
      listing: point.listing ?? null,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-dashed border-border/40 bg-muted/20 text-sm text-muted-foreground">
        График пока недоступен
      </div>
    );
  }

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('ru-KZ', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="h-[220px] w-full">
      <ChartContainer
        config={{
          city: { label: 'Астана', color: '#60A5FA' },
          district: { label: 'Район', color: '#A78BFA' },
          listing: { label: 'Это объявление', color: '#34D399' },
        }}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(148, 163, 184, 0.16)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'rgba(226, 232, 240, 0.65)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'rgba(226, 232, 240, 0.65)' }}
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
            {showDistrict ? (
              <Line
                type="monotone"
                dataKey="district"
                stroke="#A78BFA"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ) : null}
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
  );
}
