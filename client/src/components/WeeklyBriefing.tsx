/**
 * WeeklyBriefing — Rotating infographic panel
 * 
 * Redesign: Single accent color (amber for briefing differentiation from
 * the cyan-dominant threat data). Clean typography, no glowing effects,
 * restrained bar charts. Professional enough for faculty.
 */
import { trpc } from '@/lib/trpc';
import { useState, useEffect, useRef } from 'react';

const SLIDE_INTERVAL = 12000;

export default function WeeklyBriefing() {
  const { data, isLoading, error } = trpc.threats.weeklyBriefing.useQuery(undefined, {
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const slideStartRef = useRef(Date.now());
  const progressAnimRef = useRef<number>(0);

  const slides = data?.slides || [];
  const totalSlides = slides.length;

  // Auto-rotate
  useEffect(() => {
    if (totalSlides <= 1) return;
    slideStartRef.current = Date.now();
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
        slideStartRef.current = Date.now();
        setIsTransitioning(false);
      }, 300);
    }, SLIDE_INTERVAL);
    return () => clearInterval(interval);
  }, [totalSlides]);

  // Progress bar animation
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
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-body text-[var(--color-cp-text-tertiary)]">Compiling briefing...</span>
      </div>
    );
  }

  if (error || slides.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-body text-[var(--color-cp-text-tertiary)]">
          {error ? 'Briefing unavailable' : 'Awaiting data...'}
        </span>
      </div>
    );
  }

  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="cp-panel-header">
        <div className="flex items-center gap-2">
          <span className="text-label text-[var(--color-cp-text-tertiary)]">Weekly Briefing</span>
          {data?.dataFreshness && data.dataFreshness !== 'live' && (
            <span className="text-caption text-[var(--color-cp-text-tertiary)] opacity-50">
              ({data.dataFreshness})
            </span>
          )}
        </div>
        <span className="text-caption text-[var(--color-cp-text-tertiary)]">
          {currentSlide + 1}/{totalSlides}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] mx-3 bg-[var(--color-cp-border)] rounded-full overflow-hidden">
        <div 
          ref={progressBarRef}
          className="h-full rounded-full transition-none"
          style={{ width: '0%', backgroundColor: 'var(--color-cp-accent)' }}
        />
      </div>

      {/* Slide content */}
      <div className={`cp-panel-body flex-1 overflow-hidden transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {slide?.type === 'overview' && <OverviewSlide data={slide.data} title={slide.title} subtitle={slide.subtitle} />}
        {slide?.type === 'top-vectors' && <TopVectorsSlide data={slide.data} />}
        {slide?.type === 'geo-trends' && <GeoTrendsSlide data={slide.data} />}
        {slide?.type === 'port-analysis' && <PortAnalysisSlide data={slide.data} />}
        {slide?.type === 'cve-summary' && <CVESummarySlide data={slide.data} />}
        {slide?.type === 'severity-breakdown' && <SeverityBreakdownSlide data={slide.data} />}
        {slide?.type === 'key-takeaway' && <KeyTakeawaySlide data={slide.data} />}
      </div>

      {/* Slide dots */}
      <div className="flex justify-center gap-1 py-2 border-t border-[var(--color-cp-border)]">
        {slides.map((s: any, i: number) => (
          <div
            key={`slide-${s.type}-${i}`}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              i === currentSlide ? 'bg-[var(--color-cp-accent)]' : 'bg-[var(--color-cp-border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Slide Components ────────────────────────────────────────────────────────

function OverviewSlide({ data, title, subtitle }: { data: any; title: string; subtitle: string }) {
  const trendColor = data.trendDirection === 'increasing' 
    ? 'var(--color-cp-critical)' 
    : data.trendDirection === 'decreasing' 
      ? 'var(--color-cp-low)' 
      : 'var(--color-cp-accent)';
  const trendArrow = data.trendDirection === 'increasing' ? '↑' : data.trendDirection === 'decreasing' ? '↓' : '→';
  
  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">{title}</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">{subtitle}</div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MetricCard label="Total Events" value={formatNumber(data.totalRecords)} />
        <MetricCard label="Unique Sources" value={formatNumber(data.totalSources)} />
        <MetricCard label="Targets" value={formatNumber(data.totalTargets)} />
      </div>

      {/* Trend */}
      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1">
          <span className="font-data text-body font-medium" style={{ color: trendColor }}>
            {trendArrow} {data.trendPercent > 0 ? '+' : ''}{data.trendPercent}%
          </span>
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">vs last week</span>
        </div>
        <div className="w-px h-3 bg-[var(--color-cp-border)]" />
        <div className="flex items-center gap-1">
          <span className="font-data text-body font-medium severity-critical">{data.newKEVs}</span>
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">new KEVs</span>
        </div>
      </div>

      {/* Mini sparkline */}
      <div className="flex-1 flex items-end gap-[2px] mt-3 pb-1">
        {(data.dailyBreakdown || []).map((d: any, i: number) => {
          const max = Math.max(...(data.dailyBreakdown || []).map((x: any) => x.records), 1);
          const height = Math.max((d.records / max) * 100, 4);
          return (
            <div key={`day-${d.date || i}`} className="flex-1 flex flex-col items-center gap-0.5">
              <div 
                className="w-full rounded-t-sm"
                style={{ 
                  height: `${height}%`,
                  backgroundColor: 'var(--color-cp-accent)',
                  opacity: 0.3 + (height / 100) * 0.5,
                }}
              />
              <span className="font-data text-[7px] text-[var(--color-cp-text-tertiary)] opacity-50">
                {d.date?.slice(8) || ''}
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
  
  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Top Attack Vectors</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">By targeted service</div>
      
      <div className="flex-1 flex flex-col justify-center gap-2 mt-2">
        {vectors.map((v: any) => (
          <div key={v.name} className="flex items-center gap-2">
            <span className="font-data text-caption text-[var(--color-cp-text-secondary)] w-[80px] text-right truncate">
              {v.name}
            </span>
            <div className="flex-1 h-[5px] bg-[var(--color-cp-base)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${v.percent}%`,
                  backgroundColor: 'var(--color-cp-accent)',
                  opacity: 0.5 + (v.percent / 100) * 0.5,
                }}
              />
            </div>
            <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] w-[30px] text-right tabular-nums">
              {v.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeoTrendsSlide({ data }: { data: any }) {
  const countries = data.countries || [];
  const maxReports = Math.max(...countries.map((c: any) => c.reports), 1);

  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Geographic Origins</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">
        {data.totalCountries} countries detected
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5 mt-2">
        {countries.slice(0, 6).map((c: any) => {
          const barWidth = Math.max((c.reports / maxReports) * 100, 4);
          return (
            <div key={c.code} className="flex items-center gap-2">
              <span className="font-data text-caption text-[var(--color-cp-accent)] w-[20px] font-medium">
                {c.code}
              </span>
              <span className="text-caption text-[var(--color-cp-text-tertiary)] w-[60px] truncate">
                {c.name}
              </span>
              <div className="flex-1 h-[4px] bg-[var(--color-cp-base)] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: 'var(--color-cp-accent)',
                    opacity: 0.4 + (barWidth / 100) * 0.5,
                  }}
                />
              </div>
              <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] w-[35px] text-right tabular-nums">
                {c.attackers}
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

  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Port Activity</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">
        {data.highRiskCount} high-risk · {data.webCount} web ports
      </div>
      
      <div className="flex-1 flex flex-col justify-center gap-1.5 mt-2">
        {ports.slice(0, 7).map((p: any) => (
          <div key={p.port} className="flex items-center gap-2">
            <span className="font-data text-caption text-[var(--color-cp-text-secondary)] w-[45px] text-right truncate">
              {p.service}
            </span>
            <span className={`text-[8px] px-1 rounded ${
              p.riskLevel === 'high' ? 'severity-critical bg-[var(--color-cp-critical)]/10' :
              p.riskLevel === 'medium' ? 'severity-medium bg-[var(--color-cp-medium)]/10' :
              'text-[var(--color-cp-text-tertiary)] bg-[var(--color-cp-elevated)]'
            }`}>
              {p.riskLevel === 'high' ? 'HIGH' : p.riskLevel === 'medium' ? 'MED' : 'STD'}
            </span>
            <div className="flex-1 h-[4px] bg-[var(--color-cp-base)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full"
                style={{ 
                  width: `${p.intensity}%`,
                  backgroundColor: p.riskLevel === 'high' 
                    ? 'var(--color-cp-critical)' 
                    : p.riskLevel === 'medium' 
                      ? 'var(--color-cp-medium)' 
                      : 'var(--color-cp-accent)',
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="font-data text-caption text-[var(--color-cp-text-tertiary)] w-[30px] text-right tabular-nums">
              {formatNumber(p.records)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CVESummarySlide({ data }: { data: any }) {
  const cves = data.recentCVEs || [];
  const vendors = data.topVendors || [];

  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Vulnerability Landscape</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">CISA KEV — Recent additions</div>
      
      {/* Summary */}
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <span className="font-data text-[14px] font-medium severity-critical">{data.totalNew}</span>
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">new CVEs</span>
        </div>
        {data.ransomwareCount > 0 && (
          <>
            <div className="w-px h-3 bg-[var(--color-cp-border)]" />
            <div className="flex items-center gap-1">
              <span className="font-data text-[14px] font-medium severity-high">{data.ransomwareCount}</span>
              <span className="text-caption text-[var(--color-cp-text-tertiary)]">ransomware</span>
            </div>
          </>
        )}
      </div>

      {/* CVE list */}
      <div className="flex-1 flex flex-col gap-1.5 mt-2 overflow-hidden">
        {cves.slice(0, 4).map((c: any) => (
          <div key={c.cveId} className="flex items-center gap-2">
            <span className="font-data text-caption severity-critical">{c.cveId}</span>
            {c.isRansomware && (
              <span className="text-[7px] px-1 rounded severity-high bg-[var(--color-cp-high)]/10">RANSOM</span>
            )}
            <span className="text-caption text-[var(--color-cp-text-tertiary)] truncate">
              {c.vendor} — {c.product}
            </span>
          </div>
        ))}
      </div>

      {/* Top vendors */}
      {vendors.length > 0 && (
        <div className="pt-1.5 border-t border-[var(--color-cp-border)]">
          <span className="text-caption text-[var(--color-cp-text-tertiary)]">
            Top: {vendors.map((v: any) => `${v.vendor} (${v.count})`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  );
}

function SeverityBreakdownSlide({ data }: { data: any }) {
  const severities = [
    { label: 'Critical', count: data.critical, percent: data.criticalPercent, cls: 'severity-critical' },
    { label: 'High', count: data.high, percent: data.highPercent, cls: 'severity-high' },
    { label: 'Medium', count: data.medium, percent: data.mediumPercent, cls: 'severity-medium' },
    { label: 'Low', count: data.low, percent: data.lowPercent, cls: 'severity-low' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Severity Distribution</div>
      <div className="text-caption text-[var(--color-cp-text-tertiary)] mt-0.5">Weekly classification</div>

      {/* Stacked bar */}
      <div className="h-[8px] mt-3 flex rounded-full overflow-hidden bg-[var(--color-cp-base)]">
        {severities.map(s => (
          s.percent > 0 && (
            <div
              key={s.label}
              className="h-full transition-all duration-1000"
              style={{
                width: `${s.percent}%`,
                backgroundColor: s.label === 'Critical' ? 'var(--color-cp-critical)' :
                  s.label === 'High' ? 'var(--color-cp-high)' :
                  s.label === 'Medium' ? 'var(--color-cp-medium)' :
                  'var(--color-cp-low)',
                opacity: 0.7,
              }}
            />
          )
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {severities.map(s => (
          <div key={s.label} className="text-center">
            <div className={`font-data text-[14px] font-light ${s.cls}`}>{s.percent}%</div>
            <div className="text-caption text-[var(--color-cp-text-tertiary)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      {(data.dailySeverity || []).length > 0 && (
        <div className="flex-1 flex items-end gap-[2px] mt-3 pb-1">
          {(data.dailySeverity || []).map((d: any, i: number) => {
            const dayTotal = d.critical + d.high + d.medium + d.low;
            const maxDay = Math.max(...(data.dailySeverity || []).map((x: any) => x.critical + x.high + x.medium + x.low), 1);
            const height = Math.max((dayTotal / maxDay) * 100, 4);
            return (
              <div key={`sev-${d.date || i}`} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-sm"
                  style={{ 
                    height: `${height}%`, 
                    backgroundColor: 'var(--color-cp-accent)',
                    opacity: 0.3 + (height / 100) * 0.4,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KeyTakeawaySlide({ data }: { data: any }) {
  const insights = data.insights || [];

  return (
    <div className="h-full flex flex-col">
      <div className="text-body text-[var(--color-cp-text-primary)] font-medium">Key Takeaways</div>
      
      {/* Insights */}
      <div className="flex-1 flex flex-col gap-2 mt-3 overflow-hidden">
        {insights.slice(0, 4).map((insight: string, i: number) => (
          <div key={`insight-${i}-${insight.slice(0, 20)}`} className="flex gap-2">
            <div className="w-1 h-1 rounded-full mt-1.5 shrink-0 bg-[var(--color-cp-accent)] opacity-50" />
            <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">{insight}</p>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mt-auto pt-2 border-t border-[var(--color-cp-border)]">
        <span className="text-caption text-[var(--color-cp-text-tertiary)] block mb-0.5">Recommendation</span>
        <p className="text-caption text-[var(--color-cp-text-secondary)] leading-relaxed">
          {data.recommendation}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-[var(--color-cp-elevated)] border border-[var(--color-cp-border)]">
      <div className="text-caption text-[var(--color-cp-text-tertiary)]">{label}</div>
      <div className="font-data text-body text-[var(--color-cp-text-primary)] font-medium mt-0.5">{value}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
