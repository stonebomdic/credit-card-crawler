import type {
  Bank,
  CreditCardListItem,
  CreditCardDetail,
  Promotion,
  PaginatedResponse,
  RecommendRequest,
  RecommendResponse,
} from "./types";

const BASE_URL = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---- Banks ----

export async function fetchBanks(): Promise<Bank[]> {
  return fetchJSON<Bank[]>(`${BASE_URL}/banks`);
}

// ---- Cards ----

export interface FetchCardsParams {
  page?: number;
  size?: number;
  bank_id?: number;
  card_type?: string;
}

export async function fetchCards(
  params: FetchCardsParams = {}
): Promise<PaginatedResponse<CreditCardListItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.size) query.set("size", String(params.size));
  if (params.bank_id) query.set("bank_id", String(params.bank_id));
  if (params.card_type) query.set("card_type", params.card_type);

  const qs = query.toString();
  return fetchJSON<PaginatedResponse<CreditCardListItem>>(
    `${BASE_URL}/cards${qs ? `?${qs}` : ""}`
  );
}

export async function fetchCard(id: number): Promise<CreditCardDetail> {
  return fetchJSON<CreditCardDetail>(`${BASE_URL}/cards/${id}`);
}

export async function fetchCardPromotions(id: number): Promise<Promotion[]> {
  return fetchJSON<Promotion[]>(`${BASE_URL}/cards/${id}/promotions`);
}

// ---- Recommendations ----

export async function getRecommendations(
  body: RecommendRequest
): Promise<RecommendResponse> {
  return fetchJSON<RecommendResponse>(`${BASE_URL}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
