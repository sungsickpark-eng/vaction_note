export interface User {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_photo?: string;
  region?: string;
  start_date?: string;
  end_date?: string;
  visibility: "private" | "link" | "public";
  created_at: string;
  updated_at?: string;
}

export interface TripDay {
  id: string;
  trip_id: string;
  date: string;
  title?: string;
  waypoints: Waypoint[];
}

export interface TripDetail extends Trip {
  days: TripDay[];
}

export interface Waypoint {
  id: string;
  trip_day_id: string;
  order: number;
  place_name: string;
  address?: string;
  kakao_place_id?: string;
  lat?: number;
  lng?: number;
  visit_date?: string;
  arrival_time?: string;
  end_time?: string;
  transport_mode?: "walk" | "car" | "transit";
  note?: string;
}

export interface Memo {
  id: string;
  trip_id: string;
  trip_day_id?: string;
  waypoint_id?: string;
  content: string;
  lat?: number;
  lng?: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Photo {
  id: string;
  trip_id: string;
  waypoint_id?: string;
  memo_id?: string;
  image_url: string;
  s3_key?: string;
  thumb_key?: string;
  lat?: number;
  lng?: number;
  taken_at?: string;
  caption?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
