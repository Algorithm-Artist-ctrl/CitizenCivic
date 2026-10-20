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
  original_description?: string | null;
  structured_data?: {
    title?: string;
    category_slug?: string;
    observed_impact?: string;
    detected_hazards?: string[];
    missing_information?: string[];
  } | null;
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

export interface MunicipalState {
  code: string;
  name: string;
  name_hi: string;
  capital: string;
  region: string;
  ulb_count?: number;
}

export interface MunicipalULB {
  id: string;
  code: string;
  name: string;
  name_hi: string;
  ulb_type: string;
  state_code: string;
  state_name?: string;
  state_name_hi?: string;
  headquarters: string;
  population_census_2011: number;
  population_reference_year: number;
  area_sq_km: number;
  latitude: number;
  longitude: number;
  official_website: string;
  total_revenue_cr?: number;
  total_expenditure_cr?: number;
  own_source_revenue_cr?: number;
  per_capita_expenditure?: number;
  swachh_rank?: number;
  swachh_score?: number;
  gfc_stars?: string;
  odf_status?: string;
}

export interface MunicipalObservation {
  id: string;
  metric_id: string;
  metric_category: string;
  metric_name: string;
  metric_name_hi: string;
  metric_definition: string;
  metric_methodology: string;
  higher_is_better: boolean | null;
  value_numeric: number | null;
  value_text: string | null;
  unit: string;
  reporting_period: string;
  assessment_year: number;
  data_quality_status: string;
  source_id: string;
  source_publisher: string;
  source_dataset_title: string;
  source_url: string;
  source_license: string;
  source_documentation: string;
  recorded_at: string;
}

export interface MunicipalDataSource {
  id: string;
  publisher: string;
  dataset_title: string;
  source_url: string;
  access_method: string;
  license: string;
  documentation: string;
  retrieved_at: string;
}

export interface MunicipalMetric {
  id: string;
  category: string;
  name: string;
  name_hi: string;
  unit: string;
  definition: string;
  methodology: string;
  higher_is_better: boolean | null;
}

