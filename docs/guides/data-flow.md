# Data Flow

## User Creates Poll

1. User fills form in frontend
2. Frontend calls contract function
3. Contract validates and stores poll
4. Transaction confirmed on chain
5. Frontend updates with new poll

## User Votes

1. User selects option in frontend
2. Frontend submits vote transaction
3. Contract validates vote eligibility
4. Vote stored on chain
5. Results updated in frontend
