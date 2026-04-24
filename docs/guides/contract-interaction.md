# Contract Interaction Guide

## Using the Frontend

The frontend provides a user-friendly interface for interacting with the micro-polls contract.

## Using Clarinet Console

```bash
clarinet console
```

### Create a Poll

```clarity
(contract-call? .micro-polls create-poll "Your question?" (list "Option A" "Option B"))
```

### Vote on a Poll

```clarity
(contract-call? .micro-polls vote u1 u0)
```

## Using Stacks CLI

```bash
stx contract-call --contract micro-polls --function create-poll
```
