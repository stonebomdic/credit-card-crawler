"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchBanks, fetchCards } from "@/lib/api";

/* ───── Floating credit card visual ───── */
function FloatingCard() {
  return (
    <div className="relative w-72 h-44 animate-float" style={{ perspective: "800px" }}>
      {/* Glow ring */}
      <div
        className="absolute -inset-8 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)",
          animation: "pulse-ring 4s ease-in-out infinite",
        }}
      />
      {/* Card body */}
      <div
        className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-[#0F766E]/30"
        style={{
          background: "linear-gradient(135deg, #134E4A 0%, #0F766E 40%, #14B8A6 100%)",
          transform: "rotate3d(0.2, 1, 0.1, 12deg)",
        }}
      >
        {/* Holographic shimmer */}
        <div
          className="absolute inset-0 animate-shimmer opacity-20"
          style={{
            background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
          }}
        />
        {/* Card chip */}
        <div className="absolute top-8 left-7">
          <div className="w-11 h-8 rounded-md bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] shadow-inner">
            <div className="w-full h-full rounded-md border border-[#D97706]/30 grid grid-cols-3 grid-rows-2 gap-px p-0.5 opacity-60">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-sm bg-[#D97706]/20" />
              ))}
            </div>
          </div>
        </div>
        {/* Contactless symbol */}
        <div className="absolute top-9 left-21 text-white/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M8.5 16.5a5 5 0 017 0" />
            <path d="M6 19a8 8 0 0112 0" />
            <path d="M11 14a2 2 0 013 0" />
          </svg>
        </div>
        {/* Card number */}
        <div className="absolute bottom-14 left-7 flex gap-4">
          {["••••", "••••", "••••", "4218"].map((seg, i) => (
            <span
              key={i}
              className="text-white/80 text-sm font-mono tracking-[0.2em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {seg}
            </span>
          ))}
        </div>
        {/* Card holder & network */}
        <div className="absolute bottom-5 left-7 right-7 flex items-end justify-between">
          <span className="text-white/60 text-xs tracking-[0.15em] uppercase font-medium">CARD HOLDER</span>
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-[#EB001B]/80" />
            <div className="w-7 h-7 rounded-full bg-[#F79E1B]/80" />
          </div>
        </div>
        {/* Corner decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
          <div className="absolute top-4 right-4 w-16 h-16 rounded-full border-2 border-white" />
          <div className="absolute top-8 right-8 w-8 h-8 rounded-full border-2 border-white" />
        </div>
      </div>
    </div>
  );
}

/* ───── Stat counter with animation ───── */
function StatCounter({ value, label, delay }: { value: number | null; label: string; delay: string }) {
  return (
    <div className={`animate-counter-up ${delay}`}>
      <div className="text-5xl font-extrabold bg-gradient-to-br from-[#0F766E] to-[#14B8A6] bg-clip-text text-transparent">
        {value ?? "—"}
      </div>
      <div className="text-sm text-[#64748B] mt-1 font-medium tracking-wide">{label}</div>
    </div>
  );
}

/* ───── Bento feature card ───── */
function BentoCard({
  title,
  description,
  icon,
  className = "",
  accent,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
  accent: string;
}) {
  return (
    <div
      className={`group relative bg-white/80 border border-[#E2E8F0] rounded-2xl p-7 hover:border-[#99F6E4] hover:shadow-lg hover:shadow-[#0F766E]/5 transition-all duration-300 card-noise ${className}`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: accent }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#134E4A] mb-2">{title}</h3>
      <p className="text-sm text-[#64748B] leading-relaxed">{description}</p>
    </div>
  );
}

/* ───── Category pill ───── */
const CATEGORIES = [
  { label: "餐飲", icon: "M12 3v18m-6-6h12", color: "#EF4444" },
  { label: "網購", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 4.6A1 1 0 005.6 19h12.8M10 23a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z", color: "#8B5CF6" },
  { label: "交通", icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 11l2-6h14l2 6M3 11h18v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z", color: "#3B82F6" },
  { label: "海外", icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "#0EA5E9" },
  { label: "超商", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 6v-3a1 1 0 011-1h2a1 1 0 011 1v3", color: "#F97316" },
  { label: "串流", icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z", color: "#EC4899" },
];

/* ───── Main page ───── */
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
        // Stats are non-critical
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="overflow-hidden">
      {/* ============================================
          HERO — Asymmetric two-column
          ============================================ */}
      <section className="relative py-12 md:py-20">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.04] pointer-events-none">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0F766E] to-[#14B8A6]" style={{ filter: "blur(80px)" }} />
        </div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.03] pointer-events-none">
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#0369A1] to-[#14B8A6]" style={{ filter: "blur(60px)" }} />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left — Copy */}
          <div className="max-w-xl">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F766E]/8 border border-[#0F766E]/15 mb-7">
                <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-xs font-semibold text-[#0F766E] tracking-wide">即時追蹤 10 家銀行優惠</span>
              </div>
            </div>

            <h1 className="animate-fade-up delay-100 text-4xl md:text-[3.4rem] font-extrabold text-[#134E4A] leading-[1.1] tracking-tight mb-6">
              聰明刷卡<br />
              <span className="bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#14B8A6] bg-clip-text text-transparent animate-gradient">
                回饋最大化
              </span>
            </h1>

            <p className="animate-fade-up delay-200 text-lg text-[#475569] leading-relaxed mb-10 max-w-md">
              根據你的消費習慣，從數百張信用卡中精準配對最佳回饋組合。每日自動更新優惠，不再錯過任何好康。
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-up delay-300 flex flex-wrap items-center gap-4">
              <Link
                href="/recommend"
                className="group inline-flex items-center gap-2.5 px-7 py-4 bg-gradient-to-r from-[#0F766E] to-[#0D9488] hover:from-[#0D9488] hover:to-[#14B8A6] text-white font-semibold rounded-xl shadow-lg shadow-[#0F766E]/25 hover:shadow-xl hover:shadow-[#0F766E]/30 transition-all duration-300 cursor-pointer"
              >
                開始個人化推薦
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/cards"
                className="inline-flex items-center gap-2 px-6 py-4 text-[#0F766E] font-semibold hover:bg-[#0F766E]/5 rounded-xl transition-all duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                瀏覽全部卡片
              </Link>
            </div>

            {/* Category pills */}
            <div className="animate-fade-up delay-400 mt-10 flex flex-wrap gap-2">
              {CATEGORIES.map(({ label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-[#E2E8F0] text-xs font-medium text-[#475569] hover:border-[#99F6E4] transition-colors duration-200"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right — Floating card visual */}
          <div className="hidden lg:flex items-center justify-center animate-fade-in delay-300">
            <FloatingCard />
          </div>
        </div>
      </section>

      {/* ============================================
          STATS — Inline counters
          ============================================ */}
      <section className="py-8 mb-8">
        <div className="flex items-center justify-center gap-16">
          {loading ? (
            <>
              <div className="text-center">
                <div className="h-12 w-16 bg-[#E2E8F0] rounded-lg mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-20 bg-[#E2E8F0] rounded mx-auto animate-pulse" />
              </div>
              <div className="w-px h-12 bg-[#E2E8F0]" />
              <div className="text-center">
                <div className="h-12 w-16 bg-[#E2E8F0] rounded-lg mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-20 bg-[#E2E8F0] rounded mx-auto animate-pulse" />
              </div>
              <div className="w-px h-12 bg-[#E2E8F0]" />
              <div className="text-center">
                <div className="h-12 w-16 bg-[#E2E8F0] rounded-lg mx-auto mb-2 animate-pulse" />
                <div className="h-4 w-20 bg-[#E2E8F0] rounded mx-auto animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <StatCounter value={bankCount} label="合作銀行" delay="delay-100" />
              </div>
              <div className="w-px h-12 bg-[#E2E8F0]" />
              <div className="text-center">
                <StatCounter value={cardCount} label="信用卡" delay="delay-200" />
              </div>
              <div className="w-px h-12 bg-[#E2E8F0]" />
              <div className="text-center">
                <StatCounter value={12} label="優惠類別" delay="delay-300" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============================================
          BENTO GRID — Features
          ============================================ */}
      <section className="py-12">
        <div className="text-center mb-12">
          <h2 className="animate-fade-up text-3xl font-bold text-[#134E4A] tracking-tight">
            為什麼選擇 CardPick
          </h2>
          <p className="animate-fade-up delay-100 text-[#64748B] mt-3 max-w-lg mx-auto">
            我們不只是信用卡列表，而是你的智能消費顧問
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Row 1 — 3 equal cards */}
          <BentoCard
            title="即時爬蟲更新"
            description="每日自動抓取 10 家銀行最新優惠資訊，資料永遠保持最新狀態。"
            accent="linear-gradient(135deg, #F0FDFA, #CCFBF1)"
            icon={
              <svg className="w-6 h-6 text-[#0F766E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <BentoCard
            title="智能評分引擎"
            description="根據回饋率、年費 ROI、權益和優惠四大維度，計算每張卡的綜合得分。"
            accent="linear-gradient(135deg, #EFF6FF, #DBEAFE)"
            icon={
              <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
          <BentoCard
            title="個人化推薦"
            description="輸入你的消費比例與偏好，精準配對最適合你的信用卡組合。"
            accent="linear-gradient(135deg, #FFFBEB, #FEF3C7)"
            icon={
              <svg className="w-6 h-6 text-[#D97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
          {/* Row 2 — wider cards */}
          <BentoCard
            className="md:col-span-2"
            title="回饋上限感知"
            description="不只看回饋率，更考慮每月回饋上限和最低消費門檻，避免「看得到吃不到」的高回饋陷阱。真實估算你每個月能拿到多少回饋。"
            accent="linear-gradient(135deg, #FDF2F8, #FCE7F3)"
            icon={
              <svg className="w-6 h-6 text-[#DB2777]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <BentoCard
            title="安全透明"
            description="不儲存個人敏感資料，所有推薦計算在本地完成，資料安全可靠。"
            accent="linear-gradient(135deg, #F0FDF4, #DCFCE7)"
            icon={
              <svg className="w-6 h-6 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ============================================
          CTA BANNER — Bottom call to action
          ============================================ */}
      <section className="py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#134E4A] via-[#0F766E] to-[#0D9488] p-12 md:p-16 text-center card-noise">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/3" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              準備好找到你的最佳信用卡了嗎？
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
              只需 30 秒，輸入消費習慣即可獲得專屬推薦
            </p>
            <Link
              href="/recommend"
              className="group inline-flex items-center gap-2.5 px-8 py-4 bg-white text-[#0F766E] font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-[#F0FDFA] cursor-pointer"
            >
              立即開始
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
