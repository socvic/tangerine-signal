import { connect, disconnect, isConnected, request } from '@stacks/connect'
import { Cl, cvToHex, cvToJSON, hexToCV, type ClarityValue } from '@stacks/transactions'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || 'SP2V3QE7H5D09N108CJ4QPS281Z3XAZVD87R8FJ27'
const CONTRACT_NAME = import.meta.env.VITE_CONTRACT_NAME || 'micro-polls'
const STACKS_API_BASE = import.meta.env.VITE_STACKS_API_BASE || 'https://api.hiro.so'
const NETWORK = (import.meta.env.VITE_STACKS_NETWORK || 'mainnet') as 'mainnet' | 'testnet'

type Poll = {
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

type StatusFilter = 'all' | 'open' | 'closed' | 'my' | 'voted'
type SortMode = 'newest' | 'ending' | 'votes'

const PAGE_SIZE = 10

function App() {
  const [address, setAddress] = useState('')
  const [polls, setPolls] = useState<Poll[]>([])
  const [nonce, setNonce] = useState(0)
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState('Never')

  const [question, setQuestion] = useState('')
  const [opt1, setOpt1] = useState('')
  const [opt2, setOpt2] = useState('')
  const [opt3, setOpt3] = useState('')
  const [opt4, setOpt4] = useState('')
  const [duration, setDuration] = useState('50')

  const contractId = useMemo(() => `${CONTRACT_ADDRESS}.${CONTRACT_NAME}` as `${string}.${string}`, [])
  const walletConnected = Boolean(address)

  const callReadOnly = useCallback(
    async (functionName: string, args: string[] = []) => {
      const sender = address || CONTRACT_ADDRESS
      const response = await fetch(
        `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender, arguments: args }),
        },
      )
      const data = await response.json()
      if (!data.okay) {
        throw new Error(data.cause || `Read failed: ${functionName}`)
      }
      return cvToJSON(hexToCV(data.result))
    },
    [address],
  )

  const callTx = useCallback(
    async (functionName: string, functionArgs: ClarityValue[]) => {
      return request('stx_callContract', {
        contract: contractId,
        functionName,
        functionArgs,
        network: NETWORK,
        postConditionMode: 'deny',
        sponsored: false,
      })
    },
    [contractId],
  )

  const readPoll = useCallback(
    async (pollId: number): Promise<Poll | null> => {
      const pollResponse = await callReadOnly('get-poll', [cvToHex(Cl.uint(pollId))])
      if (pollResponse.value.type === 'none') return null

      const tuple = pollResponse.value.value.value
      const optionCount = Number(tuple['option-count'].value)

      const optionCalls = Array.from({ length: optionCount }, (_, i) =>
        callReadOnly('get-option', [cvToHex(Cl.uint(pollId)), cvToHex(Cl.uint(i + 1))]),
      )
      const tallyCalls = Array.from({ length: optionCount }, (_, i) =>
        callReadOnly('get-tally', [cvToHex(Cl.uint(pollId)), cvToHex(Cl.uint(i + 1))]),
      )

      const [optionResponses, tallyResponses, hasVotedResponse] = await Promise.all([
        Promise.all(optionCalls),
        Promise.all(tallyCalls),
        address
          ? callReadOnly('has-voted', [cvToHex(Cl.uint(pollId)), cvToHex(Cl.principal(address))])
          : Promise.resolve({ value: false }),
      ])

      return {
        id: pollId,
        creator: String(tuple.creator.value),
        question: String(tuple.question.value),
        optionCount,
        startHeight: Number(tuple['start-height'].value),
        endHeight: Number(tuple['end-height'].value),
        open: Boolean(tuple['is-open'].value),
        options: optionResponses.map((optionRes) =>
          optionRes.value.type === 'some' ? String(optionRes.value.value.value) : '',
        ),
        tallies: tallyResponses.map((tallyRes) => Number(tallyRes.value)),
        hasVoted: Boolean(hasVotedResponse.value),
      }
    },
    [address, callReadOnly],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const nonceResponse = await callReadOnly('get-poll-nonce')
      const latestNonce = Number(nonceResponse.value)
      setNonce(latestNonce)

      if (latestNonce === 0) {
        setPolls([])
        setStatus('No polls yet. Create the first one.')
        return
      }

      const ids = Array.from({ length: latestNonce }, (_, i) => latestNonce - i)
      const results = await Promise.all(ids.map((id) => readPoll(id)))
      const nextPolls = results.filter((poll): poll is Poll => poll !== null)
      setPolls(nextPolls)
      setVisibleCount((current) => Math.min(Math.max(PAGE_SIZE, current), Math.max(PAGE_SIZE, nextPolls.length)))
      setLastUpdated(new Date().toLocaleTimeString())
      setStatus('Polls refreshed from chain')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to refresh polls')
    } finally {
      setLoading(false)
    }
  }, [callReadOnly, readPoll])

  useEffect(() => {
    const cached = localStorage.getItem('polls-address')
    if (cached && isConnected()) setAddress(cached)
  }, [])

  useEffect(() => {
    refresh().catch(() => undefined)
  }, [refresh])

  useEffect(() => {
    if (!walletConnected || !autoRefresh) return
    const timer = window.setInterval(() => {
      refresh().catch(() => undefined)
    }, 20000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, refresh, walletConnected])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, statusFilter, sortMode])

  const onConnect = async () => {
    try {
      const response = await connect()
      const walletAddress = response.addresses[0].address
      setAddress(walletAddress)
      localStorage.setItem('polls-address', walletAddress)
      setStatus('Wallet connected')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Wallet connection failed')
    }
  }

  const onDisconnect = () => {
    disconnect()
    localStorage.removeItem('polls-address')
    setAddress('')
    setStatus('Wallet disconnected')
  }

  const onCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatus(`${label} copied`)
    } catch {
      setStatus(`Could not copy ${label.toLowerCase()}`)
    }
  }

  const onCreatePoll = async () => {
    if (!walletConnected) {
      setStatus('Connect wallet first')
      return
    }
    const durationValue = Number(duration)
    if (!question.trim() || !opt1.trim() || !opt2.trim()) {
      setStatus('Question, option 1, and option 2 are required')
      return
    }
    if (!Number.isFinite(durationValue) || durationValue < 10 || durationValue > 1008) {
      setStatus('Duration must be between 10 and 1008 blocks')
      return
    }

    const optimisticPollId = nonce + 1
    const optimisticOptions = [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()].filter(Boolean)
    const optimisticPoll: Poll = {
      id: optimisticPollId,
      creator: address,
      question: question.trim(),
      optionCount: optimisticOptions.length,
      startHeight: 0,
      endHeight: 0,
      open: true,
      options: optimisticOptions,
      tallies: optimisticOptions.map(() => 0),
      hasVoted: false,
      pending: true,
    }

    const prevPolls = polls
    const prevNonce = nonce

    setSubmitting(true)
    setPolls((current) => [optimisticPoll, ...current])
    setNonce((current) => current + 1)
    setVisibleCount((current) => Math.max(current, PAGE_SIZE))
    try {
      const response = await callTx('create-poll', [
        Cl.stringUtf8(question.trim()),
        Cl.stringUtf8(opt1.trim()),
        Cl.stringUtf8(opt2.trim()),
        opt3.trim() ? Cl.some(Cl.stringUtf8(opt3.trim())) : Cl.none(),
        opt4.trim() ? Cl.some(Cl.stringUtf8(opt4.trim())) : Cl.none(),
        Cl.uint(durationValue),
      ])
      setStatus(`Create poll submitted: ${response.txid}`)
      setQuestion('')
      setOpt1('')
      setOpt2('')
      setOpt3('')
      setOpt4('')
      setDuration('50')
      await refresh()
    } catch (error) {
      setPolls(prevPolls)
      setNonce(prevNonce)
      setStatus(error instanceof Error ? error.message : 'Failed to create poll')
    } finally {
      setSubmitting(false)
    }
  }

  const onVote = async (pollId: number, optionId: number) => {
    if (!walletConnected) {
      setStatus('Connect wallet first')
      return
    }
    const prevPolls = polls
    setSubmitting(true)
    setPolls((current) =>
      current.map((poll) => {
        if (poll.id !== pollId || poll.hasVoted || !poll.open) return poll
        const nextTallies = [...poll.tallies]
        nextTallies[optionId - 1] = (nextTallies[optionId - 1] || 0) + 1
        return {
          ...poll,
          tallies: nextTallies,
          hasVoted: true,
          pending: true,
        }
      }),
    )
    try {
      const response = await callTx('vote', [Cl.uint(pollId), Cl.uint(optionId)])
      setStatus(`Vote submitted: ${response.txid}`)
      await refresh()
    } catch (error) {
      setPolls(prevPolls)
      setStatus(error instanceof Error ? error.message : 'Vote failed')
    } finally {
      setSubmitting(false)
    }
  }

  const onClosePoll = async (pollId: number) => {
    if (!walletConnected) {
      setStatus('Connect wallet first')
      return
    }
    const prevPolls = polls
    setSubmitting(true)
    setPolls((current) =>
      current.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              open: false,
              pending: true,
            }
          : poll,
      ),
    )
    try {
      const response = await callTx('close-poll', [Cl.uint(pollId)])
      setStatus(`Close poll submitted: ${response.txid}`)
      await refresh()
    } catch (error) {
      setPolls(prevPolls)
      setStatus(error instanceof Error ? error.message : 'Close poll failed')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPolls = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const base = polls.filter((poll) => {
      const matchesQuery =
        query.length === 0 ||
        poll.question.toLowerCase().includes(query) ||
        poll.creator.toLowerCase().includes(query) ||
        String(poll.id).includes(query)

      if (!matchesQuery) return false

      if (statusFilter === 'open') return poll.open
      if (statusFilter === 'closed') return !poll.open
      if (statusFilter === 'my') return walletConnected && poll.creator === address
      if (statusFilter === 'voted') return poll.hasVoted

      return true
    })

    const sorted = [...base]
    if (sortMode === 'ending') {
      sorted.sort((a, b) => a.endHeight - b.endHeight)
    } else if (sortMode === 'votes') {
      sorted.sort(
        (a, b) =>
          b.tallies.reduce((sum, x) => sum + x, 0) -
          a.tallies.reduce((sum, x) => sum + x, 0),
      )
    } else {
      sorted.sort((a, b) => b.id - a.id)
    }

    return sorted
  }, [address, polls, searchQuery, sortMode, statusFilter, walletConnected])

  const visiblePolls = filteredPolls.slice(0, visibleCount)
  const openPolls = polls.filter((poll) => poll.open).length
  const votedPolls = polls.filter((poll) => poll.hasVoted).length
  const myPolls = walletConnected ? polls.filter((poll) => poll.creator === address).length : 0

  const shortAddress = walletConnected ? `${address.slice(0, 7)}...${address.slice(-6)}` : 'Disconnected'

  if (!walletConnected) {
    return (
      <main className="app">
        <header className="topbar">
          <div>
            <p className="eyebrow">Micro Polls Voting Board</p>
            <h1>Gas-only On-Chain Polling</h1>
            <p className="muted">Connect your wallet to unlock the entire dapp interface.</p>
          </div>
          <div className="actions">
            <button className="accent" onClick={onConnect}>
              Connect Wallet
            </button>
          </div>
        </header>

        <section className="locked hard-lock">
          <h2>UI Locked</h2>
          <p>The full voting board is hidden until a wallet is connected.</p>
          <p className="muted small">Network: {NETWORK} | Contract: {contractId}</p>
        </section>

        <footer className="status">{status}</footer>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Micro Polls Voting Board</p>
          <h1>Gas-only On-Chain Polling</h1>
          <p className="muted">Each create, vote, and close action is a direct Stacks transaction.</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={refresh} disabled={loading || submitting}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="accent" onClick={onDisconnect}>
            Disconnect {shortAddress}
          </button>
        </div>
      </header>

      <section className="meta-row">
        <div className="meta-card">
          <span>Total polls</span>
          <strong>{nonce}</strong>
        </div>
        <div className="meta-card">
          <span>Contract</span>
          <strong>{contractId}</strong>
        </div>
        <div className="meta-card">
          <span>Network</span>
          <strong>{NETWORK}</strong>
        </div>
        <div className="meta-card">
          <span>Open polls</span>
          <strong>{openPolls}</strong>
        </div>
        <div className="meta-card">
          <span>My polls</span>
          <strong>{myPolls}</strong>
        </div>
        <div className="meta-card">
          <span>Voted polls</span>
          <strong>{votedPolls}</strong>
        </div>
      </section>

      <section className="controls-panel">
        <label>
          Search polls
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Question, creator, or ID"
          />
        </label>
        <label>
          Filter
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="my">My polls</option>
            <option value="voted">Voted</option>
          </select>
        </label>
        <label>
          Sort
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
            <option value="newest">Newest</option>
            <option value="ending">Ending soon</option>
            <option value="votes">Most votes</option>
          </select>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          Auto-refresh (20s)
        </label>
      </section>

      <section className="create-panel">
        <h2>Create Poll</h2>
        <div className="grid">
          <label>
            Question
            <input value={question} maxLength={140} onChange={(e) => setQuestion(e.target.value)} />
          </label>
          <label>
            Option 1
            <input value={opt1} maxLength={40} onChange={(e) => setOpt1(e.target.value)} />
          </label>
          <label>
            Option 2
            <input value={opt2} maxLength={40} onChange={(e) => setOpt2(e.target.value)} />
          </label>
          <label>
            Option 3 (optional)
            <input value={opt3} maxLength={40} onChange={(e) => setOpt3(e.target.value)} />
          </label>
          <label>
            Option 4 (optional)
            <input value={opt4} maxLength={40} onChange={(e) => setOpt4(e.target.value)} />
          </label>
          <label>
            Duration (10-1008 blocks)
            <input type="number" min={10} max={1008} value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
        </div>
        <button className="accent" onClick={onCreatePoll} disabled={!walletConnected || submitting}>
          {submitting ? 'Submitting...' : 'Create Poll'}
        </button>
      </section>

      <section className="poll-list">
        <h2>Live Polls</h2>
        <p className="muted small">
          Showing {visiblePolls.length} of {filteredPolls.length} filtered polls | Last refresh: {lastUpdated}
        </p>
        {filteredPolls.length === 0 ? (
          <p className="muted">No polls yet.</p>
        ) : (
          visiblePolls.map((poll) => {
            const totalVotes = poll.tallies.reduce((sum, value) => sum + value, 0)
            return (
              <article className="poll-card" key={poll.id}>
                <div className="poll-head">
                  <h3>#{poll.id} {poll.question}</h3>
                  <div className="chips">
                    <span className={poll.open ? 'chip open' : 'chip closed'}>{poll.open ? 'Open' : 'Closed'}</span>
                    {poll.pending && <span className="chip pending">Pending</span>}
                  </div>
                </div>
                <p className="muted small">
                  Creator: {poll.creator} | Start: {poll.startHeight} | End: {poll.endHeight} | Votes: {totalVotes}
                </p>
                <div className="poll-helpers">
                  <button className="ghost helper" onClick={() => onCopy(String(poll.id), 'Poll ID')}>Copy poll ID</button>
                  <button className="ghost helper" onClick={() => onCopy(poll.creator, 'Creator address')}>Copy creator</button>
                </div>
                <div className="choices">
                  {poll.options.map((opt, idx) => {
                    const votes = poll.tallies[idx] || 0
                    const percent = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100)
                    const disabled = poll.hasVoted || !poll.open || submitting
                    return (
                      <div className="vote-wrap" key={`${poll.id}-${idx + 1}`}>
                        <button className="vote-row" onClick={() => onVote(poll.id, idx + 1)} disabled={disabled}>
                          <span>{idx + 1}. {opt}</span>
                          <span>{votes} votes ({percent}%)</span>
                        </button>
                        <div className="vote-bar" aria-hidden="true">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="poll-foot">
                  <p className="muted small">{poll.hasVoted ? 'You already voted on this poll.' : 'One vote per wallet.'}</p>
                  <button className="ghost" onClick={() => onClosePoll(poll.id)} disabled={submitting}>
                    Close Poll
                  </button>
                </div>
              </article>
            )
          })
        )}
        {filteredPolls.length > visibleCount && (
          <button className="ghost load-more" onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}>
            Load more polls
          </button>
        )}
      </section>

      <footer className="status">{status}</footer>
    </main>
  )
}

export default App

// Non-breaking comment 1
// Non-breaking comment 2
// Non-breaking comment 3
// Non-breaking comment 4
// Non-breaking comment 5
// Non-breaking comment 6
// Non-breaking comment 7
// Non-breaking comment 8
// Non-breaking comment 9
// Non-breaking comment 10
// Non-breaking comment 11
// Non-breaking comment 12
// Non-breaking comment 13
// Non-breaking comment 14
// Non-breaking comment 15
// Non-breaking comment 16
// Non-breaking comment 17
// Non-breaking comment 18
// Non-breaking comment 19
// Non-breaking comment 20
// Non-breaking comment 21
// Non-breaking comment 22
// Non-breaking comment 23
// Non-breaking comment 24
// Non-breaking comment 25
