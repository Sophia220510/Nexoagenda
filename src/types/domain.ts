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
    professionals_can_view_commission?: boolean;
    business_mode?: "SOLO" | "TEAM";
    operation_profile?: "SOLO" | "ESSENTIAL_TEAM" | "GROWING_OPERATION" | "STRUCTURED_OPERATION";
    feature_flags?: Record<string, boolean>;
    slot_interval_minutes?: number;
    accepted_payment_methods?: Array<"PIX" | "CASH" | "DEBIT_CARD" | "CREDIT_CARD" | "OTHER">;
    payment_fee_bps?: Record<string, number>;
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
  whatsapp_phone?: string | null;
  receive_booking_whatsapp?: boolean;
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
  slot_interval_minutes?: number;
  professionals: PublicProfessional[];
  services: PublicService[];
}
