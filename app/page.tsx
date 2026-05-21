import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { getAllGameMetadata } from '@/lib/getGameMetadata'
import StatusBadge from '@/components/shared/StatusBadge'
import SubmissionsSortSelect from '@/components/shared/SubmissionsSortSelect'
import {
  parseSubmissionSort,
  sortGameMetadata,
} from '@/lib/submissionSort'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort: sortRaw } = await searchParams
  const sort = parseSubmissionSort(sortRaw)

  const allGames = await getAllGameMetadata()
  const games = sortGameMetadata(allGames, sort)

  return (
    <main>
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Ape Church Game Submissions
          </h1>
          <p className="text-muted-foreground">Browse submitted games</p>
        </div>
        <Suspense
          fallback={
            <div className="h-10 w-full min-w-[12rem] max-w-xs animate-pulse rounded-lg bg-muted/30 sm:w-56" />
          }
        >
          <SubmissionsSortSelect currentSort={sort} />
        </Suspense>
      </div>

      {games.length === 0 && (
        <p className="text-muted-foreground">No game submissions yet.</p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
        {games.map((game) => (
          <Link
            key={game.gameName}
            href={`/submissions/${game.team}/${game.gameName}`}
            className="relative group rounded-xl border border-card-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="absolute top-2 right-2 z-10">
              <StatusBadge status={game.status} />
            </div>
            {game.thumbnail && (
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={`/submissions${game.thumbnail}`}
                  alt={game.displayTitle}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-semibold text-lg">{game.displayTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {game.team}
                {game.version && (
                  <span className="ml-1.5 text-xs text-muted-foreground/60">v{game.version}</span>
                )}
              </p>
              <p className="text-sm text-card-foreground mt-2 line-clamp-2">{game.description}</p>
              {game.submittedAt && (
                <p className="text-xs text-muted-foreground/60 mt-2">
                  Submitted {new Date(game.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {game.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
