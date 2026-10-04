import { describe, expect, it } from 'vitest'
import {
  addTopic,
  annotationHasTopic,
  anyAnnotationHasTopics,
  canonicalizeTopicLabel,
  normalizeTopicLabel,
  normalizeTopicsList,
  primaryTopic,
  removeTopic,
  toggleTopic,
  topicsForFile,
  topicsInList,
} from './annotationTopics'

describe('annotationTopics', () => {
  it('normalizes labels', () => {
    expect(normalizeTopicLabel('  AUMF   power  ')).toBe('AUMF power')
    expect(normalizeTopicLabel('x'.repeat(50)).length).toBe(40)
  })

  it('prefers spelling already on the article', () => {
    expect(canonicalizeTopicLabel('hamdi', ['Hamdi', 'AUMF'])).toBe('Hamdi')
    expect(canonicalizeTopicLabel('citizenship', ['Hamdi'])).toBe('citizenship')
  })

  it('dedupes topics case-insensitively', () => {
    expect(normalizeTopicsList(['Hamdi', 'hamdi', 'AUMF', ''], ['Hamdi'])).toEqual([
      'Hamdi',
      'AUMF',
    ])
  })

  it('builds per-file vocabulary', () => {
    const annotations = [
      { fileId: 'pdf-a', topics: ['Hamdi', 'AUMF'] },
      { fileId: 'pdf-a', topics: ['citizenship'] },
      { fileId: 'pdf-b', topics: ['Milligan'] },
    ]
    expect(topicsForFile(annotations, 'pdf-a')).toEqual(['AUMF', 'citizenship', 'Hamdi'])
    expect(topicsForFile(annotations, 'pdf-b')).toEqual(['Milligan'])
    expect(topicsForFile(annotations, null)).toEqual([])
    expect(topicsInList(annotations)).toEqual(['AUMF', 'citizenship', 'Hamdi', 'Milligan'])
  })

  it('adds, removes, and toggles topics', () => {
    let topics = addTopic([], 'AUMF')
    expect(topics).toEqual(['AUMF'])
    topics = addTopic(topics, 'Hamdi', ['Hamdi'])
    expect(annotationHasTopic(topics, 'hamdi')).toBe(true)
    topics = removeTopic(topics, 'AUMF')
    expect(topics).toEqual(['Hamdi'])
    topics = toggleTopic(topics, 'Hamdi')
    expect(topics).toEqual([])
    topics = toggleTopic(topics, 'Hamdi', ['Hamdi'])
    expect(topics).toEqual(['Hamdi'])
  })

  it('detects tagged annotations and primary topic', () => {
    expect(anyAnnotationHasTopics([{ topics: [] }, { topics: ['AUMF'] }])).toBe(true)
    expect(anyAnnotationHasTopics([{ topics: [] }])).toBe(false)
    expect(primaryTopic({ topics: ['Hamdi', 'AUMF'] })).toBe('Hamdi')
    expect(primaryTopic({ topics: [] })).toBe('')
  })
})
