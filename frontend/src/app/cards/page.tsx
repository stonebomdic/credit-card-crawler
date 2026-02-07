"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchBanks, fetchCards } from "@/lib/api";
import type { Bank, CreditCardListItem, PaginatedResponse } from "@/lib/types";

const CARD_TYPES = [
  { value: "", label: "全部類型" },
  { value: "visa", label: "VISA" },
  { value: "mastercard", label: "MasterCard" },
  { value: "jcb", label: "JCB" },
];

const PAGE_SIZE = 20;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function CardsPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [data, setData] = useState<PaginatedResponse<CreditCardListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBankId, setSelectedBankId] = useState<number | undefined>(undefined);
  const [selectedCardType, setSelectedCardType] = useState<string>("");
  const [page, setPage] = useState(1);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCards({
        page,
        size: PAGE_SIZE,
        bank_id: selectedBankId,
        card_type: selectedCardType || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [page, selectedBankId, selectedCardType]);

  useEffect(() => {
    fetchBanks().then(setBanks).catch((err) => {
      console.warn("Failed to load banks:", err);
    });
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBankId(val ? Number(val) : undefined);
    setPage(1);
  };

  const handleCardTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCardType(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">信用卡列表</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filter sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 space-y-4">
            <h2 className="font-semibold text-gray-700">篩選條件</h2>

            <div>
              <label htmlFor="bank-filter" className="block text-sm text-gray-600 mb-1">發卡銀行</label>
              <select
                id="bank-filter"
                value={selectedBankId ?? ""}
                onChange={handleBankChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部銀行</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="card-type-filter" className="block text-sm text-gray-600 mb-1">卡片類型</label>
              <select
                id="card-type-filter"
                value={selectedCardType}
                onChange={handleCardTypeChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CARD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Card grid */}
        <section className="flex-1">
          {loading && (
            <div className="text-center py-12 text-gray-500">載入中...</div>
          )}

          {error && (
            <div className="text-center py-12 text-red-600">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                共 {data.total} 張信用卡
              </p>

              {data.items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  找不到符合條件的信用卡
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.items.map((card) => (
                    <Link
                      key={card.id}
                      href={`/cards/${card.id}`}
                      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="mb-3 flex justify-center items-center h-32">
                          {card.image_url ? (
                            <img
                              src={card.image_url}
                              alt={card.name}
                              className="h-32 object-contain rounded"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                target.parentElement!.innerHTML =
                                  `<div class="h-32 w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded text-gray-400 text-sm px-4 text-center">${card.name}</div>`;
                              }}
                            />
                          ) : (
                            <div className="h-32 w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded text-gray-400 text-sm px-4 text-center">
                              {card.name}
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                          {card.name}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {card.bank_name}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {card.card_type && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {card.card_type}
                            </span>
                          )}
                          {card.annual_fee !== null && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {card.annual_fee === 0
                                ? "免年費"
                                : `年費 $${card.annual_fee.toLocaleString()}`}
                            </span>
                          )}
                          {card.base_reward_rate !== null && (
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              回饋 {card.base_reward_rate}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {data.pages > 1 && (
                <nav role="navigation" aria-label="分頁導覽" className="flex items-center justify-center gap-1.5 mt-8">
                  <button
                    aria-label="前往上一頁"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
                  >
                    上一頁
                  </button>
                  {getPageNumbers(data.page, data.pages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        aria-label={`前往第 ${p} 頁`}
                        aria-current={p === data.page ? "page" : undefined}
                        className={`w-9 h-9 text-sm rounded-md ${
                          p === data.page
                            ? "bg-blue-600 text-white font-semibold"
                            : "border border-gray-300 hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    aria-label="前往下一頁"
                    onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                    disabled={page === data.pages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-100"
                  >
                    下一頁
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
