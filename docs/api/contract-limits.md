# Contract Limits

## Poll Limits

- Maximum options per poll: 10
- Maximum question length: 256 characters
- Maximum option length: 64 characters

## Rate Limits

- One vote per user per poll
- Poll creation limited by contract balance

## Storage Limits

- Each poll stored in on-chain map
- Votes indexed by poll-id and principal
- Consider gas costs for large data structures
