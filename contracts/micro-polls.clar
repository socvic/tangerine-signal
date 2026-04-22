;; Micro Polls - On-chain voting contract (Clarity 5)
;; Lightweight on-chain polling with one vote per principal.

(define-constant MIN-DURATION u10)
(define-constant MAX-DURATION u1008)

(define-constant ERR-BAD-DURATION (err u100))
(define-constant ERR-BAD-OPTION (err u101))
(define-constant ERR-ALREADY-VOTED (err u102))
(define-constant ERR-POLL-CLOSED (err u103))
(define-constant ERR-NOT-FOUND (err u104))

(define-data-var poll-nonce uint u0)

(define-map polls
	uint
	{
		creator: principal,
		question: (string-utf8 140),
		option-count: uint,
		start-height: uint,
		end-height: uint,
		is-open: bool,
	}
)

(define-map poll-options
	{
		poll-id: uint,
		option-id: uint,
	}
	(string-utf8 40)
)

(define-map poll-votes
	{
		poll-id: uint,
		voter: principal,
	}
	uint
)

(define-map option-tally
	{
		poll-id: uint,
		option-id: uint,
	}
	uint
)

(define-public
	(create-poll
		(question (string-utf8 140))
		(opt1 (string-utf8 40))
		(opt2 (string-utf8 40))
		(opt3 (optional (string-utf8 40)))
		(opt4 (optional (string-utf8 40)))
		(duration uint))
	(begin
		(asserts! (and (>= duration MIN-DURATION) (<= duration MAX-DURATION)) ERR-BAD-DURATION)
		(let (
				(next-id (+ (var-get poll-nonce) u1))
				(start-height burn-block-height)
				(end-height (+ burn-block-height duration))
				(option-count (+ u2 (optionals-count opt3 opt4)))
			)
			(var-set poll-nonce next-id)
			(map-set polls next-id {
				creator: tx-sender,
				question: question,
				option-count: option-count,
				start-height: start-height,
				end-height: end-height,
				is-open: true,
			})
			(map-set poll-options { poll-id: next-id, option-id: u1 } opt1)
			(map-set poll-options { poll-id: next-id, option-id: u2 } opt2)
			(map-set option-tally { poll-id: next-id, option-id: u1 } u0)
			(map-set option-tally { poll-id: next-id, option-id: u2 } u0)
			(if (is-some opt3)
				(begin
					(map-set poll-options { poll-id: next-id, option-id: u3 } (unwrap-panic opt3))
					(map-set option-tally { poll-id: next-id, option-id: u3 } u0)
				)
				false
			)
			(if (is-some opt4)
				(begin
					(map-set poll-options { poll-id: next-id, option-id: u4 } (unwrap-panic opt4))
					(map-set option-tally { poll-id: next-id, option-id: u4 } u0)
				)
				false
			)
			(print {
				event: "poll-created",
				poll-id: next-id,
				creator: tx-sender,
				option-count: option-count,
			})
			(ok next-id)
		)
	)
)

(define-public (vote (poll-id uint) (option-id uint))
	(let (
			(poll (unwrap! (map-get? polls poll-id) ERR-NOT-FOUND))
			(height burn-block-height)
		)
		(asserts! (poll-open-for-vote poll height) ERR-POLL-CLOSED)
		(asserts! (and (>= option-id u1) (<= option-id (get option-count poll))) ERR-BAD-OPTION)
		(asserts! (is-none (map-get? poll-votes { poll-id: poll-id, voter: tx-sender })) ERR-ALREADY-VOTED)
		(map-set poll-votes { poll-id: poll-id, voter: tx-sender } option-id)
		(map-set option-tally
			{ poll-id: poll-id, option-id: option-id }
			(+ u1 (default-to u0 (map-get? option-tally { poll-id: poll-id, option-id: option-id })))
		)
		(print {
			event: "vote-cast",
			poll-id: poll-id,
			voter: tx-sender,
			option-id: option-id,
		})
		(ok true)
	)
)

(define-public (close-poll (poll-id uint))
	(let ((poll (unwrap! (map-get? polls poll-id) ERR-NOT-FOUND)))
		(asserts! (> burn-block-height (get end-height poll)) ERR-POLL-CLOSED)
		(if (get is-open poll)
			(begin
				(map-set polls poll-id {
					creator: (get creator poll),
					question: (get question poll),
					option-count: (get option-count poll),
					start-height: (get start-height poll),
					end-height: (get end-height poll),
					is-open: false,
				})
				(ok true)
			)
			(ok false)
		)
	)
)

(define-read-only (get-poll (poll-id uint))
	(ok (map-get? polls poll-id))
)

(define-read-only (get-option (poll-id uint) (option-id uint))
	(ok (map-get? poll-options { poll-id: poll-id, option-id: option-id }))
)

(define-read-only (get-tally (poll-id uint) (option-id uint))
	(ok (default-to u0 (map-get? option-tally { poll-id: poll-id, option-id: option-id })))
)

(define-read-only (has-voted (poll-id uint) (who principal))
	(ok (is-some (map-get? poll-votes { poll-id: poll-id, voter: who })))
)

(define-read-only (get-poll-nonce)
	(ok (var-get poll-nonce))
)

(define-read-only (is-poll-open (poll-id uint))
	(match (map-get? polls poll-id)
		poll (ok (poll-open-for-vote poll burn-block-height))
		ERR-NOT-FOUND
	)
)

(define-private (optionals-count (opt3 (optional (string-utf8 40))) (opt4 (optional (string-utf8 40))))
	(+ (if (is-some opt3) u1 u0) (if (is-some opt4) u1 u0))
)

(define-private (poll-open-for-vote
		(poll {
			creator: principal,
			question: (string-utf8 140),
			option-count: uint,
			start-height: uint,
			end-height: uint,
			is-open: bool,
		})
		(height uint)
	)
	(and (get is-open poll) (<= height (get end-height poll)))
)

