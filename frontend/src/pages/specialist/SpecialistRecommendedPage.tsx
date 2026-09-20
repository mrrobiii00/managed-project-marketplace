// ─────────────────────────────────────────────────────────────
// /specialist/recommended-projects — لیست پیشنهادهای متخصص (M11)
// ترتیب نمایش دقیقاً همان ترتیب API است (totalScore DESC, trustScore
// DESC, createdAt DESC, id ASC) — فرانت دوباره sort نمی‌کند.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import RecommendationCard from '../../components/recommendations/RecommendationCard'
import { recommendationService } from '../../services/recommendation.service'
import type { RecommendationListItem } from '../../types/recommendation'
import { ApiError } from '../../types/api'

const PAGE_SIZE = 20

export default function SpecialistRecommendedPage() {
  const [items, setItems] = useState<RecommendationListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async (targetPage: number) => {
    setItems(null)
    setError(null)
    try {
      const res = await recommendationService.getRecommendedProjects(targetPage, PAGE_SIZE)
      setItems(res.items)
      setPage(res.page)
      setTotalPages(res.totalPages)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [])

  useEffect(() => {
    void load(1)
  }, [load])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800">پروژه‌های پیشنهادی</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {items !== null && `مجموع: ${total.toLocaleString('fa-IR')} پیشنهاد فعال — مرتب‌شده بر اساس بهترین تطبیق`}
        </p>
      </div>

      {items === null && !error && (
        <Card>
          <Loading label="در حال دریافت پیشنهادها…" />
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState message={error} onRetry={() => void load(page)} />
        </Card>
      )}

      {items !== null && items.length === 0 && (
        <Card>
          <EmptyState
            title="در حال حاضر پروژه پیشنهادی برای شما وجود ندارد."
            description="وقتی پروژه‌ای با مهارت‌ها و تجربه‌ی شما تطبیق داشته باشد، اینجا نمایش داده می‌شود. پروفایل و مهارت‌های خود را کامل نگه دارید."
          />
        </Card>
      )}

      {items !== null && items.length > 0 && (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <RecommendationCard key={item.project.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="صفحه‌بندی پیشنهادها">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => void load(page - 1)}
              >
                صفحه‌ی قبل
              </Button>
              <span className="text-xs text-slate-500">
                صفحه‌ی {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => void load(page + 1)}
              >
                صفحه‌ی بعد
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
