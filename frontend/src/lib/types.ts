// ============================================================
// Bank
// ============================================================
export interface Bank {
  id: number;
  name: string;
  code: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
}

// ============================================================
// Credit Card
// ============================================================
export interface CreditCardFeatures {
  [key: string]: string | number | boolean | string[];
}

export interface CreditCardListItem {
  id: number;
  bank_id: number;
  bank_name: string;
  name: string;
  card_type: string | null;
  annual_fee: number | null;
  annual_fee_waiver: string | null;
  image_url: string | null;
  apply_url: string | null;
  min_income: number | null;
  features: CreditCardFeatures | null;
  base_reward_rate: number | null;
}

export interface CreditCardDetail {
  id: number;
  bank_id: number;
  bank: Bank;
  name: string;
  card_type: string | null;
  annual_fee: number | null;
  annual_fee_waiver: string | null;
  image_url: string | null;
  apply_url: string | null;
  min_income: number | null;
  features: CreditCardFeatures | null;
  base_reward_rate: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Promotion
// ============================================================
export interface Promotion {
  id: number;
  card_id: number;
  title: string;
  description: string | null;
  category: string | null;
  reward_type: string | null;
  reward_rate: number | null;
  reward_limit: number | null;
  min_spend: number | null;
  start_date: string | null;
  end_date: string | null;
  terms: string | null;
  source_url: string | null;
}

// ============================================================
// Pagination
// ============================================================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ============================================================
// Recommendation
// ============================================================
export interface SpendingHabits {
  dining: number;
  online_shopping: number;
  transport: number;
  overseas: number;
  others: number;
}

export interface RecommendRequest {
  spending_habits: SpendingHabits;
  monthly_amount: number;
  preferences: string[];
  limit: number;
}

export interface CardRecommendation {
  rank: number;
  card_id: number;
  card_name: string;
  bank_name: string;
  score: number;
  estimated_monthly_reward: number;
  reasons: string[];
}

export interface RecommendResponse {
  recommendations: CardRecommendation[];
}
