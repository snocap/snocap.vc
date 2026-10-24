// Where the tool lives and what it reads. The Airtable ids are not secrets: the
// Worker holds no Airtable credential, so an id is useless without a signed-in
// user whose own account can already open the base.

export interface Env {
  /** The OAuth integration's client id (airtable.com/create/oauth). */
  AIRTABLE_CLIENT_ID?: string;
  /** Its client secret. The integration is a confidential client, so the token
   * exchange authenticates with id + secret on top of PKCE. */
  AIRTABLE_CLIENT_SECRET?: string;
  /** Encrypts the session and OAuth-state cookies. Its own value — never a gate
   * worker's secret. */
  FOLLOWUP_SESSION_SECRET?: string;
}

export interface Config {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
}

/** The three secrets, or null when any is unset — the 503 "not configured yet"
 * page rather than a crash or a half-working sign-in. */
export function configFrom(env: Env): Config | null {
  const clientId = env.AIRTABLE_CLIENT_ID?.trim();
  const clientSecret = env.AIRTABLE_CLIENT_SECRET?.trim();
  const sessionSecret = env.FOLLOWUP_SESSION_SECRET?.trim();
  if (!clientId || !clientSecret || !sessionSecret) return null;
  return { clientId, clientSecret, sessionSecret };
}

export const ORIGIN = "https://snocap.vc";
export const TOOL_PATH = "/fundraising/followup";
export const OAUTH_PATH = `${TOOL_PATH}/oauth`;
export const REDIRECT_URI = `${ORIGIN}${OAUTH_PATH}/callback`;

/** What a submit may carry. maxBytes is Airtable's uploadAttachment limit: the
 * page re-encodes a larger image as a smaller JPEG before it is sent and
 * refuses any other file over it, and this Worker refuses anything still over. */
export const ATTACHMENT_LIMITS = {
  maxFiles: 10,
  maxBytes: 5 * 1024 * 1024,
};

export const SCOPES = [
  "data.records:read",
  "data.records:write",
  "data.recordComments:read",
  "data.recordComments:write",
  "schema.bases:read",
  "user.email:read",
];

export const AIRTABLE = {
  base: "app3GsSEv7NaMb8f3",
  campaigns: "tblhwdl6hWeqVaoW6",
  /** Campaigns → "Follow Ups". Airtable applies its filter and sort when the
   * list call names it, so the cards follow Jon's own order. */
  followUpsView: "viwAweTPJ9YVQYcEF",
  interactions: "tbluHbaGVyVA0cNXD",
  limitedPartners: "tblYixL1c36YiVgs3",
  contacts: "tbl2qTorn8YU26o5D",
  /** KB's collaborator id. A comment carrying `@[<this>]` is an instruction to
   * KB: its comment intake acts on it and replies in the thread. */
  kbUserId: "usrt57orTxVb75I3W",
} as const;

/** The base's own field names, which the REST API keys records by. */
export const FIELD = {
  campaign: "Campaign",
  limitedPartner: "Limited Partner",
  representative: "Representative",
  dealStatus: "Deal Status",
  dealValue: "Deal Value (K)",
  nextTouch: "Next Touch Point",
  probability: "Probability",
  interactions: "Interactions",
  interactionCampaign: "Campaign",
  attachments: "Attachments",
  closedLostReason: "Closed Lost Reason",
  createdBy: "Created By",
  lpEntity: "Entity",
  lpPrimaryContacts: "Primary Contacts",
  summary: "Summary",
  details: "Details",
  channel: "Channel",
  triggeredBy: "Triggered By",
  occurredOn: "Occurred on",
  contactName: "Name",
  email: "Primary Email",
  phone: "Primary Phone",
  profile: "Profile",
} as const;
