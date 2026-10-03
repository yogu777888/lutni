import type { StoryGroup } from '@/lib/story-groups'
import type { StoryQueueItem } from './events'
import { seenKey, type SeenMark } from './seen'

/**
 * Очередь сторис по тапу на кружок gi: матчи этого кружка, потом следующих — каждый матч один раз.
 * Матч, который уже был раньше в очереди, в следующем кружке не повторяем, но отмечаем просмотренным
 * и там (`also` у первого матча этого кружка), когда зритель до него дойдёт, — так кольцо следующего
 * кружка гаснет целиком, а не дырами. Начинаем с первого непросмотренного матча кружка, как в соцсетях.
 */
export function circleQueue(
  groups: StoryGroup[],
  gi: number,
  seen: Set<string>,
  covers: Record<string, string> = {},
): { queue: StoryQueueItem[]; startId: number } {
  const queue: StoryQueueItem[] = []
  const ids = new Set<number>()
  // повторы кружков, в которых не осталось своих матчей, — отметим вместе со следующим кружком
  let carry: SeenMark[] = []
  for (const g of groups.slice(gi)) {
    const own: StoryQueueItem[] = []
    g.items.forEach((it, i) => {
      if (ids.has(it.id)) carry.push({ key: g.key, id: it.id })
      else
        own.push({
          id: it.id,
          href: it.href,
          group: { key: g.key, label: g.label, kind: g.kind, cover: covers[g.key], pos: i + 1, total: g.items.length },
          focus: it.focus,
        })
    })
    if (!own.length) continue
    if (carry.length) own[0].also = carry
    carry = []
    for (const it of own) {
      ids.add(it.id)
      queue.push(it)
    }
  }
  // в конце остались кружки из одних повторов — отметим их с последним матчем очереди
  const last = queue.at(-1)
  if (last && carry.length) last.also = [...(last.also ?? []), ...carry]

  const g = groups[gi]
  const start = g.items.find((it) => !seen.has(seenKey(g.key, it.id))) ?? g.items[0]
  return { queue, startId: start.id }
}

/** Сколько матчей кружка уже посмотрели в нём самом — столько сегментов кольца гаснет. */
export function seenCount(g: StoryGroup, seen: Set<string>) {
  return g.items.filter((it) => seen.has(seenKey(g.key, it.id))).length
}
