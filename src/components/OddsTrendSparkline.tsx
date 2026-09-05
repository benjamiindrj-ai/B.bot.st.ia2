import React, { useMemo } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  YAxis, 
  XAxis, 
  Tooltip,
  ReferenceLine 
} from 'recharts';
import { SportTip, OddsHistoryPoint } from '../types';

interface OddsTrendSparklineProps {
  tip: SportTip;
  className?: string;
  showDetails?: boolean;
}

/**
 * Generate a realistic and deterministic 60-minute odds fluctuation history
 * if not already provided on the tip object.
 */
export function generateOddsHistory(tip: SportTip): OddsHistoryPoint[] {
  if (tip.oddsHistory && tip.oddsHistory.length >= 3) {
    return tip.oddsHistory;
  }

  const currentOdds = tip.odds;
  const alert = tip.droppingOddsAlert;
  
  // Seed-like hash from tip.id or match name for deterministic smoothness
  const seedString = `${tip.id || ''}-${tip.match || ''}-${tip.market || ''}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const pseudoRand = (offset: number) => {
    const x = Math.sin(Math.abs(hash) + offset * 997) * 10000;
    return x - Math.floor(x);
  };

  let openingOdds = currentOdds;
  let trend: 'dropping' | 'rising' | 'stable' = 'stable';

  if (alert) {
    openingOdds = alert.openingOdds || currentOdds;
    trend = alert.trend;
  } else if (tip.expectedValue >= 6.0) {
    // High EV often correlates with early value that sharp money is hitting (dropping odds)
    trend = 'dropping';
    const dropAmount = Number((currentOdds * (0.05 + pseudoRand(1) * 0.04)).toFixed(2));
    openingOdds = Number((currentOdds + dropAmount).toFixed(2));
  } else if (tip.expectedValue <= 2.5 && pseudoRand(2) > 0.6) {
    // Slight upward drift on less clear lines
    trend = 'rising';
    const riseAmount = Number((currentOdds * (0.04 + pseudoRand(3) * 0.03)).toFixed(2));
    openingOdds = Math.max(1.10, Number((currentOdds - riseAmount).toFixed(2)));
  } else {
    // Stable with minor micro-noise (+/- 1-2 ticks)
    trend = 'stable';
    openingOdds = Number((currentOdds + (pseudoRand(4) - 0.5) * 0.04).toFixed(2));
  }

  const timeOffsets = [
    { label: '-60m', offset: -60, progress: 0.00 },
    { label: '-45m', offset: -45, progress: 0.25 },
    { label: '-30m', offset: -30, progress: 0.50 },
    { label: '-15m', offset: -15, progress: 0.75 },
    { label: '-5m', offset: -5, progress: 0.90 },
    { label: 'Direct', offset: 0, progress: 1.00 },
  ];

  const totalDelta = currentOdds - openingOdds;

  return timeOffsets.map((t, idx) => {
    if (idx === 0) {
      return {
        timeLabel: t.label,
        minuteOffset: t.offset,
        odds: openingOdds,
        impliedProb: Number((100 / openingOdds).toFixed(1)),
        changePctFromOpening: 0,
        sharpVolumeScore: Math.round(30 + pseudoRand(idx) * 20),
      };
    }
    if (idx === timeOffsets.length - 1) {
      const changePct = Number((((currentOdds - openingOdds) / openingOdds) * 100).toFixed(1));
      return {
        timeLabel: t.label,
        minuteOffset: t.offset,
        odds: currentOdds,
        impliedProb: Number((100 / currentOdds).toFixed(1)),
        changePctFromOpening: changePct,
        sharpVolumeScore: Math.round(75 + pseudoRand(idx) * 25),
      };
    }

    // Intermediate points with organic market resistance curve
    const easeProgress = Math.pow(t.progress, 1.2); // slight acceleration towards kickoff
    const noise = (pseudoRand(idx * 7) - 0.5) * (Math.abs(totalDelta) * 0.25);
    const intermediateOdds = Number(Math.max(1.05, openingOdds + totalDelta * easeProgress + noise).toFixed(2));
    const changePct = Number((((intermediateOdds - openingOdds) / openingOdds) * 100).toFixed(1));

    return {
      timeLabel: t.label,
      minuteOffset: t.offset,
      odds: intermediateOdds,
      impliedProb: Number((100 / intermediateOdds).toFixed(1)),
      changePctFromOpening: changePct,
      sharpVolumeScore: Math.round(40 + t.progress * 45 + pseudoRand(idx) * 15),
    };
  });
}

export const OddsTrendSparkline: React.FC<OddsTrendSparklineProps> = ({ 
  tip, 
  className = '',
  showDetails = true
}) => {
  const data = useMemo(() => generateOddsHistory(tip), [tip]);

  const openingPoint = data[0];
  const currentPoint = data[data.length - 1];
  const openingOdds = openingPoint.odds;
  const currentOdds = currentPoint.odds;
  
  const changePct = Number((((currentOdds - openingOdds) / openingOdds) * 100).toFixed(1));
  
  // Trend determination:
  // Dropping odds (Chute): odds went down (e.g. 2.10 -> 1.95, changePct < -1.5%) -> heavy smart money entering
  // Rising odds (Hausse): odds went up (e.g. 1.80 -> 1.95, changePct > +1.5%) -> drifting line
  // Stable: within +/- 1.5%
  const isDropping = changePct <= -1.2;
  const isRising = changePct >= 1.2;
  const isStable = !isDropping && !isRising;

  const minOdds = Math.min(...data.map(d => d.odds));
  const maxOdds = Math.max(...data.map(d => d.odds));

  // Color config based on trend
  const trendConfig = useMemo(() => {
    if (isDropping) {
      return {
        stroke: '#f43f5e', // rose-500
        fillGradientStart: '#f43f5e',
        fillGradientEnd: '#f43f5e00',
        badgeBg: 'bg-rose-500/15',
        badgeText: 'text-rose-300',
        badgeBorder: 'border-rose-500/30',
        icon: <TrendingDown className="w-3.5 h-3.5 text-rose-400" />,
        signalIcon: <ArrowDownRight className="w-3 h-3 text-rose-400" />,
        title: 'Cote en Chute (Sharp Inflow)',
        description: 'Les parieurs pros (Sharp Money) prennent position, la cote baisse.',
      };
    }
    if (isRising) {
      return {
        stroke: '#38bdf8', // sky-400
        fillGradientStart: '#38bdf8',
        fillGradientEnd: '#38bdf800',
        badgeBg: 'bg-sky-500/15',
        badgeText: 'text-sky-300',
        badgeBorder: 'border-sky-500/30',
        icon: <TrendingUp className="w-3.5 h-3.5 text-sky-400" />,
        signalIcon: <ArrowUpRight className="w-3 h-3 text-sky-400" />,
        title: 'Cote en Hausse (Drift Marché)',
        description: 'Hausse de la cote sous l\'effet des volumes contraires.',
      };
    }
    return {
      stroke: '#10b981', // emerald-500
      fillGradientStart: '#10b981',
      fillGradientEnd: '#10b98100',
      badgeBg: 'bg-emerald-500/15',
      badgeText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/30',
      icon: <Activity className="w-3.5 h-3.5 text-emerald-400" />,
      signalIcon: <Sparkles className="w-3 h-3 text-emerald-400" />,
      title: 'Cote Stable (Consensus)',
      description: 'Ligne équilibrée sans mouvement majeur sur 60 minutes.',
    };
  }, [isDropping, isRising]);

  const gradientId = `odds-gradient-${tip.id || 'default'}-${Math.abs(currentOdds * 100)}`;

  return (
    <div 
      id={`sparkline-card-${tip.id}`}
      className={`bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 rounded-xl p-3 space-y-2 transition-all ${className}`}
    >
      {/* Header of Sparkline Section */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="font-bold text-slate-200">
            Historique Cotes (60 min)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            T-60m ➔ Actuel
          </span>
        </div>

        {/* Dynamic Movement Badge */}
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold font-mono ${trendConfig.badgeBg} ${trendConfig.badgeText} ${trendConfig.badgeBorder}`}>
          {trendConfig.icon}
          <span>
            {changePct > 0 ? `+${changePct}%` : changePct < 0 ? `${changePct}%` : '0.0%'}
          </span>
          <span className="text-[9px] uppercase font-sans font-extrabold tracking-wider ml-0.5">
            {isDropping ? 'Chute' : isRising ? 'Hausse' : 'Stable'}
          </span>
        </div>
      </div>

      {/* Sparkline Visual Chart via Recharts */}
      <div className="relative w-full h-16 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 2 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendConfig.fillGradientStart} stopOpacity={0.45} />
                <stop offset="95%" stopColor={trendConfig.fillGradientStart} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <YAxis 
              hide 
              domain={[minOdds - 0.03, maxOdds + 0.03]} 
            />
            <XAxis 
              dataKey="timeLabel" 
              hide 
            />

            {/* Subtle dashed reference line at opening odds */}
            <ReferenceLine 
              y={openingOdds} 
              stroke="#475569" 
              strokeDasharray="2 2" 
              strokeOpacity={0.6}
            />

            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as OddsHistoryPoint;
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2 rounded-lg shadow-xl text-xs space-y-1 font-mono z-50">
                      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400">
                        <span>{pt.timeLabel === 'Direct' ? 'En Direct (Maintenant)' : `Il y a ${Math.abs(pt.minuteOffset)} min`}</span>
                        <span className="text-cyan-400 font-bold">{pt.timeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 font-bold">
                        <span className="text-slate-200">Cote Stake :</span>
                        <span className="text-emerald-400 text-sm">@{pt.odds.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 border-t border-slate-800 pt-0.5">
                        <span>Évolution vs T-60m :</span>
                        <span className={pt.changePctFromOpening && pt.changePctFromOpening < 0 ? 'text-rose-400' : pt.changePctFromOpening && pt.changePctFromOpening > 0 ? 'text-sky-400' : 'text-slate-300'}>
                          {pt.changePctFromOpening && pt.changePctFromOpening > 0 ? `+${pt.changePctFromOpening}%` : `${pt.changePctFromOpening || 0}%`}
                        </span>
                      </div>
                      {pt.impliedProb && (
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400">
                          <span>Proba implicite :</span>
                          <span className="text-blue-300 font-semibold">{pt.impliedProb}%</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area 
              type="monotone" 
              dataKey="odds" 
              stroke={trendConfig.stroke} 
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={{ r: 2, fill: trendConfig.stroke, strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: trendConfig.stroke, stroke: '#0f172a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Start / End price labels overlay */}
        <div className="absolute top-0.5 left-1 text-[9px] font-mono text-slate-400 bg-slate-900/80 px-1 py-0.2 rounded border border-slate-800 pointer-events-none">
          -60m: @{openingOdds.toFixed(2)}
        </div>
        <div className="absolute top-0.5 right-1 text-[9px] font-mono font-bold text-slate-200 bg-slate-900/80 px-1 py-0.2 rounded border border-slate-700 pointer-events-none">
          Live: @{currentOdds.toFixed(2)}
        </div>
      </div>

      {/* Footer Metrics Row */}
      {showDetails && (
        <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/80 text-slate-400 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Fourchette 60m :</span>
            <span className="text-slate-300 font-semibold">@{minOdds.toFixed(2)}</span>
            <span className="text-slate-600">➔</span>
            <span className="text-slate-300 font-semibold">@{maxOdds.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {trendConfig.signalIcon}
            <span className={trendConfig.badgeText}>
              {trendConfig.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
