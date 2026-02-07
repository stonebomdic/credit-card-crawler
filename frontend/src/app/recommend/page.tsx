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

const AMOUNT_PRESETS = [10000, 30000, 50000, 100000];

const STEP_LABELS = ["每月消費", "消費比例", "偏好條件"];

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
  const [step, setStep] = useState(1);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(30000);
  const [customAmount, setCustomAmount] = useState<string>("");
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

  const handleSubmit = async () => {
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

  const handleSelectPreset = (amount: number) => {
    setMonthlyAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setMonthlyAmount(num);
    }
  };

  const isPreset = AMOUNT_PRESETS.includes(monthlyAmount) && customAmount === "";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        個人化信用卡推薦
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Wizard Form */}
        <div className="w-full lg:w-[440px] flex-shrink-0 space-y-6">
          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              {STEP_LABELS.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = step > stepNum;
                const isCurrent = step === stepNum;
                return (
                  <div key={label} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isCompleted ? "✓" : stepNum}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          isCurrent ? "text-blue-600 font-medium" : "text-gray-500"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {idx < STEP_LABELS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-1 -mt-4 ${
                          step > stepNum ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1: Monthly Amount */}
          {step === 1 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-4">每月消費金額</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {AMOUNT_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleSelectPreset(amount)}
                    className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                      monthlyAmount === amount && isPreset
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
              <div>
                <label htmlFor="custom-amount" className="block text-sm text-gray-500 mb-1">
                  自訂金額
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    id="custom-amount"
                    type="number"
                    min={0}
                    step={1000}
                    value={customAmount}
                    placeholder="輸入自訂金額"
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                目前設定：<span className="font-semibold text-gray-900">${monthlyAmount.toLocaleString()}</span>/月
              </p>
            </div>
          )}

          {/* Step 2: Spending Habits */}
          {step === 2 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-1">消費比例分配</h2>
              <p className="text-xs text-gray-400 mb-3">
                調整各類別比例，系統會自動正規化為合計 100%。
                目前合計：
                <span className={habitsTotal === 100 ? "text-green-600" : "text-orange-600"}>
                  {habitsTotal}%
                </span>
              </p>

              {/* Visual ratio bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {CATEGORIES.map(({ key, label }) => {
                  const pct = habitsTotal > 0 ? (habits[key] / habitsTotal) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={key}
                      title={`${label} ${Math.round(pct)}%`}
                      style={{ width: `${pct}%` }}
                      className="first:rounded-l-full last:rounded-r-full transition-all"
                      data-category={key}
                    />
                  );
                })}
              </div>
              <style>{`
                [data-category="dining"] { background: #3b82f6; }
                [data-category="online_shopping"] { background: #8b5cf6; }
                [data-category="transport"] { background: #06b6d4; }
                [data-category="overseas"] { background: #f59e0b; }
                [data-category="convenience_store"] { background: #10b981; }
                [data-category="department_store"] { background: #ec4899; }
                [data-category="supermarket"] { background: #f97316; }
                [data-category="streaming"] { background: #6366f1; }
                [data-category="others"] { background: #9ca3af; }
              `}</style>

              <div className="space-y-3">
                {CATEGORIES.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <label htmlFor={`habit-${key}`} className="text-gray-600 flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          data-category={key}
                        />
                        {label}
                      </label>
                      <span className="text-gray-900 font-medium">{habits[key]}%</span>
                    </div>
                    <input
                      id={`habit-${key}`}
                      type="range"
                      min={0}
                      max={100}
                      value={habits[key]}
                      onChange={(e) => handleHabitChange(key, Number(e.target.value))}
                      aria-label={`${label}消費比例`}
                      className="w-full accent-blue-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-700 mb-3">偏好條件</h2>
              <p className="text-xs text-gray-400 mb-4">點擊標籤選擇或取消偏好</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="偏好條件選擇">
                {PREFERENCES.map(({ value, label }) => {
                  const isSelected = preferences.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => togglePreference(value)}
                      aria-pressed={isSelected}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>}
                      {label}
                    </button>
                  );
                })}
              </div>
              {preferences.length > 0 && (
                <p className="text-xs text-gray-400 mt-3">
                  已選擇 {preferences.length} 項偏好
                </p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                上一步
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                下一步
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                aria-label={loading ? "分析中" : "取得推薦"}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "分析中..." : "取得推薦"}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <section className="flex-1" aria-label="推薦結果">
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-4 mb-4" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {results === null && !error && (
            <div className="text-center py-16 text-gray-400">
              完成三個步驟後按下「取得推薦」
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
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
                      <div className="text-2xl font-bold text-green-600">
                        ${rec.estimated_monthly_reward.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">預估月回饋</div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-4 ml-8">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-16 flex-shrink-0">綜合評分</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${rec.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-blue-600 w-10 text-right">
                        {rec.score}
                      </span>
                    </div>
                  </div>

                  {rec.reasons.length > 0 && (
                    <ul className="mt-3 ml-8 space-y-1" aria-label="推薦理由">
                      {rec.reasons.map((reason, i) => (
                        <li
                          key={i}
                          className="text-sm text-gray-600 flex items-start gap-2"
                        >
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">●</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
