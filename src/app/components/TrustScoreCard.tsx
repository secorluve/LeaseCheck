import { motion } from 'motion/react'
import { Shield, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TrustScoreCardProps {
  score: number
  confidence: string
  verdict: 'Safe' | 'Suspicious' | 'Needs Manual Review'
  summary: string
}

export function TrustScoreCard({ score, confidence, verdict, summary }: TrustScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const stepValue = score / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep += 1
      if (currentStep <= steps) {
        setDisplayScore(Math.round(stepValue * currentStep))
      } else {
        setDisplayScore(score)
        clearInterval(interval)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [score])

  const getScoreColor = (value: number) => {
    if (value >= 70) return 'text-primary'
    if (value >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreBgColor = (value: number) => {
    if (value >= 70) return 'from-primary/20 to-primary/5'
    if (value >= 40) return 'from-yellow-500/20 to-yellow-500/5'
    return 'from-red-500/20 to-red-500/5'
  }

  const getScoreLabel = (value: number) => {
    if (value >= 70) return 'Низкий риск'
    if (value >= 40) return 'Средний риск'
    return 'Высокий риск'
  }

  const verdictLabel =
    verdict === 'Safe'
      ? 'Объявление выглядит безопаснее среднего'
      : verdict === 'Suspicious'
        ? 'Объявление выглядит подозрительно'
        : 'Нужна ручная проверка'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-8 transition-all hover:border-border hover:shadow-xl hover:shadow-primary/5"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${getScoreBgColor(score)} opacity-50`} />

      <div className="relative flex flex-col items-center justify-center space-y-6">
        <div className="flex items-center gap-3">
          <Shield className={`h-8 w-8 ${getScoreColor(score)}`} />
          <h2 className="text-2xl font-semibold">Оценка надёжности</h2>
        </div>

        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`text-8xl font-bold ${getScoreColor(score)}`}
          >
            {displayScore}%
          </motion.div>
          <div className="mt-2 flex items-center justify-center gap-2 text-lg text-muted-foreground">
            <TrendingUp className="h-5 w-5" />
            <span>{getScoreLabel(score)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">
            Уверенность: <span className="font-medium text-foreground">{confidence}</span>
          </span>
        </div>

        <div className="max-w-2xl space-y-2 text-center">
          <p className="text-sm font-medium text-foreground">{verdictLabel}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
      </div>
    </motion.div>
  )
}
