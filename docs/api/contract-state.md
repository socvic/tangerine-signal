# Contract State

## Data Maps

### polls

Stores poll information indexed by poll ID.

**Key:** uint (poll-id)
**Value:** {
  creator: principal,
  question: (string-ascii 256),
  options: (list 10 (string-ascii 64)),
  active: bool,
  created-at: uint
}

### votes

Stores individual votes indexed by poll ID and voter.

**Key:** { poll-id: uint, voter: principal }
**Value:** uint (option-index)
