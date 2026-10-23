import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/lib/format';

const SIZE = 216;
const STROKE = 43.2; // outer radius − 60% inner radius
const RADIUS = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 3;

interface DonutChartProps {
  total: number;
  males: number;
  females: number;
  centerLabel: string;
  ariaLabel: string;
}

export function DonutChart({
  total,
  males,
  females,
  centerLabel,
  ariaLabel,
}: DonutChartProps) {
  const { i18n } = useTranslation();
  const malesPct = total > 0 ? males / total : 0;
  const femalesPct = total > 0 ? females / total : 0;
  const available = Math.max(0, CIRCUMFERENCE - GAP * 2);
  const malesLen = available * malesPct;
  const femalesLen = available * femalesPct;

  return (
    <div className="relative size-[216px]" role="img" aria-label={ariaLabel}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <g transform={`rotate(-90 ${CX} ${CY})`}>
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="var(--color-naranja)"
            strokeWidth={STROKE}
            strokeDasharray={`${malesLen} ${CIRCUMFERENCE - malesLen}`}
            strokeDashoffset={0}
          />
          <circle
            cx={CX}
            cy={CY}
            r={RADIUS}
            fill="none"
            stroke="var(--color-amarillo)"
            strokeWidth={STROKE}
            strokeDasharray={`${femalesLen} ${CIRCUMFERENCE - femalesLen}`}
            strokeDashoffset={-(malesLen + GAP)}
          />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="t-heading-lg text-negro">
          {formatNumber(total, i18n.resolvedLanguage)}
        </span>
        <span className="t-small text-negro">{centerLabel}</span>
      </div>
    </div>
  );
}
