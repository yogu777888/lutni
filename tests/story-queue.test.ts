import { describe, expect, it } from 'vitest'
import { circleQueue, seenCount } from '@/components/story/queue'
import { seenKey } from '@/components/story/seen'
import type { StoryGroup } from '@/lib/story-groups'

const group = (key: string, ids: number[]): StoryGroup => ({
  key,
  label: key === 'top' ? 'Топ дня' : `#${key}`,
  kind: key === 'top' ? 'top' : 'accent',
  hint: '',
  href: `/tag/${key}`,
  stat: '',
  items: ids.map((id) => ({ id, href: `/match/${id}`, focus: null })),
})

describe('очередь сторис кружков', () => {
  // матч 2 есть и в «Топ дня», и в «#кэф упал»; «#фаворит» целиком из матчей «Топ дня»
  const groups = [group('top', [1, 2, 3]), group('progruz', [2, 4]), group('favorit', [1, 3]), group('tb', [5])]

  it('каждый матч — один раз, в первом кружке, где он встретился', () => {
    const { queue, startId } = circleQueue(groups, 0, new Set())
    expect(queue.map((q) => q.id)).toEqual([1, 2, 3, 4, 5])
    expect(queue.map((q) => q.group?.key)).toEqual(['top', 'top', 'top', 'progruz', 'tb'])
    expect(startId).toBe(1)
  })

  it('место в шапке — по кружку целиком: «#кэф упал 2/2», хотя первый матч уже был в «Топ дня»', () => {
    const { queue } = circleQueue(groups, 0, new Set())
    const four = queue.find((q) => q.id === 4)!
    expect(four.group).toMatchObject({ key: 'progruz', pos: 2, total: 2 })
  })

  it('повторы отмечаются в своём кружке, когда зритель до него доходит', () => {
    const { queue } = circleQueue(groups, 0, new Set())
    // матч 2 «#кэф упал» — вместе с матчем 4
    expect(queue.find((q) => q.id === 4)!.also).toEqual([{ key: 'progruz', id: 2 }])
    // «#фаворит» без своих матчей — с первым матчем следующего кружка
    expect(queue.find((q) => q.id === 5)!.also).toEqual([
      { key: 'favorit', id: 1 },
      { key: 'favorit', id: 3 },
    ])
    // в первых матчах «Топ дня» чужих отметок нет — закрыли после пары историй, другие кружки не гаснут
    expect(queue.slice(0, 3).every((q) => !q.also)).toBe(true)
  })

  it('кружки из одних повторов в конце — отмечаются с последним матчем', () => {
    const { queue } = circleQueue([group('top', [1, 2]), group('favorit', [2])], 0, new Set())
    expect(queue.at(-1)).toMatchObject({ id: 2, also: [{ key: 'favorit', id: 2 }] })
  })

  it('начинаем с первого непросмотренного в этом кружке; просмотр в другом кружке не считается', () => {
    const seen = new Set([seenKey('progruz', 2), seenKey('top', 4)])
    const { queue, startId } = circleQueue(groups, 1, seen)
    expect(startId).toBe(4)
    expect(queue.map((q) => q.id)).toEqual([2, 4, 1, 3, 5])
    expect(seenCount(groups[1], seen)).toBe(1)
    expect(seenCount(groups[0], seen)).toBe(0)
  })

  it('всё просмотрено — начинаем сначала', () => {
    const seen = new Set([seenKey('tb', 5)])
    expect(circleQueue(groups, 3, seen).startId).toBe(5)
    expect(seenCount(groups[3], seen)).toBe(1)
  })
})
