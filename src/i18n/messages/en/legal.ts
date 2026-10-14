import type { legal as reference } from "../pt-BR/legal";

export const legal: typeof reference = {
  draftTitle: "Draft without legal review",
  draftText:
    "This text describes how Ticketfy works today. It doesn't claim compliance with Brazil's LGPD, the Consumer Protection Code or any other law, and it needs legal review before it can serve as an official document.",
  updated: "Last updated: October 2026.",
  footerTerms: "Terms of use",
  footerPrivacy: "Privacy",
  footerContact: "Contact about your data",
  registerConsent: {
    before: "By creating an account, you agree to the ",
    terms: "Terms of use",
    middle: " and confirm that you've read the ",
    privacy: "Privacy policy",
    after: ".",
  },
  terms: {
    pageTitle: "Terms of use",
    title: "Terms of use",
    subtitle: "The rules for using Ticketfy, for buyers and for event organizers.",
    sections: [
      {
        title: "What Ticketfy is",
        paragraphs: [
          "Ticketfy is a platform for selling event tickets. Organizers publish events and ticket batches, and buyers hold, pay for and receive tickets with a unique code.",
          "This is a demo environment: payment is simulated and nothing is actually charged.",
        ],
      },
      {
        title: "Account",
        paragraphs: [
          "To buy, transfer or organize, you need an account with a name, email and password. Each person is responsible for keeping their password secret.",
          "The session ends after 30 minutes without use and, at most, 12 hours after signing in. Changing the password ends the sessions on other devices.",
          "The Ticketfy team can suspend an account. A suspended account can't sign in, its pending orders are cancelled and tickets already paid stay valid.",
        ],
      },
      {
        title: "Purchases and tickets",
        paragraphs: [
          "When you confirm an order, the tickets are held for a few minutes (currently 15). If payment isn't made in that time, the order expires and the tickets go back on sale.",
          "Each ticket's price is recorded in the order at the time of purchase and doesn't change afterwards. Discount coupons follow the rules set by the organizer.",
          "Each ticket has a code that is valid for a single entry. Whoever shows the code first gets in, so it shouldn't be shared.",
          "Sales for an event end when it starts.",
        ],
      },
      {
        title: "Refunds and cancellation",
        paragraphs: [
          "Buyers can request a refund for a paid order up to the configured deadline before the event starts (currently 48 hours). The refund covers the whole order and cancels all its tickets.",
          "Orders with a ticket that was already used or transferred can't be refunded.",
          "If the organizer cancels the event, paid orders are refunded and their tickets cancelled, with no deadline.",
        ],
      },
      {
        title: "Ticket transfers",
        paragraphs: [
          "A valid ticket can be transferred to someone else with a Ticketfy account, until the event starts and up to a transfer limit per ticket (currently 3).",
          "When a ticket is transferred, the old code stops working and the recipient gets a new code. Whoever transferred it can no longer request a refund for that order.",
        ],
      },
      {
        title: "Organizers",
        paragraphs: [
          "Any account can become an organizer account, with no approval. Organizers are responsible for the event information, the ticket batches and delivering what they advertise.",
          "Each paid sale is subject to the platform fee (currently 5% of the amount paid). The balance becomes available a few days after the event ends and can be withdrawn by Pix, subject to the minimum amount.",
          "Withdrawals may be reviewed before they're sent. The Ticketfy team can block an organizer's withdrawals, and changing the Pix key blocks withdrawals for 48 hours.",
        ],
      },
      {
        title: "Prohibited use",
        paragraphs: [
          "Ticketfy may not be used for fraud, abusive reselling, scams, unauthorized penetration testing or any illegal activity. Accounts involved in these uses may be suspended.",
        ],
      },
      {
        title: "Availability and changes",
        paragraphs: [
          "The service may be unavailable for maintenance or because of failures. These terms may change, and the date of the last update is at the top of the page.",
        ],
      },
    ],
  },
  privacy: {
    pageTitle: "Privacy policy",
    title: "Privacy policy",
    subtitle: "What data Ticketfy keeps, what for, and what you can do with it.",
    sections: [
      {
        title: "Data we keep",
        paragraphs: [
          "From your account: name, email, password (only as a hash, never the text itself), the address of your profile photo if you provide one, and your preferred language.",
          "From purchases: orders, items, amounts, coupons used, payments, tickets and transfers sent and received.",
          "From organizers: events, ticket batches, coupons, balance, statement, withdrawals and payout details. The document (CPF or CNPJ) and the Pix key are stored encrypted.",
          "Ticketfy doesn't receive credit card data.",
        ],
      },
      {
        title: "What we use it for",
        paragraphs: [
          "To create and protect your account, process orders, issue and validate tickets, pass sales revenue on to organizers and show the site in the language you chose.",
          "Sensitive actions, such as withdrawals, password changes, transfers and account deletion, are kept in an audit log that can't be changed.",
        ],
      },
      {
        title: "Who sees your data",
        paragraphs: [
          "An event's organizer sees the name and email of buyers and, in the attendee list, the name of each ticket holder and the last 4 characters of the code.",
          "In a transfer, the recipient doesn't see your data and you don't see the recipient's data.",
          "The Ticketfy administration team accesses data when it needs to review withdrawals, suspensions and the audit log. The system runs on contracted hosting and database providers.",
        ],
      },
      {
        title: "Cookies and browser storage",
        paragraphs: [
          "We use a session cookie, readable only by the server, to renew your sign-in securely.",
          "Browser storage keeps the theme (light or dark), the language you chose, a flag saying a session is open and the time of your last activity, so the session can end after inactivity. We don't use advertising cookies.",
        ],
      },
      {
        title: "Technical logs",
        paragraphs: [
          "Each request gets an identification code, used to investigate errors. Logs don't store passwords, tokens or form contents.",
        ],
      },
      {
        title: "Your rights in practice",
        paragraphs: [
          "In My account, Privacy tab, you can download all your data in a JSON file by confirming your password. There's a limit of exports per period (currently 3 every 24 hours).",
          "In the same tab, you can delete your account. Name, email, photo and password are replaced, sessions are ended and payout details are erased. Deletion is refused while there is a balance, a withdrawal in progress or blocked, an event with sales or a valid ticket for an upcoming event.",
          "You can change your photo, password and language at any time in My account.",
        ],
      },
      {
        title: "How long we keep data",
        paragraphs: [
          "Orders, payments, the statement, withdrawals and the audit log are kept after an account is deleted, linked to the anonymized account, because financial records need to balance. There is no routine yet that erases this data after a set period; this point is pending legal review.",
        ],
      },
    ],
    contact: {
      title: "Contact for the person responsible for your data",
      paragraphs: [
        "Through the email below, you reach the person responsible for Ticketfy's personal data. You can use it to request access to, correction, export and deletion of your data, and to ask questions about this policy.",
        "This channel also works when you can't use the site's screens, including if your account is suspended. Write from the email registered on your account or include that email in your message; we may ask you to confirm your identity before handling the request, to protect your data.",
      ],
      emailLabel: "Email of the person responsible for the data:",
    },
  },
};
