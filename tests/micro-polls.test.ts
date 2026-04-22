// Micro Polls contract tests
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;


describe("micro-polls", () => {
    it("creates a poll with 4 options and stores metadata", () => {
        const created = simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Which feature first?"),
                Cl.stringUtf8("Wallet"),
                Cl.stringUtf8("Analytics"),
                Cl.some(Cl.stringUtf8("Rewards")),
                Cl.some(Cl.stringUtf8("Groups")),
                Cl.uint(100),
            ],
            wallet1,
        );

        expect(created.result).toBeOk(Cl.uint(1));

        const poll = simnet.callReadOnlyFn("micro-polls", "get-poll", [Cl.uint(1)], wallet1);
        expect(poll.result).toBeOk(
            Cl.some(
                Cl.tuple({
                    creator: Cl.principal(wallet1),
                    question: Cl.stringUtf8("Which feature first?"),
                    "option-count": Cl.uint(4),
                    "start-height": Cl.uint(2),
                    "end-height": Cl.uint(102),
                    "is-open": Cl.bool(true),
                }),
            ),
        );
    });

    it("rejects create with duration below min", () => {
        const created = simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Bad"),
                Cl.stringUtf8("A"),
                Cl.stringUtf8("B"),
                Cl.none(),
                Cl.none(),
                Cl.uint(9),
            ],
            wallet1,
        );

        expect(created.result).toBeErr(Cl.uint(100));
    });

    it("vote increments tally and records has-voted", () => {
        simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Pick one"),
                Cl.stringUtf8("X"),
                Cl.stringUtf8("Y"),
                Cl.none(),
                Cl.none(),
                Cl.uint(20),
            ],
            wallet1,
        );

        const voted = simnet.callPublicFn("micro-polls", "vote", [Cl.uint(1), Cl.uint(2)], wallet2);
        expect(voted.result).toBeOk(Cl.bool(true));

        const tally = simnet.callReadOnlyFn("micro-polls", "get-tally", [Cl.uint(1), Cl.uint(2)], wallet1);
        expect(tally.result).toBeOk(Cl.uint(1));

        const hasVoted = simnet.callReadOnlyFn(
            "micro-polls",
            "has-voted",
            [Cl.uint(1), Cl.principal(wallet2)],
            wallet1,
        );
        expect(hasVoted.result).toBeOk(Cl.bool(true));
    });

    it("rejects double vote", () => {
        simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Double?"),
                Cl.stringUtf8("Yes"),
                Cl.stringUtf8("No"),
                Cl.none(),
                Cl.none(),
                Cl.uint(20),
            ],
            wallet1,
        );
        simnet.callPublicFn("micro-polls", "vote", [Cl.uint(1), Cl.uint(1)], wallet2);
        const second = simnet.callPublicFn("micro-polls", "vote", [Cl.uint(1), Cl.uint(2)], wallet2);

        expect(second.result).toBeErr(Cl.uint(102));
    });

    it("rejects invalid option id", () => {
        simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Option range"),
                Cl.stringUtf8("One"),
                Cl.stringUtf8("Two"),
                Cl.none(),
                Cl.none(),
                Cl.uint(20),
            ],
            wallet1,
        );

        const voted = simnet.callPublicFn("micro-polls", "vote", [Cl.uint(1), Cl.uint(3)], wallet2);
        expect(voted.result).toBeErr(Cl.uint(101));
    });

    it("rejects vote after end height", () => {
        simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Expired"),
                Cl.stringUtf8("A"),
                Cl.stringUtf8("B"),
                Cl.none(),
                Cl.none(),
                Cl.uint(10),
            ],
            wallet1,
        );

        simnet.mineEmptyBlocks(11);
        const voted = simnet.callPublicFn("micro-polls", "vote", [Cl.uint(1), Cl.uint(1)], wallet2);
        expect(voted.result).toBeErr(Cl.uint(103));
    });

    it("close-poll works after end height", () => {
        simnet.callPublicFn(
            "micro-polls",
            "create-poll",
            [
                Cl.stringUtf8("Close it"),
                Cl.stringUtf8("Yes"),
                Cl.stringUtf8("No"),
                Cl.none(),
                Cl.none(),
                Cl.uint(10),
            ],
            wallet1,
        );

        simnet.mineEmptyBlocks(11);
        const closed = simnet.callPublicFn("micro-polls", "close-poll", [Cl.uint(1)], wallet2);
        expect(closed.result).toBeOk(Cl.bool(true));

        const open = simnet.callReadOnlyFn("micro-polls", "is-poll-open", [Cl.uint(1)], wallet1);
        expect(open.result).toBeOk(Cl.bool(false));
    });
});

it("returns initial nonce of zero", () => {
  const nonce = simnet.callReadOnlyFn("micro-polls", "get-poll-nonce", [], wallet1);
  expect(nonce.result).toBeOk(Cl.uint(0));
});

it("is-poll-open returns error for missing poll", () => {
  const result = simnet.callReadOnlyFn("micro-polls", "is-poll-open", [Cl.uint(999)], wallet1);
  expect(result.result).toBeErr(Cl.uint(104));
});

it("get-option returns the stored option text", () => {
  simnet.callPublicFn(
    "micro-polls",
    "create-poll",
    [Cl.stringUtf8("Favorite color?"), Cl.stringUtf8("Red"), Cl.stringUtf8("Blue"), Cl.none(), Cl.none(), Cl.uint(50)],
    wallet1,
  );
  const opt = simnet.callReadOnlyFn("micro-polls", "get-option", [Cl.uint(1), Cl.uint(1)], wallet1);
  expect(opt.result).toBeOk(Cl.some(Cl.stringUtf8("Red")));
});

it("get-tally starts at zero before any votes", () => {
  simnet.callPublicFn(
    "micro-polls",
    "create-poll",
    [Cl.stringUtf8("Tally check?"), Cl.stringUtf8("A"), Cl.stringUtf8("B"), Cl.none(), Cl.none(), Cl.uint(30)],
    wallet1,
  );
  const tally = simnet.callReadOnlyFn("micro-polls", "get-tally", [Cl.uint(1), Cl.uint(1)], wallet1);
  expect(tally.result).toBeOk(Cl.uint(0));
});

it("has-voted returns false before voting", () => {
  simnet.callPublicFn(
    "micro-polls",
    "create-poll",
    [Cl.stringUtf8("Vote check?"), Cl.stringUtf8("X"), Cl.stringUtf8("Y"), Cl.none(), Cl.none(), Cl.uint(40)],
    wallet1,
  );
  const voted = simnet.callReadOnlyFn("micro-polls", "has-voted", [Cl.uint(1), Cl.principal(wallet2)], wallet1);
  expect(voted.result).toBeOk(Cl.bool(false));
});
