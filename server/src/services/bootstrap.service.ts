import { prisma } from '../lib/prisma'

const defaultPlans = [
  {
    code: 'FREE',
    name: 'Free',
    description: 'Базовый план для первых проверок объявлений',
    priceMonthly: '0',
    features: ['5 analyses per day', 'history access', 'manual text fallback'],
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Расширенный лимит анализов и приоритетная обработка',
    priceMonthly: '19',
    features: ['100 analyses per month', 'priority queue', 'saved reports'],
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    description: 'План для команд, агентств и расширенной аналитики',
    priceMonthly: '79',
    features: ['team access', 'analytics exports', 'admin dashboard ready'],
  },
]

export async function seedSubscriptionPlans() {
  for (const plan of defaultPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
        isActive: true,
      },
    })
  }
}
