import type { ReactNode } from "react";

import type { Dict } from "@/lib/i18n/id";

/** "1 member", "3 members". */
const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export const en: Dict = {
  meta: {
    description: "Members share the cost of each other's medical bills, each chipping in the same amount, on a public record.",
    titles: {
      ask: "Ask for help",
      home: "Home",
      join: "Join",
      notifications: "Notifications",
      requests: "Requests",
      request: "Request details",
      profile: "Profile",
    },
  },

  language: {
    label: "Language",
    names: { id: "Bahasa Indonesia", en: "English" },
    short: { id: "ID", en: "EN" },
  },

  common: {
    member: "Member",
    you: "You",
    saving: "Saving",
    loading: "Loading…",
    justNow: "just now",
    copy: "Copy",
    copied: "Copied",
    testnet: "Testnet",
    topUp: "Top up",
    askForHelp: "Ask for help",
    notThisTime: "Not this time",
    seeHistory: "See history",
    showLess: "Show less",
    showAll: (count: number) => `Show all (${count})`,
    request: (id: number) => `Request #${id}`,
    help: (amount: string) => `Chip in ${amount} WHZD`,
    claimBack: (amount: string) => `Claim back ${amount} WHZD`,
    refundDetail: "Your contribution to the cancelled request goes back to your wallet.",
    declinedToast: "You're sitting this one out.",
    onExplorer: "See wallet history on Etherscan",
  },

  errors: {
    contract: {
      FaucetCooldown: "You've already claimed tokens today. Try again tomorrow.",
      FaucetCapReached: "You've reached the maximum token claim.",
      AlreadyRegistered: "You're already registered.",
      NotRegistered: "Register as a member first.",
      ReadyUnchanged: "Your Ready to help status is already set that way.",
      NoTokenBalance: "Claim some tokens before turning on Ready to help.",
      NotEligible: "You need to help someone else's request before asking again.",
      InvalidProof: "The contribution used as proof is no longer valid. Reload the page.",
      HasOpenRequest: "You still have a request running.",
      EmptySnapshot: "No other members are ready to help yet.",
      ShareTooSmall: "The amount is too small to split among all members.",
      DurationOutOfRange: "The collection period must be between 5 minutes and 30 days.",
      ZeroAmount: "Enter the amount you need.",
      DeadlinePassed: "This request's time is up.",
      DeadlineNotReached: "This request's time isn't up yet.",
      RequestNotActive: "This request no longer accepts that action.",
      RequesterCannotContribute: "You can't contribute to your own request.",
      NotInSnapshot: "You're not one of the members asked to help with this request.",
      AlreadyContributed: "You've already helped with this request.",
      NotRequester: "Only the requester can cancel.",
      NothingToRefund: "There's no contribution to claim back.",
      ERC20InsufficientBalance: "Your WHZD balance is too low.",
      ERC20InsufficientAllowance: "Token spending hasn't been approved. Try again.",
    },
    noWallet: "No wallet found in this browser. Install MetaMask, then reload the page.",
    rejected: "You cancelled in your wallet.",
    insufficientFunds: "Your wallet doesn't have enough ETH for the network fee.",
    connectFirst: "Connect a wallet first.",
    request: (status: number) => `Request failed (${status})`,
    generic: "Something went wrong. Please try again.",
  },

  tx: {
    phase: { idle: "", wallet: "Approve in your wallet", pending: "Processing", syncing: "Almost done", done: "Done" },
    failed: "The transaction failed on the blockchain.",
    slowSync: "The transaction went through, but the page hasn't caught up yet. Reload in a moment.",
  },

  wallet: {
    call: (contract: string, fn: string, effect: string) => `Your wallet will show: ${contract} · ${fn}. ${effect}`,
    signIn: {
      title: "Sign in to Whitzard",
      detail: "Your wallet asks you to sign a sign-in message. It's free: not a transaction, and no funds move.",
    },
  },

  signIn: {
    button: "Sign in",
    withWallet: "Sign in with wallet",
    intro: "Pick your wallet, then sign the sign-in message. It's free and sends no transaction. Whitzard never holds your keys.",
    browserWallet: "Browser wallet",
    devAccounts: "Local development: test accounts from the Hardhat node.",
    devAccount: (i: number) => `Test account ${i}`,
    noWallet: {
      title: "No wallet in this browser yet",
      body: "A crypto wallet is a free app that holds your Whitzard account. No email or password: you sign in by approving a message in your wallet. Setting it up takes about 2 minutes, once.",
      desktopLabel: "On a computer:",
      desktop: "install the MetaMask extension, create a new wallet, then reload this page.",
      install: "Install MetaMask",
      phoneLabel: "On a phone:",
      phone: (link: ReactNode) => <>install the MetaMask app, then {link}.</>,
      phoneLink: "open Whitzard inside the app",
      recovery: "Keep the recovery phrase MetaMask gives you somewhere safe. Whitzard can't recover your wallet.",
    },
  },

  shell: {
    nav: { home: "Home", requests: "Requests", ask: "Ask" },
    navLabel: "Main",
    balance: (amount: string) => `Balance ${amount} WHZD. Top up`,
    notifications: "Notifications",
    unread: (count: number) => `Notifications, ${count} unread`,
    markAllRead: "Mark all as read",
    bellEmpty: "No notifications yet. You'll hear when someone needs help, when contributions come in, and when funds are sent.",
    seeAll: "See all notifications",
    account: "Account",
    profile: "Profile",
    signOut: "Sign out",
    wrongNetwork: (chain: string) => `Your wallet is on a different network. Whitzard runs on ${chain}.`,
    switchTo: (chain: string) => `Switch to ${chain}`,
  },

  notifications: {
    title: "Notifications",
    markAllRead: "Mark all as read",
    unread: "Unread",
    empty: "No notifications yet. You'll hear when a member needs help, when contributions come in, and when funds are sent.",
    types: {
      request_opened: {
        title: "Someone needs help",
        body: (id: number, amount: string) => `Request #${id} asks each member for ${amount} WHZD.`,
      },
      contribution_received: {
        title: "New contribution",
        body: (id: number, amount: string) => `A member chipped in ${amount} WHZD to your request #${id}.`,
      },
      request_cancelled: {
        title: "Request cancelled",
        body: (id: number) => `Request #${id} was cancelled by the requester. You can claim your contribution back.`,
      },
      request_expired: {
        title: "Request ended",
        body: (id: number) => `Request #${id} ended with no contributions.`,
      },
      request_finalized: {
        title: "Funds received",
        body: (id: number, amount: string) => `${amount} WHZD from request #${id} is now in your wallet.`,
      },
      request_forwarded: {
        title: "Funds sent",
        body: (id: number, amount: string) => `Request #${id} that you helped is complete: ${amount} WHZD reached the requester.`,
      },
    },
  },

  countdown: {
    short: (days: number, hours: number, minutes: number) =>
      days > 0
        ? hours > 0
          ? `${n(days, "day")} ${n(hours, "hr")}`
          : n(days, "day")
        : minutes > 0
          ? `${n(hours, "hr")} ${minutes} min`
          : n(hours, "hr"),
    left: (time: ReactNode) => <>{time} <span className="font-medium">left</span></>,
    unit: {
      day: (count: number) => (count === 1 ? "day" : "days"),
      hour: (count: number) => (count === 1 ? "hour" : "hours"),
      minute: (count: number) => (count === 1 ? "minute" : "minutes"),
      second: (count: number) => (count === 1 ? "second" : "seconds"),
    },
    closesIn: "Closes in",
    closesInAria: (time: string) => `Closes in ${time}`,
  },

  funding: {
    collected: "Collected",
    ofAmount: (amount: string, standalone: boolean) => `of ${amount} WHZD${standalone ? " collected" : ""}`,
    aria: "Funds collected",
    helped: (count: ReactNode, size: ReactNode) => <>{count} of {size} members have helped</>,
  },

  status: {
    open: "Open",
    funding: "Collecting",
    awaiting: "Sending",
    finalized: "Sent",
    expired: "Ended",
    cancelled: "Cancelled",
    youHelped: (amount: string) => `You chipped in ${amount} WHZD`,
    youDeclined: "You sat this out",
  },

  outcome: {
    finalized: (amount: ReactNode, mine: boolean, members: number) => (
      <>
        {amount} {mine ? "received" : "sent"} from {n(members, "member")}
      </>
    ),
    cancelledMine: "You cancelled it",
    cancelled: "Cancelled by the requester",
    awaiting: "Time's up, funds are being sent",
    expired: "Ended with no contributions",
  },

  txProof: {
    label: "Transaction proof",
    open: (hash: string) => `Open ${hash} on Etherscan`,
  },

  shareGrid: {
    aria: (contributed: number, size: number, declined: number, you: boolean) =>
      `${contributed} of ${n(size, "member")} have helped` +
      (declined ? `, ${declined} sat out` : "") +
      (you ? ", your box has a thick outline" : ""),
    helped: "Helped",
    you: "You",
    declined: "Sat out",
    noAnswer: "No answer yet",
  },

  carousel: {
    previous: "Previous",
    next: "Next",
    item: (i: number, count: number) => `Request ${i} of ${count}`,
  },

  landing: {
    footer: "A prototype for a Computer Science thesis at Bina Nusantara University: automated escrow for disbursing health aid between community members.",
    navLabel: "On this page",
    nav: { how: "How it works", transparency: "Transparency", faq: "FAQ" },
    hero: {
      title: "Medical bills feel lighter when we carry them together.",
      body: "When a member falls ill, every other member chips in the same share. The money is held in a smart contract and sent automatically when time is up. No admin, no voting.",
      seeHow: "See how it works",
    },
    demo: {
      name: "Sari, Bandung",
      need: "Hospital stay for dengue fever",
      forwarded: "Sent",
      gridAria: "Example share grid: one box per member",
      chip: (amount: number) => `Chip in ${amount} WHZD`,
      sent: "sent to Sari, with nobody's approval needed",
      collectedOf: (total: number) => `collected of ${total} WHZD`,
      perMember: "per member",
      replay: "Replay example",
      hint: "An example. Tap an empty box to chip in.",
    },
    how: {
      title: "How it works",
      intro: "Four steps, and once a request is open nobody has to approve anything.",
      steps: [
        { title: "Ask", body: "A member who needs help with medical costs writes their story, the amount needed, and attaches the bill." },
        { title: "Split evenly", body: "The amount is split evenly among all members who are ready to help. Everyone is asked for the same share." },
        { title: "Held in escrow", body: "Contributions go into a smart contract, not anyone's bank account. Nobody can move them anywhere else." },
        { title: "Sent automatically", body: "When time is up, everything collected goes to the requester. If cancelled, contributions go back to whoever gave them." },
      ],
    },
    transparency: {
      title: "Nobody holds the money.",
      points: (chain: string) => [
        { lead: "No admin.", body: "The rules are written in a smart contract and run on their own. Nobody can hold back or redirect the funds." },
        { lead: "On the record for everyone.", body: `Every contribution and payout is a public transaction on ${chain} that anyone can check.` },
        { lead: "Money back if cancelled.", body: "If the requester cancels, every member can claim their contribution back." },
      ],
      figures: {
        members: "registered members",
        ready: "ready to help now",
        funded: "requests funded",
        distributed: "WHZD sent to requesters",
      },
      contracts: {
        escrow: "holds and forwards contributions",
        registry: "member list and Ready to help status",
        token: "test token for contributions",
        tokenName: "WHZD token",
      },
      check: "Check it yourself",
      onExplorer: (address: string) => `${address} on Etherscan`,
    },
    trial: {
      title: "Still in testing, so it's free to try.",
      body: (chain: string) =>
        `Whitzard runs on ${chain}, an Ethereum test network. The WHZD tokens used for contributions have no monetary value. Once you join, you can claim 100 free WHZD every day from the top-up menu.`,
      needs: (chain: string) => [
        `A wallet that supports ${chain}, such as MetaMask.`,
        `A little ${chain} ETH for network fees. That's free from a faucet too.`,
        "Five minutes to join: register, fill in your profile, claim a balance, then turn on Ready to help.",
      ],
    },
    faq: {
      title: "FAQ",
      items: [
        {
          q: "Do I have to pay?",
          a: "No. During testing, all contributions use WHZD tokens with no monetary value, and network fees are paid with free test ETH.",
        },
        {
          q: "Who decides when the funds are released?",
          a: "Nobody. When the collection period ends, the smart contract sends everything collected to the requester, whatever the amount. No approval, no voting.",
        },
        {
          q: "Who can see my story and my bill?",
          a: "A request's story is only visible to signed-in members. The bill can only be opened by you and the members asked to help, and it's checked against its fingerprint on the blockchain so it can't be quietly changed.",
        },
        {
          q: "Why do I have to help before asking again?",
          a: "Your first request can go straight away. After that, you need to help one other member's request before asking again, so everyone shares the load.",
        },
        {
          q: "What if the full amount isn't collected?",
          a: "Whatever was collected is still sent. If nobody contributed at all, the request ends with no payout.",
        },
      ],
    },
  },

  dashboard: {
    greeting: { morning: "Good morning", noon: "Good afternoon", afternoon: "Good afternoon", evening: "Good evening" },
    setup: {
      title: "Finish joining",
      body: (needsProfile: boolean) =>
        `${needsProfile ? "Fill in your profile" : "Top up your balance"} so you can start helping and asking for help.`,
    },
    wallet: {
      label: "Balance",
      testToken: "Test tokens, no monetary value",
      given: "You gave",
      givenNote: (times: number) => `Helped ${n(times, "time")}`,
      received: "You received",
      receivedNote: (funded: number) => `${n(funded, "request")} funded`,
      neverAsked: "Never asked yet",
      refunded: (amount: ReactNode) => <>{amount} back from cancelled requests</>,
    },
    ready: {
      label: "Ready to help",
      on: "You're counted in when new requests come in.",
      off: "You're not counted in new requests.",
      empty: "Top up before turning this on.",
      promptOn: "Turn on Ready to help",
      promptOff: "Turn off Ready to help",
      detailOn: "You'll be counted in new requests. No funds move.",
      detailOff: "You won't be counted in new requests. No funds move.",
      successOn: "You're ready to help.",
      successOff: "You're not counted in new requests.",
    },
    canRequest: {
      title: "Asking for help",
      checking: "Checking…",
      can: { title: "You can ask for help", text: "When you need help with medical costs, ask any time.", cta: "Ask" },
      running: { title: "Your request is still running", text: "You can ask again once its time is up.", cta: "View" },
      helpFirst: { title: "You can't ask yet", text: "Help one other member's request first.", cta: "Find one" },
    },
    refund: {
      body: (request: ReactNode, amount: ReactNode) => (
        <>
          {request} was cancelled. You can claim back your {amount}.
        </>
      ),
      success: (amount: string) => `${amount} WHZD is back in your balance.`,
    },
    waiting: {
      title: "Helping other members",
      description: "Other members' requests asking for your share.",
      count: (count: number) => `${count} waiting for your answer`,
      allAnswered: "You've answered them all",
      emptyTitle: "Nobody has asked for your help yet",
      emptyBody: "When a member needs help and Ready to help is on, their request shows up here.",
      carousel: "Other members' requests",
    },
    card: {
      sendingToYou: "Funds are on their way to your wallet.",
      autoToYou: "Sent to your wallet automatically when time is up.",
      sendingTo: (name: string) => `Funds are on their way to ${name}`,
      canStillHelp: "You can still help until time is up.",
    },
    declined: {
      description: "The request stays here, and you can still help until time is up.",
    },
    mine: {
      title: "Help for you",
      description: "Help you've asked for yourself.",
      history: "Past requests",
      noneRunning: "No requests running",
      never: "You haven't asked yet",
      emptyBody: "When you need help with medical costs, ask here. Members who are ready to help hear about it straight away.",
    },
  },

  members: {
    title: "Members",
    summary: (total: number, ready: number) => `${n(total, "member")}, ${ready} ready to help.`,
    you: " (you)",
    ready: "Ready to help",
    notReady: "Not ready right now",
  },

  requests: {
    title: "Requests",
    waitingYou: (count: ReactNode) => <>{count} waiting for your answer.</>,
    running: (count: ReactNode) => <>{count} running.</>,
    noneRunning: "No requests running.",
    scopes: { all: "All", "for-me": "For me", mine: "Mine" },
    states: { all: "All", live: "Running", done: "Finished" },
    scopeLabel: "Show",
    stateLabel: "Status",
    search: "Search requests",
    searchPlaceholder: "Search titles or stories",
    clearSearch: "Clear search",
    empty: {
      query: (q: string) => `No requests match "${q}".`,
      live: "No requests running.",
      done: "No finished requests yet.",
      mine: "You haven't asked for help yet.",
      forMe: "No requests for you yet. Turn on Ready to help on the home page to be counted in.",
      all: "No requests yet.",
    },
    sections: { forYou: "Waiting for your answer", running: "Running", past: "Finished" },
    share: (amount: ReactNode) => <>Share {amount}</>,
  },

  request: {
    notFound: "Request not found",
    notFoundYet: "It may have just been created and not recorded yet. Try reloading in a moment.",
    all: "All requests",
    back: "Requests",
    collected: "Funds collected",
    gridNote: (share: string, size: number, name: string) =>
      `Each box is one member, all worth the same: ${share} WHZD. Members were counted when the request was opened: the ${n(size, "person", "people")} ready to help at that moment, not including ${name}.`,
    story: (name: string) => `${name}'s story`,
    actions: "Actions",
    evidence: {
      title: "Evidence",
      allowed: (name: string) => `Only ${name} and the members asked to help can open it.`,
      restricted: (name: string) => `Only for ${name} and the members asked to help.`,
      document: "Bill or doctor's letter",
      unavailable: "Document unavailable",
      match: "Genuine: matches the fingerprint on the blockchain",
      mismatch: "Doesn't match the fingerprint on the blockchain: this document has been changed",
      fingerprint: (hash: string) => `Fingerprint on the blockchain ${hash}`,
      checking: "Checking",
      check: "Check document",
      open: "View document",
      note: "The document's fingerprint (SHA-256) was recorded on the blockchain when the request was opened. Before opening, the document is checked against it, so you know it hasn't been swapped.",
    },
    history: {
      title: "History",
      description: (chain: string, explorer: boolean) =>
        `Permanently recorded on ${chain}${explorer ? ". Tap a code to check it on Etherscan" : ""}.`,
      opened: (amount: ReactNode) => <>asked for {amount}</>,
      helped: (amount: ReactNode) => <>chipped in {amount}</>,
      refunded: (amount: ReactNode) => <>claimed back {amount}</>,
      cancelled: "cancelled",
      finalized: (amount: ReactNode, name: string) => <>{amount} sent to {name}</>,
      expired: "Ended with no contributions",
      more: (count: number) => `Show ${count} more ${count === 1 ? "step" : "steps"}`,
      heldBy: (contract: ReactNode) => <>Funds are held by contract {contract}, not by any person.</>,
    },
    finalized: {
      title: "Funds sent",
      body: (amount: ReactNode, name: string, when: string | null) => (
        <>
          {amount} reached {name}
          {when ? ` on ${when}` : ""}, straight from the contract with no middleman.
        </>
      ),
      proof: "Transfer proof",
    },
    expired: { title: "Ended", body: "The collection period ended with no contributions, so no funds were sent." },
    notIncluded: {
      title: "You're not part of this request",
      body: "This request only goes to members who were ready to help when it was opened.",
    },
    contributed: {
      title: "Your contribution is recorded",
      body: (amount: ReactNode, name: string) => (
        <>
          Thank you. Your {amount} goes to {name} when time is up.
        </>
      ),
    },
    contribute: {
      prompt: (amount: string) => `Send your ${amount} WHZD contribution`,
      promptStep2: (amount: string) => `Send your ${amount} WHZD contribution (2 of 2)`,
      detail: (name: string) => `The contract holds the funds and sends them to ${name} when time is up.`,
      permit: (amount: string) => `Allow ${amount} WHZD for your contribution (1 of 2)`,
      permitDetail: (amount: string) =>
        `Your wallet asks for a "Permit" signature: permission for the Escrow contract to use ${amount} WHZD. It's free, and no funds move yet.`,
      success: (amount: string) => `Your ${amount} WHZD contribution is recorded. Thank you.`,
      declinedTitle: "You're sitting this one out",
      declinedBody: (amount: ReactNode) => (
        <>
          {"That's fine, helping is always your choice. If you change your mind, you can still chip in "}
          {amount} until time is up.
        </>
      ),
      yourShare: "Your share",
      sameForAll: (amount: string, members: number) => `The same for everyone: ${amount} WHZD split among ${n(members, "member")}.`,
      notEnough: (balance: string) => `Your balance is ${balance} WHZD, less than your share.`,
      note: (name: string) =>
        `The funds are held in the contract and sent to ${name} when time is up, however much is collected. If the request is cancelled, you can claim yours back.`,
    },
    requester: {
      title: "Your request is running",
      body: (amount: ReactNode, members: number) => (
        <>
          {amount} collected for you so far from {n(members, "member")}.
        </>
      ),
      note: "When time is up, everything collected is sent to your wallet automatically, whatever the amount.",
      cancel: "Cancel request",
      cancelDetail: "No funds are sent to you; every member can claim their contribution back.",
      cancelSuccess: "Request cancelled. Members can claim their contributions back.",
      confirmTitle: "Cancel this request?",
      confirmBody: "No funds will be sent to you. Every member can claim their contribution back. Cancelling can't be undone.",
      back: "Go back",
    },
    awaiting: {
      yourWallet: "your wallet",
      alreadySent: "The funds were already sent automatically.",
      close: "Close request",
      send: (amount: string, to: string) => `Send ${amount} WHZD to ${to}`,
      sendDetail: (name: string) => `The contract can only send to ${name}; you only pay the network fee.`,
      closed: "Request closed.",
      sent: (to: string) => `Funds sent to ${to}.`,
      steps: {
        ended: "Collection period over",
        closing: "Closing the request",
        sending: (amount: string) => `Sending ${amount} WHZD automatically`,
        done: "Done",
        received: (to: string) => `Received by ${to}`,
      },
      titleEmpty: "Time's up",
      title: "Time's up, funds are on their way",
      bodyEmpty: "No contributions came in, so no funds are sent. This request closes automatically.",
      body: (amount: ReactNode, to: string) => (
        <>
          Just a moment. {amount} is sent to {to} automatically, nothing to press. This page updates itself as soon as the funds
          arrive.
        </>
      ),
      process: "Progress",
      overdue: (name: string) =>
        `This is taking longer than usual. If you'd rather not wait, you can send it yourself. The funds can still only go to ${name}, and can never be sent twice.`,
      sendNow: "Send now",
    },
    cancelled: {
      title: "Cancelled",
      body: (name: string, when: string | null, refunded: boolean) =>
        `${name} cancelled this request${when ? ` on ${when}` : ""}.${refunded ? " Your contribution is back in your wallet." : ""}`,
      claimable: (name: string, amount: ReactNode) => (
        <>
          {name} cancelled this request. You can claim back your {amount}.
        </>
      ),
      success: (amount: string) => `${amount} WHZD is back in your wallet.`,
    },
  },

  ask: {
    title: "Ask for help",
    intro: "Tell your story and attach the bill. Members who are ready to help will be notified, and each is asked for the same share.",
    blocked: {
      register: { title: "Register as a member first", cta: "Register now", body: "Only members can ask for help. You only register once." },
      running: {
        title: "Your request is still running",
        cta: "View your request",
        body: "Each member can only have one request running. You can ask again once its time is up.",
      },
      helpFirst: {
        title: "Help one member first",
        cta: "Find a request to help",
        body: "After your first request, you need to help one other member's request before asking again. As soon as your contribution is recorded, you can ask.",
      },
    },
    duration: { minutes: (count: number) => n(count, "minute"), days: (count: number) => n(count, "day") },
    errors: {
      title: "Enter a title for your request.",
      titleLong: "The title can be at most 120 characters.",
      description: "Tell members what the funds are for.",
      noMembers: "No other members are ready to help yet.",
      amount: "Enter an amount in WHZD, for example 300.",
      file: "Attach a bill or a doctor's letter.",
      fileLarge: "The document is larger than 10 MB.",
    },
    prompt: (amount: string) => `Ask for ${amount} WHZD`,
    promptDetail: "Records your request and its document's fingerprint. No funds move now.",
    success: "Your request has been sent to members who are ready to help.",
    uploading: "Uploading document",
    fields: {
      title: "Title",
      story: "Your story",
      storyHint: "What happened, and what the funds are for. No need to give a full diagnosis.",
      amount: "Amount needed",
      duration: "Collection period",
      file: "Supporting document",
      filePick: "Choose a bill or doctor's letter",
      fileHint: "PDF or photo, up to 10 MB. Only the members asked to help can see it.",
    },
    submit: "Submit request",
    submitNote: "The document is uploaded first, then you sign one transaction in your wallet. Once sent, the amount and evidence can't be changed.",
    preview: {
      label: "Share preview",
      title: "What each member will be asked for",
      fillAmount: "Enter an amount",
      counting: "Counting members who are ready to help",
      perMember: (members: number) => `per member, from the ${n(members, "member")} ready to help right now`,
      noMembers: "No other members are ready to help yet",
      points: [
        "The funds are sent to you when time is up, however much is collected.",
        "You can cancel before time is up. Contributions go back to the members.",
        "The member count is locked when you submit, so the share above may change slightly.",
      ],
      others: "See other requests",
    },
  },

  topUp: {
    capped: "You've claimed the 1,000 WHZD limit for this wallet.",
    nextClaim: (when: string) => `You can claim again ${when}.`,
    prompt: "Top up 100 WHZD",
    promptDetail: "Free test tokens go to your wallet; you only pay the network fee.",
    success: "100 WHZD added to your balance.",
    noticeTitle: "This is a test version",
    notice: (chain: string) =>
      `Whitzard is being tested on the ${chain} network as part of a thesis project. WHZD here has no monetary value, can't be bought, and can't be cashed out. You never need to pay anything.`,
    current: (amount: ReactNode) => <>Your balance is {amount}.</>,
    faucet: "Free from the test faucet. Once every 24 hours, up to 1,000 WHZD per wallet.",
    claim: "Claim 100 free WHZD",
    eth: (chain: string, link: ReactNode) => (
      <>
        Every transaction needs a little {chain} ETH for the network fee, also free. If your wallet is empty, {link}.
      </>
    ),
    ethLink: "get test ETH here",
  },

  onboarding: {
    title: "Join Whitzard",
    intro: "Four short steps. You can stop and pick up again any time.",
    steps: {
      join: { title: "Register as a member", hint: "Just once, recorded on the blockchain" },
      profile: { title: "Fill in your profile", hint: "So other members know who you are" },
      balance: { title: "Top up", hint: "100 free WHZD for testing" },
      ready: { title: "Ready to help", hint: "Counted in when requests come in" },
    },
    done: " (done)",
    progress: (step: number, total: number) => `Step ${step} of ${total}`,
    join: {
      body: "Your wallet address is added to Whitzard's member list on the blockchain. Just once, and from then on you can help other members and ask for help.",
      prompt: "Register as a member",
      promptDetail: "Records your wallet as a member. No funds move.",
      success: "You're now registered as a member.",
      cta: "Register now",
    },
    eth: {
      title: (chain: string) => `Your wallet has no ${chain} ETH yet`,
      body: "Every transaction, including registering, needs a little test ETH for the network fee. Get some free from Google's faucet first, then come back here.",
      copy: "Copy your wallet address.",
      paste: (chain: string) => `Open the faucet, choose the ${chain} network, paste the address, then send.`,
      open: "Open Google's ETH faucet",
      waiting: "Waiting for ETH to arrive. The register button turns on by itself once it lands.",
    },
    profile: {
      title: "Introduce yourself",
      body: "So other members know who they're helping, and who's helping them.",
      save: "Save and continue",
    },
    balance: {
      body: "Contributions are paid in WHZD tokens. Claim 100 free WHZD from the test faucet to get started.",
      current: "Your balance now",
      later: "You can claim again every 24 hours with the balance button at the top, up to 1,000 WHZD.",
    },
    ready: {
      title: "Turn on Ready to help",
      body: "With Ready to help on, you're counted in every time a member asks for help, and you're told what your share is.",
      free: "You're still free to help or not with every request, and you can turn it off any time on the home page.",
      cta: "Turn on",
      later: "Maybe later",
    },
    welcome: {
      title: "Welcome, you're now a member.",
      ready: "When a member needs help, their request shows up on your home page and you get a notification.",
      notReady: "Turn on Ready to help on the home page when you're ready to be counted in.",
      cta: "Go to home",
    },
    txNote: "Your wallet will ask you to confirm the transaction. The fee is paid with test ETH, not real money.",
  },

  profile: {
    helped: "times helped",
    requests: "requests",
    address: "Wallet address",
    copyAddress: "Copy address",
    since: "Member since",
    edit: "Edit profile",
    save: "Save profile",
    form: {
      photoTooLarge: "The photo is larger than 2 MB.",
      nameRequired: "Enter your full name.",
      birthFuture: "Your birth date can't be in the future.",
      saved: "Profile saved.",
      photoRemoved: "Photo removed.",
      pickPhoto: "Choose a profile photo",
      photo: "Profile photo",
      photoHint: "Optional. PNG, JPG or WebP, up to 2 MB. Only signed-in members can see it.",
      photoPending: (button: string) => `The new photo is saved when you press “${button}”.`,
      cancel: "Cancel",
      removePhoto: "Remove photo",
      displayName: "Full name",
      nickname: "Nickname",
      nicknameHint: "What we call you.",
      city: "City or regency",
      cityHint: "Visible to other members.",
      birthDate: "Birth date",
      birthDateHint: "Only visible to you.",
      note: "Whitzard doesn't verify this information. Fill in only what you're comfortable with, just enough for other members to recognise you. Profile data is stored on Whitzard's server, not on the blockchain.",
    },
  },
};
