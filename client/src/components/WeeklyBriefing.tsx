/**
 * WeeklyBriefing — Rotating infographic panel for faculty context
 * 
 * Displays 6 slides that auto-rotate every 12 seconds:
 * 1. Weekly Overview — headline metrics + mini sparkline
 * 2. Top Attack Vectors — horizontal bar chart by service category
 * 3. Geographic Origins — ranked country list with flag indicators
 * 4. Port Activity Analysis — risk-classified port bars
 * 5. Vulnerability Landscape — recent CISA KEV additions
 * 6. Key Takeaways — analyst insights + recommendation
 */
import { trpc } from '@/lib/trpc';
import { useState, useEffect, useRef, useCallback } from 'react';

const SLIDE_INTERVAL = 12000; // 12 seconds per slide

// ─── Color constants ─────────────────────────────────────────────────────────
const CYAN = '#00F0FF';
const MAGENTA = '#FF1493';
const RED = '#FF0040';
const AMBER = '#FFD700';
const GREEN = '#00FF88';
const ORANGE = '#FF6600';

export default function WeeklyBriefing() {
  const { data, isLoading, error } = trpc.threats.weeklyBriefing.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000, // 15 min
    retry: 2,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressRef = useRef(0);
  const progressAnimRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const slideStartRef = useRef(Date.now());

  const slides = data?.slides || [];
  const totalSlides = slides.length;

  // Auto-rotate slides
  useEffect(() => {
    if (totalSlides <= 1) return;
    slideStartRef.current = Date.now();
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
        slideStartRef.current = Date.now();
        setIsTransitioning(false);
      }, 350);
    }, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalSlides]);

  // Animate progress bar
  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - slideStartRef.current;
      const progress = Math.min(elapsed / SLIDE_INTERVAL, 1);
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress * 100}%`;
      }
      progressAnimRef.current = requestAnimationFrame(animate);
    };
    progressAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(progressAnimRef.current);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2">
        <div className="w-6 h-6 border border-[#FFD700]/20 border-t-[#FFD700]/60 rounded-full animate-spin" />
        <div className="font-data text-[9px] text-[#FFD700]/25 animate-pulse tracking-[0.2em]">
          COMPILING WEEKLY BRIEFING...
        </div>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shadow-[0_0_6px_rgba(255,102,0,0.5)]" />
        <div className="font-data text-[9px] text-[#FF6600]/40 tracking-[0.15em] text-center">
          BRIEFING UNAVAILABLE
        </div>
        <div className="font-data text-[7px] text-[#8899aa]/25 text-center leading-[1.3]">
          {error ? 'Data sources temporarily unreachable. Retrying...' : 'Awaiting sufficient data for weekly analysis.'}
        </div>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className={`w-full h-full flex flex-col relative overflow-hidden transition-opacity duration-350 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700]/30 to-transparent" />
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${
            data?.dataFreshness === 'live' 
              ? 'bg-[#FFD700] shadow-[0_0_6px_rgba(255,215,0,0.5)]' 
              : data?.dataFreshness === 'partial' 
                ? 'bg-[#FF6600] shadow-[0_0_6px_rgba(255,102,0,0.4)]' 
                : 'bg-[#8899aa] shadow-[0_0_4px_rgba(136,153,170,0.3)]'
          }`} />
          <span className="font-data text-[8px] tracking-[0.2em] uppercase text-[#FFD700]/60">
            Weekly Briefing
          </span>
          {data?.dataFreshness && data.dataFreshness !== 'live' && (
            <span className={`font-data text-[6px] px-1 py-0 rounded-sm border ${
              data.dataFreshness === 'partial' 
                ? 'text-[#FF6600]/50 border-[#FF6600]/20 bg-[#FF6600]/05' 
                : 'text-[#8899aa]/40 border-[#8899aa]/15 bg-[#8899aa]/05'
            }`}>
              {data.dataFreshness === 'partial' ? 'PARTIAL' : 'CACHED'}
            </span>
          )}
        </div>
        <div className="font-data text-[7px] text-[#8899aa]/30">
          {data?.weekLabel || ''} — {currentSlide + 1}/{totalSlides}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] mx-3 bg-[#FFD700]/08 rounded-full overflow-hidden shrink-0">
        <div 
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-[#FFD700]/40 to-[#FFD700]/80 rounded-full transition-none"
          style={{ width: '0%' }}
        />
      </div>

      {/* Slide content */}
      <div className="flex-1 px-3 pt-1.5 pb-2 overflow-hidden">
        {slide?.type === 'overview' && <OverviewSlide data={slide.data} title={slide.title} subtitle={slide.subtitle} />}
        {slide?.type === 'top-vectors' && <TopVectorsSlide data={slide.data} />}
        {slide?.type === 'geo-trends' && <GeoTrendsSlide data={slide.data} />}
        {slide?.type === 'port-analysis' && <PortAnalysisSlide data={slide.data} />}
        {slide?.type === 'cve-summary' && <CVESummarySlide data={slide.data} />}
        {slide?.type === 'severity-breakdown' && <SeverityBreakdownSlide data={slide.data} />}
        {slide?.type === 'key-takeaway' && <KeyTakeawaySlide data={slide.data} />}
      </div>

      {/* Slide dots */}
      <div className="flex items-center justify-center gap-1.5 pb-1.5 shrink-0">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentSlide 
                ? 'w-4 bg-[#FFD700] shadow-[0_0_4px_rgba(255,215,0,0.5)]' 
                : 'w-1 bg-[#FFD700]/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Slide Components ────────────────────────────────────────────────────────

function OverviewSlide({ data, title, subtitle }: { data: any; title: string; subtitle: string }) {
  const trendColor = data.trendDirection === 'increasing' ? RED : data.trendDirection === 'decreasing' ? GREEN : CYAN;
  const trendArrow = data.trendDirection === 'increasing' ? '▲' : data.trendDirection === 'decreasing' ? '▼' : '━';
  
  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">{title}</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">{subtitle}</div>
      
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        <MetricCard label="Total Events" value={formatNumber(data.totalRecords)} color={CYAN} />
        <MetricCard label="Unique Sources" value={formatNumber(data.totalSources)} color={ORANGE} />
        <MetricCard label="Targets Hit" value={formatNumber(data.totalTargets)} color={MAGENTA} />
      </div>

      {/* Trend + KEV row */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="font-data text-[10px] font-bold" style={{ color: trendColor }}>
            {trendArrow} {data.trendPercent > 0 ? '+' : ''}{data.trendPercent}%
          </span>
          <span className="font-data text-[7px] text-[#8899aa]/40">week trend</span>
        </div>
        <div className="w-[1px] h-3 bg-[#FFD700]/10" />
        <div className="flex items-center gap-1">
          <span className="font-data text-[10px] font-bold text-[#FF0040]">{data.newKEVs}</span>
          <span className="font-data text-[7px] text-[#8899aa]/40">new KEVs</span>
        </div>
        {data.ransomwareKEVs > 0 && (
          <>
            <div className="w-[1px] h-3 bg-[#FFD700]/10" />
            <div className="flex items-center gap-1">
              <span className="font-data text-[10px] font-bold text-[#FF1493]">{data.ransomwareKEVs}</span>
              <span className="font-data text-[7px] text-[#8899aa]/40">ransomware</span>
            </div>
          </>
        )}
      </div>

      {/* Mini sparkline from daily breakdown */}
      <div className="flex-1 flex items-end gap-[3px] mt-2 pb-1">
        {(data.dailyBreakdown || []).map((d: any, i: number) => {
          const max = Math.max(...(data.dailyBreakdown || []).map((x: any) => x.records), 1);
          const height = Math.max((d.records / max) * 100, 5);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div 
                className="w-full rounded-t-sm min-h-[3px]"
                style={{ 
                  height: `${height}%`,
                  background: `linear-gradient(to top, ${CYAN}20, ${CYAN}60)`,
                  boxShadow: `0 0 4px ${CYAN}20`,
                }}
              />
              <span className="font-data text-[5px] text-[#8899aa]/25">
                {d.date?.slice(5) || ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopVectorsSlide({ data }: { data: any }) {
  const vectors = data.vectors || [];
  const colors = [RED, ORANGE, AMBER, CYAN, GREEN, MAGENTA];
  
  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Top Attack Vectors</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">Classified by targeted service category</div>
      
      <div className="flex-1 flex flex-col justify-center gap-[6px] mt-1.5">
        {vectors.map((v: any, i: number) => (
          <div key={v.name} className="flex items-center gap-2">
            <div className="w-[90px] shrink-0 text-right">
              <span className="font-data text-[8px] text-[#8899aa]/50 truncate block">{v.name}</span>
            </div>
            <div className="flex-1 h-[10px] bg-[#0a0a1a] rounded-sm overflow-hidden relative">
              <div 
                className="h-full rounded-sm transition-all duration-1000"
                style={{ 
                  width: `${v.percent}%`,
                  background: `linear-gradient(90deg, ${colors[i % colors.length]}40, ${colors[i % colors.length]}90)`,
                  boxShadow: `0 0 6px ${colors[i % colors.length]}30`,
                }}
              />
            </div>
            <span className="font-data text-[8px] text-[#8899aa]/40 w-[30px] text-right">{v.percent}%</span>
          </div>
        ))}
      </div>
      
      <div className="font-data text-[7px] text-[#8899aa]/25 mt-1">
        Total: {formatNumber(data.totalCount)} events across {vectors.length} categories
      </div>
    </div>
  );
}

function GeoTrendsSlide({ data }: { data: any }) {
  const countries = data.countries || [];
  const maxReports = Math.max(...countries.map((c: any) => c.reports), 1);
  
  const flagColors: Record<string, string> = {
    CN: '#FF0040', US: '#00F0FF', RU: '#FF6600', IN: '#FFD700', BR: '#00FF88',
    DE: '#FF1493', KR: '#00BFFF', NL: '#FF8C00', GB: '#8B00FF', FR: '#00F0FF',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Geographic Origins</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">
        Top source countries — {data.totalCountries} countries detected
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-[5px] mt-1.5">
        {countries.slice(0, 6).map((c: any, i: number) => {
          const barWidth = Math.max((c.reports / maxReports) * 100, 5);
          const color = flagColors[c.code] || CYAN;
          return (
            <div key={c.code} className="flex items-center gap-2">
              <div className="w-[16px] shrink-0 flex items-center justify-center">
                <span className="font-data text-[9px] font-bold" style={{ color }}>{c.code}</span>
              </div>
              <div className="w-[65px] shrink-0">
                <span className="font-data text-[7px] text-[#8899aa]/50 truncate block">{c.name}</span>
              </div>
              <div className="flex-1 h-[8px] bg-[#0a0a1a] rounded-sm overflow-hidden">
                <div 
                  className="h-full rounded-sm"
                  style={{ 
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${color}30, ${color}70)`,
                    boxShadow: `0 0 4px ${color}20`,
                  }}
                />
              </div>
              <span className="font-data text-[7px] text-[#8899aa]/35 w-[35px] text-right">
                {c.attackers} IPs
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortAnalysisSlide({ data }: { data: any }) {
  const ports = data.ports || [];
  const riskColors: Record<string, string> = { high: RED, medium: AMBER, standard: CYAN };
  const riskLabels: Record<string, string> = { high: 'HIGH RISK', medium: 'WEB', standard: 'STD' };

  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Port Activity Analysis</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">
        {data.highRiskCount} high-risk ports · {data.webCount} web ports targeted
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-[4px] mt-1.5">
        {ports.slice(0, 7).map((p: any) => {
          const color = riskColors[p.riskLevel] || CYAN;
          return (
            <div key={p.port} className="flex items-center gap-1.5">
              <div className="w-[40px] shrink-0 text-right">
                <span className="font-data text-[8px]" style={{ color }}>{p.service}</span>
              </div>
              <div className="px-1 py-0 rounded-sm border" style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}>
                <span className="font-data text-[5px]" style={{ color: `${color}80` }}>
                  {riskLabels[p.riskLevel]}
                </span>
              </div>
              <div className="flex-1 h-[7px] bg-[#0a0a1a] rounded-sm overflow-hidden">
                <div 
                  className="h-full rounded-sm"
                  style={{ 
                    width: `${p.intensity}%`,
                    background: `linear-gradient(90deg, ${color}30, ${color}80)`,
                  }}
                />
              </div>
              <span className="font-data text-[6px] text-[#8899aa]/30 w-[30px] text-right">
                {formatNumber(p.records)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CVESummarySlide({ data }: { data: any }) {
  const cves = data.recentCVEs || [];
  const vendors = data.topVendors || [];

  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Vulnerability Landscape</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">CISA KEV — Recent actively exploited additions</div>
      
      {/* Summary metrics */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <span className="font-data text-[14px] font-bold text-[#FF0040]">{data.totalNew}</span>
          <span className="font-data text-[7px] text-[#8899aa]/40">new CVEs</span>
        </div>
        {data.ransomwareCount > 0 && (
          <>
            <div className="w-[1px] h-4 bg-[#FFD700]/10" />
            <div className="flex items-center gap-1">
              <span className="font-data text-[14px] font-bold text-[#FF1493]">{data.ransomwareCount}</span>
              <span className="font-data text-[7px] text-[#8899aa]/40">ransomware-linked</span>
            </div>
          </>
        )}
      </div>

      {/* CVE list */}
      <div className="flex-1 flex flex-col gap-[4px] mt-2 overflow-hidden">
        {cves.slice(0, 4).map((c: any) => (
          <div key={c.cveId} className="flex items-center gap-2 py-[2px]">
            <span className="font-data text-[8px] text-[#FF0040]/80 shrink-0">{c.cveId}</span>
            {c.isRansomware && (
              <span className="font-data text-[5px] text-[#FF1493] px-1 py-0 border border-[#FF1493]/30 rounded-sm bg-[#FF1493]/08">
                RANSOM
              </span>
            )}
            <span className="font-data text-[7px] text-[#8899aa]/40 truncate">
              {c.vendor} — {c.product}
            </span>
          </div>
        ))}
      </div>

      {/* Top affected vendors */}
      {vendors.length > 0 && (
        <div className="mt-1 pt-1 border-t border-[#FFD700]/05">
          <span className="font-data text-[6px] text-[#8899aa]/25 tracking-wider">TOP VENDORS: </span>
          <span className="font-data text-[7px] text-[#FF6600]/50">
            {vendors.map((v: any) => `${v.vendor} (${v.count})`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

function KeyTakeawaySlide({ data }: { data: any }) {
  const insights = data.insights || [];
  const threatLevel = data.threatLevel || { status: 'green', color: GREEN };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Key Takeaways</div>
        <div 
          className="px-1.5 py-0.5 rounded-sm border"
          style={{ borderColor: `${threatLevel.color}40`, backgroundColor: `${threatLevel.color}10` }}
        >
          <span className="font-data text-[7px] uppercase tracking-wider" style={{ color: threatLevel.color }}>
            {threatLevel.status}
          </span>
        </div>
      </div>
      
      {/* Insights */}
      <div className="flex-1 flex flex-col gap-[6px] mt-2 overflow-hidden">
        {insights.slice(0, 4).map((insight: string, i: number) => (
          <div key={i} className="flex gap-1.5">
            <div className="w-1 h-1 rounded-full mt-[4px] shrink-0" style={{ backgroundColor: `${AMBER}60` }} />
            <p className="font-body text-[8px] text-[#8899aa]/50 leading-[1.35]">{insight}</p>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mt-auto pt-1.5 border-t border-[#FFD700]/08">
        <div className="font-data text-[6px] text-[#FFD700]/30 tracking-[0.15em] uppercase mb-0.5">
          Recommendation
        </div>
        <p className="font-body text-[7px] text-[#FFD700]/40 leading-[1.3]">
          {data.recommendation}
        </p>
      </div>
    </div>
  );
}

function SeverityBreakdownSlide({ data }: { data: any }) {
  const severities = [
    { label: 'CRITICAL', count: data.critical, percent: data.criticalPercent, color: '#FF0040' },
    { label: 'HIGH', count: data.high, percent: data.highPercent, color: '#FF6600' },
    { label: 'MEDIUM', count: data.medium, percent: data.mediumPercent, color: '#FFD700' },
    { label: 'LOW', count: data.low, percent: data.lowPercent, color: '#00FF88' },
  ];
  const dailySeverity = data.dailySeverity || [];

  return (
    <div className="h-full flex flex-col">
      <div className="font-data text-[11px] font-bold text-[#FFD700]/80 tracking-wider">Severity Distribution</div>
      <div className="font-data text-[7px] text-[#8899aa]/40 mt-0.5">Weekly threat severity classification</div>

      {/* Stacked bar */}
      <div className="h-[14px] mt-2 flex rounded-sm overflow-hidden">
        {severities.map(s => (
          s.percent > 0 && (
            <div
              key={s.label}
              className="h-full transition-all duration-1000"
              style={{
                width: `${s.percent}%`,
                backgroundColor: s.color,
                opacity: 0.7,
              }}
            />
          )
        ))}
      </div>

      {/* Severity cards */}
      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {severities.map(s => (
          <div key={s.label} className="p-1 rounded-sm border bg-[#0a0a1a]/50" style={{ borderColor: `${s.color}15` }}>
            <div className="font-data text-[5px] tracking-wider" style={{ color: `${s.color}60` }}>{s.label}</div>
            <div className="font-data text-[11px] font-bold" style={{ color: s.color }}>{s.percent}%</div>
            <div className="font-data text-[6px] text-[#8899aa]/25">{formatNumber(s.count)}</div>
          </div>
        ))}
      </div>

      {/* Daily severity trend mini bars */}
      {dailySeverity.length > 0 && (
        <div className="flex-1 flex flex-col mt-2">
          <div className="font-data text-[6px] text-[#8899aa]/25 tracking-wider mb-1">DAILY TREND</div>
          <div className="flex-1 flex items-end gap-[3px]">
            {dailySeverity.map((d: any, i: number) => {
              const dayTotal = d.critical + d.high + d.medium + d.low;
              const maxDay = Math.max(...dailySeverity.map((x: any) => x.critical + x.high + x.medium + x.low), 1);
              const height = Math.max((dayTotal / maxDay) * 100, 5);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t-sm flex flex-col-reverse overflow-hidden"
                    style={{ height: `${height}%` }}
                  >
                    <div style={{ height: `${dayTotal > 0 ? (d.low / dayTotal) * 100 : 25}%`, backgroundColor: '#00FF8840' }} />
                    <div style={{ height: `${dayTotal > 0 ? (d.medium / dayTotal) * 100 : 25}%`, backgroundColor: '#FFD70050' }} />
                    <div style={{ height: `${dayTotal > 0 ? (d.high / dayTotal) * 100 : 25}%`, backgroundColor: '#FF660060' }} />
                    <div style={{ height: `${dayTotal > 0 ? (d.critical / dayTotal) * 100 : 25}%`, backgroundColor: '#FF004070' }} />
                  </div>
                  <span className="font-data text-[5px] text-[#8899aa]/20">{d.date?.slice(5) || ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-1.5 rounded-sm border border-[#FFD700]/08 bg-[#0a0a1a]/50">
      <div className="font-data text-[6px] text-[#8899aa]/30 tracking-wider uppercase">{label}</div>
      <div className="font-data text-[13px] font-bold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
