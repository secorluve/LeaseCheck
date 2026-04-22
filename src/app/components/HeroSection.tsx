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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      return
    }

    onAnalyze({
      url: url.trim(),
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
            Вставьте ссылку на объявление, и LeaseCheck проанализирует риски, надежность и рекомендации.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          onSubmit={handleSubmit}
          className="mt-12 space-y-6"
        >
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://krisha.kz/a/show/12345678"
            className="w-full rounded-xl border border-input bg-card px-6 py-4 text-lg transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
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
            <span>Автоматическая оценка рисков и надежности объявления</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Итоговый отчет с AI-вердиктом и рекомендациями</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
