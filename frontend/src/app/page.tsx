"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBanks, fetchCards } from "@/lib/api";

export default function Home() {
  const [bankCount, setBankCount] = useState<number | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [banks, cards] = await Promise.all([
          fetchBanks(),
          fetchCards({ page: 1, size: 1 }),
        ]);
        setBankCount(banks.length);
        setCardCount(cards.total);
      } catch {
        // Stats are non-critical; silently fail
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="py-12">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          台灣信用卡查詢與推薦
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          匯集台灣各大銀行信用卡資訊與最新優惠活動，
          透過個人化推薦引擎，幫助您找到最適合的信用卡。
        </p>
      </section>

      {/* Stats */}
      {!loading && bankCount !== null && cardCount !== null && (
        <section className="flex justify-center gap-8 mb-16">
          <div className="bg-white rounded-lg shadow px-8 py-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{bankCount}</div>
            <div className="text-sm text-gray-500 mt-1">合作銀行</div>
          </div>
          <div className="bg-white rounded-lg shadow px-8 py-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{cardCount}</div>
            <div className="text-sm text-gray-500 mt-1">信用卡</div>
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        <Link
          href="/cards"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            瀏覽信用卡
          </h2>
          <p className="text-gray-600 text-sm">
            依銀行、卡片類型篩選，瀏覽完整信用卡列表與優惠活動。
          </p>
        </Link>
        <Link
          href="/recommend"
          className="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            個人化推薦
          </h2>
          <p className="text-gray-600 text-sm">
            輸入您的消費習慣與偏好，取得最適合的信用卡推薦。
          </p>
        </Link>
      </section>
    </div>
  );
}
