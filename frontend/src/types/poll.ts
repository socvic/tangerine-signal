export interface Poll {
  id: number
  creator: string
  question: string
  optionCount: number
  startHeight: number
  endHeight: number
  open: boolean
  options: string[]
  tallies: number[]
  hasVoted: boolean
  pending?: boolean
}

export type StatusFilter = 'all' | 'open' | 'closed' | 'my' | 'voted'
export type SortMode = 'newest' | 'ending' | 'votes'
