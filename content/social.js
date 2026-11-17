/**
 * Community channels shown in the footer's "global network" column.
 *
 * `href` is rendered as a plain link. Entries without `href` are *guarded*: the
 * address lives only on the server (`app/api/social/route.js`) and is handed to
 * the browser encoded, on click — the same treatment as the contact mailbox.
 * Discord and WhatsApp are invite links that expire and get harvested, so they
 * are not written into the markup.
 *
 * Order is the community's own: the two chat channels first, then the social
 * accounts from the regional X handle through to the global NeuroTechX ones.
 */
export const SOCIAL_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp", guarded: true },
  { id: "discord", label: "Discord", guarded: true },
  {
    id: "x",
    label: "X",
    href: "https://x.com/NeurotechXAsia/",
    note: "@NeurotechXAsia",
  },
  {
    id: "slack",
    label: "Slack",
    // the join form neurotechx.org itself points its "JOIN SLACK" link at
    href: "https://docs.google.com/forms/d/e/1FAIpQLSfZyzhVdOLU8_oQ4NylHL8EFoKLIVmryGXA4u7HDsZpkTryvg/viewform",
    note: "neurotechx.org",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/neurotechx/",
    note: "NeuroTechX",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/neurotechx",
    note: "NeuroTechX",
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/NeuroTechX-Asia",
    note: "NeuroTechX Asia",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    href: "https://huggingface.co/NeuroTechX",
    note: "NeuroTechX",
  },
];
