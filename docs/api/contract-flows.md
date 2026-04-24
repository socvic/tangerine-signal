# Contract Function Flows

## Create Poll Flow

```
User -> Frontend: Fill poll form
Frontend -> Contract: create-poll()
Contract -> Chain: Store poll data
Chain -> Frontend: Transaction receipt
Frontend -> User: Display new poll
```

## Vote Flow

```
User -> Frontend: Select option
Frontend -> Contract: vote()
Contract -> Chain: Validate & store vote
Chain -> Frontend: Transaction receipt
Frontend -> User: Update vote count
```

## Read Poll Flow

```
User -> Frontend: View poll
Frontend -> Chain: read-poll()
Chain -> Frontend: Poll data
Frontend -> User: Display poll details
```
