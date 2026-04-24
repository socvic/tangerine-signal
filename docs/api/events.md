# Contract Events

## Print Events

The contract emits print events for important actions.

### Poll Created

Emitted when a new poll is created.
- `type`: "poll-created"
- `data`: { poll-id, creator, question }

### Vote Cast

Emitted when a user votes on a poll.
- `type`: "vote-cast"
- `data`: { poll-id, voter, option-index }
