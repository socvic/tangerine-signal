# Contract API Reference

## micro-polls.clar

### Public Functions

#### create-poll

Creates a new poll with the given question and options.

**Parameters:**
- `question` (string-ascii): The poll question
- `options` (list): List of poll options

**Returns:** uint - The poll ID

#### vote

Cast a vote on a specific poll option.

**Parameters:**
- `poll-id` (uint): The poll ID
- `option-index` (uint): The option index

**Returns:** bool - Whether the vote was successful
