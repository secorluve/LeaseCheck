import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import type { AnalysisInput } from '@/lib/analysis/types'

interface HeroSectionProps {
  onAnalyze: (input: AnalysisInput) => void
  isLoading: boolean
}

export function HeroSection({ onAnalyze, isLoading }: HeroSectionProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [manualText, setManualText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim() && !manualText.trim()) {
      return
    }

    onAnalyze({
      url: url.trim() || undefined,
      title: title.trim() || undefined,
      location: location.trim() || undefined,
      price: price.trim() ? Number(price.trim()) : undefined,
      manualText: manualText.trim() || undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-20"
    >
      <div className="w-full max-w-3xl space-y-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Проверь объявление на риск мошенничества
          </h1>
          <p className="text-xl text-muted-foreground">
            Вставьте ссылку на объявление или добавьте текст вручную, если площадка блокирует парсинг.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="mt-12 space-y-4"
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://krisha.kz/a/show/12345678"
            className="w-full rounded-xl border border-input bg-card px-6 py-4 text-lg transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Город / район"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Цена"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isLoading}
            />
          </div>

          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Если страницу нельзя распарсить автоматически, вставьте сюда текст объявления или краткое описание условий аренды."
            className="min-h-40 w-full rounded-xl border border-input bg-card px-4 py-3 text-base transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || (!url.trim() && !manualText.trim())}
            className="group relative w-full overflow-hidden rounded-xl bg-primary px-8 py-4 text-lg font-medium text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Анализируем...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Search className="h-5 w-5" />
                Анализировать
              </span>
            )}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Поддержка Krisha и OLX с реальным парсингом</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Fallback на ручной ввод для Airbnb, Booking и других площадок</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>AI-вердикт, риски и рекомендации в одном отчёте</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
