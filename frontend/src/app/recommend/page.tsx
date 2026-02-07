"use client";

import { useState } from "react";
import Link from "next/link";
import { getRecommendations } from "@/lib/api";
import type { CardRecommendation, SpendingHabits } from "@/lib/types";

const CATEGORIES: { key: keyof SpendingHabits; label: string }[] = [
  { key: "dining", label: "餐飲" },
  { key: "online_shopping", label: "網購" },
  { key: "transport", label: "交通" },
  { key: "overseas", label: "海外" },
  { key: "convenience_store", label: "超商" },
  { key: "department_store", label: "百貨" },
  { key: "supermarket", label: "超市" },
  { key: "streaming", label: "串流平台" },
  { key: "others", label: "其他" },
];

const PREFERENCES: { value: string; label: string }[] = [
  { value: "no_annual_fee", label: "免年費" },
  { value: "high_reward", label: "高回饋" },
  { value: "cashback", label: "現金回饋" },
  { value: "miles", label: "哩程累積" },
  { value: "travel", label: "旅遊相關" },
  { value: "mobile_pay", label: "行動支付加碼" },
  { value: "dining", label: "餐飲優惠" },
  { value: "online_shopping", label: "網購優惠" },
  { value: "new_cardholder", label: "新戶/首刷優惠" },
  { value: "installment", label: "分期零利率" },
  { value: "streaming", label: "串流平台優惠" },
  { value: "travel_insurance", label: "旅遊保險" },
];

function normalizeHabits(raw: SpendingHabits): SpendingHabits {
  const total = Object.values(raw).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return {
      dining: 0.15, online_shopping: 0.15, transport: 0.15, overseas: 0.1,
      convenience_store: 0.1, department_store: 0.1, supermarket: 0.1,
      streaming: 0.05, others: 0.1,
    };
  }
  const result: SpendingHabits = { ...raw };
  for (const key of Object.keys(result) as (keyof SpendingHabits)[]) {
    result[key] = Math.round((result[key] / total) * 100) / 100;
  }
  return result;
}

export default function RecommendPage() {
  const [monthlyAmount, setMonthlyAmount] = useState<number>(30000);
  const [habits, setHabits] = useState<SpendingHabits>({
    dining: 20,
    online_shopping: 15,
    transport: 15,
    overseas: 10,
    convenience_store: 10,
    department_store: 10,
    supermarket: 10,
    streaming: 5,
    others: 5,
  });
  const [preferences, setPreferences] = useState<string[]>([]);
  const [results, setResults] = useState<CardRecommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habitsTotal = Object.values(habits).reduce((s, v) => s + v, 0);

  const handleHabitChange = (key: keyof SpendingHabits, value: number) => {
    setHabits((prev) => ({ ...prev, [key]: value }));
  };

  const togglePreference = (value: string) => {
    setPreferences((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalized = normalizeHabits(habits);
      const response = await getRecommendations({
        spending_habits: normalized,
        monthly_amount: monthlyAmount,
        preferences,
        limit: 5,
      });
      setResults(response.recommendations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "推薦失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        個人化信用卡推薦
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full lg:w-96 flex-shrink-0 space-y-6"
          aria-label="信用卡推薦條件表單"
        >
          {/* Monthly spending */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3">每月消費金額</h2>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input
                id="monthly-amount"
                type="number"
                min={0}
                step={1000}
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                aria-label="每月消費金額"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Spending habits */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-1">消費比例分配</h2>
            <p className="text-xs text-gray-400 mb-3">
              調整各類別比例，系統會自動正規化為合計 100%。
              目前合計：
              <span
                className={
                  habitsTotal === 100 ? "text-green-600" : "text-orange-600"
                }
              >
                {habitsTotal}%
              </span>
            </p>
            <div className="space-y-3">
              {CATEGORIES.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <label htmlFor={`habit-${key}`} className="text-gray-600">{label}</label>
                    <span className="text-gray-900 font-medium">
                      {habits[key]}%
                    </span>
                  </div>
                  <input
                    id={`habit-${key}`}
                    type="range"
                    min={0}
                    max={100}
                    value={habits[key]}
                    onChange={(e) =>
                      handleHabitChange(key, Number(e.target.value))
                    }
                    aria-label={`${label}消費比例`}
                    className="w-full accent-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-3">偏好條件</h2>
            <div className="space-y-2" role="group" aria-label="偏好條件選擇">
              {PREFERENCES.map(({ value, label }) => (
                <label
                  key={value}
                  htmlFor={`pref-${value}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    id={`pref-${value}`}
                    type="checkbox"
                    checked={preferences.includes(value)}
                    onChange={() => togglePreference(value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-label={loading ? "分析中" : "取得推薦"}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "分析中..." : "取得推薦"}
          </button>
        </form>

        {/* Results */}
        <section className="flex-1" aria-label="推薦結果">
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-4 mb-4" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {results === null && !error && (
            <div className="text-center py-16 text-gray-400">
              填寫左方條件後按下「取得推薦」
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              找不到符合條件的信用卡，請調整篩選條件
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-700">
                推薦結果（共 {results.length} 張）
              </h2>
              {results.map((rec) => (
                <div
                  key={rec.card_id}
                  className="bg-white rounded-lg shadow p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                          aria-label={`排名第 ${rec.rank} 名`}
                        >
                          {rec.rank}
                        </span>
                        <Link
                          href={`/cards/${rec.card_id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {rec.card_name}
                        </Link>
                      </div>
                      <p className="text-sm text-gray-500 ml-8">
                        {rec.bank_name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-500">綜合評分</div>
                      <div className="text-xl font-bold text-blue-600">
                        {rec.score}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 ml-8">
                    <div className="text-sm">
                      <span className="text-gray-500">預估每月回饋：</span>
                      <span className="font-semibold text-green-700">
                        ${rec.estimated_monthly_reward.toLocaleString()}
                      </span>
                    </div>

                    {rec.reasons.length > 0 && (
                      <ul className="mt-2 space-y-1" aria-label="推薦理由">
                        {rec.reasons.map((reason, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-600 flex items-start gap-1"
                          >
                            <span className="text-blue-400 mt-0.5">-</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
