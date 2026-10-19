export type UserRole = 'CITIZEN' | 'MODERATOR' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';

export type CaseStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'FORWARDED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLUTION_REPORTED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED_RESOLVED'
  | 'REJECTED'
  | 'DUPLICATE'
  | 'DISPUTED_CLOSURE'
  | 'REOPENED'
  | 'ESCALATED'
  | 'UNABLE_TO_RESOLVE';

export interface DbUser {
  id: string;
  email: string;
  username: string;
  password: string;
  display_name: string;
  role: UserRole;
  preferred_language: string;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  phone_hash: string | null;
  last_login: Date | null;
  date_joined: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: UserRole;
  preferred_language: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_hi: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  name_hi: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  responsible_team_name: string;
  contact_info: string | null;
  escalation_rules: Record<string, any>;
  operating_hours: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseTransition {
  id: string;
  from_status: CaseStatus;
  to_status: CaseStatus;
  actor_name: string;
  reason: string;
  evidence_refs?: Record<string, any> | null;
  created_at: string;
}

export interface CaseEvidence {
  id: string;
  evidence_type: string;
  file: string;
  content_type: string;
  file_size: number;
  ai_metadata?: Record<string, any> | null;
  created_at: string;
}

export interface CaseObservation {
  id: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  observed_at: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  feedback_type: string;
  rating: number | null;
  comment: string;
  is_dispute: boolean;
  created_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  category: {
    id: string;
    name_en: string;
    name_hi: string;
    slug: string;
  };
  service_area: {
    id: string;
    name: string;
    name_hi: string;
  } | null;
  assigned_operator: {
    id: string;
    display_name: string;
    email: string;
  } | null;
  primary_reporter: {
    id: string;
    display_name: string;
  };
  status: CaseStatus;
  description: string;
  landmark: string;
  latitude: number;
  longitude: number;
  is_hotspot: boolean;
  external_reference: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  transitions?: CaseTransition[];
  evidence?: CaseEvidence[];
  observations?: CaseObservation[];
  feedbacks?: Feedback[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface JwtPayload {
  user_id: string;
  email: string;
  role: UserRole;
  type?: 'access' | 'refresh';
}
