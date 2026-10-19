export type UserRole = 'CITIZEN' | 'MODERATOR' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';

export type CaseStatus =
  | 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'FORWARDED'
  | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLUTION_REPORTED'
  | 'VERIFICATION_PENDING' | 'VERIFIED_RESOLVED' | 'REJECTED'
  | 'DUPLICATE' | 'DISPUTED_CLOSURE' | 'REOPENED' | 'ESCALATED' | 'UNABLE_TO_RESOLVE';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  preferred_language: string;
  is_verified: boolean;
}

export interface Category {
  id: string;
  name_en: string;
  name_hi: string;
  slug: string;
  description?: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  name_hi: string;
}

export interface CaseTransition {
  id: string;
  from_status: CaseStatus;
  to_status: CaseStatus;
  actor_name: string;
  reason: string;
  created_at: string;
}

export interface CaseEvidence {
  id: string;
  evidence_type: string;
  file: string;
  created_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  category: Category;
  service_area: ServiceArea | null;
  status: CaseStatus;
  description: string;
  landmark: string;
  latitude: number;
  longitude: number;
  is_hotspot: boolean;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  verified_at: string | null;
  transitions: CaseTransition[];
  evidence: CaseEvidence[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm?: string;
  display_name: string;
  preferred_language?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
