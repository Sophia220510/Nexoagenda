export type MemberRole = "OWNER" | "RECEPTIONIST" | "PROFESSIONAL";
export type AppointmentStatus =
  "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Membership {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  businesses: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    logo_url: string | null;
    timezone: string;
    active: boolean;
    description?: string | null;
    address?: string | null;
    instagram_url?: string | null;
    reminders_enabled?: boolean;
    reminder_24h_enabled?: boolean;
    reminder_2h_enabled?: boolean;
    reminder_template?: string | null;
    professionals_can_view_commission?: boolean;
  } | null;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  default_duration_minutes: number;
}

export interface PublicProfessional {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  service_ids: string[];
}

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  phone: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  instagram_url: string | null;
  timezone: string;
  professionals: PublicProfessional[];
  services: PublicService[];
}
