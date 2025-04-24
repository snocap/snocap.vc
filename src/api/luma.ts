export enum LumaCalendarId {
  NineZeroSF = "cal-Wqq3vYSYpKhg3ek",
  NineZeroSeattle = "cal-by6t1yIfVGAyqRH",
  Snocap = "cal-mJqWook0FdRrCQv",
  Envest = "cal-Hw3Hn1kmTxjcsSW",
  SweetFarm = "cal-WLUvftlYSglZU5J",
}

export interface LumaEvent {
  api_id: string;
  event: {
    api_id: string;
    calendar_api_id: string;
    cover_url: string;
    end_at: string;
    event_type: string;
    hide_rsvp: boolean;
    location_type: string;
    name: string;
    host?: string;
    one_to_one: boolean;
    recurrence_id: string | null;
    show_guest_list: boolean;
    start_at: string;
    timezone: string;
    url: string;
    user_api_id: string;
    visibility: string;
    waitlist_enabled: boolean;
    virtual_info: {
      has_access: boolean;
    };
    geo_longitude: string | null;
    geo_latitude: string | null;
    geo_address_info: {
      type: string;
      address: string;
      mode: string;
    } | null;
    geo_address_visibility: string;
    coordinate: {
      latitude: number;
      longitude: number;
    } | null;
  };
  cover_image: {
    vibrant_color: string | null;
    colors: string[];
  };
  calendar: {
    access_level: string;
    api_id: string;
    avatar_url: string;
    cover_image_url: string;
    description_short: string | null;
    event_submission_restriction: string;
    geo_city: string | null;
    geo_country: string | null;
    geo_latitude: string | null;
    geo_longitude: string | null;
    geo_region: string | null;
    google_measurement_id: string | null;
    instagram_handle: string | null;
    launch_status: string;
    linkedin_handle: string | null;
    luma_plus_active: boolean;
    meta_pixel_id: string | null;
    name: string;
    personal_user_api_id: string | null;
    refund_policy: string | null;
    slug: string | null;
    social_image_url: string | null;
    stripe_account_id: string | null;
    tax_config: string | null;
    tiktok_handle: string | null;
    timezone: string | null;
    tint_color: string;
    track_meta_ads_from_luma: boolean;
    twitter_handle: string | null;
    verified_at: string | null;
    website: string | null;
    youtube_handle: string | null;
    coordinate: {
      latitude: number;
      longitude: number;
    } | null;
    is_personal: boolean;
  };
  start_at: string;
  hosts: {
    api_id: string;
    avatar_url: string;
    bio_short: string | null;
    instagram_handle: string | null;
    last_online_at: string | null;
    linkedin_handle: string | null;
    name: string;
    tiktok_handle: string | null;
    timezone: string;
    twitter_handle: string | null;
    username: string | null;
    website: string | null;
    youtube_handle: string | null;
    access_level: string;
    event_api_id: string;
  }[];
  guest_count: number;
  ticket_count: number;
  ticket_info: {
    price: {
      cents: number;
      currency: string;
      is_flexible: boolean;
    } | null;
    is_free: boolean;
    max_price: number | null;
    is_sold_out: boolean;
    spots_remaining: number | null;
    is_near_capacity: boolean;
    require_approval: boolean;
    currency_info: {
      currency: string;
    } | null;
  };
  featured_guests: {
    api_id: string;
    avatar_url: string;
    bio_short: string | null;
    instagram_handle: string | null;
    last_online_at: string | null;
    linkedin_handle: string | null;
    name: string;
    tiktok_handle: string | null;
    timezone: string;
    twitter_handle: string | null;
    username: string | null;
    website: string | null;
    youtube_handle: string | null;
  }[];
  role: string | null;
  calendar_api_id: string;
  is_manager: boolean;
  platform: string;
  status: string;
  submitted_by_user_api_id: string;
  geo_latitude: string | null;
  geo_longitude: string | null;
  tags: {
    api_id: string;
    name: string;
    color: string;
  }[];
  coordinate: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface LumaResponse {
  entries: LumaEvent[];
  has_more: boolean;
  next_cursor: string;
}

export interface SimpleLumaEvent {
  start: Date;
  title: string;
  org: string;
  url: string;
}

export async function fetchUpcomingEvents(
  id: LumaCalendarId,
  pageSize = 4,
): Promise<SimpleLumaEvent[]> {
  const response = await fetch(
    `https://api.lu.ma/calendar/get-items?calendar_api_id=${id}&period=future&pagination_limit=${pageSize}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en",
      },
      referrer: "https://lu.ma/",
    },
  );
  if (response.status !== 200) {
    throw new Error(`Error fetching Luma events: ${response.status}`);
  }
  const body = (await response.json()) as LumaResponse;
  if (!body.entries) {
    throw new Error(`Error fetching Luma events: ${body}`);
  }
  return body.entries.map((entry) => ({
    start: new Date(entry.start_at ?? entry.event.start_at),
    title: entry.event.name,
    org: entry.calendar?.name ?? entry.event.host,
    url: entry.event.url.startsWith("http")
      ? entry.event.url
      : `https://lu.ma/${entry.event.url}`,
  }));
}
