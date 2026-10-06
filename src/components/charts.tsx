import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useProgress } from './anim';
import { useTheme } from '@/theme';
import { formatCompact } from '@/utils/format';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type DonutSlice = { id: string; value: number; color: string };

export function DonutChart({
  data,
  size = 200,
  stroke = 24,
  trigger,
  selectedId,
  onSelect,
  centerTop,
  centerValue,
}: {
  data: DonutSlice[];
  size?: number;
  stroke?: number;
  trigger: unknown;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  centerTop: string;
  centerValue: string;
}) {
  const p = useTheme();
  const progress = useProgress(trigger, 1100);
  const c = size / 2;
  const r = (size - stroke - 8) / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const gap = data.length > 1 ? 3 : 0;
  const drawn = progress * circ;

  const lengths = data.map((d) => (total ? (d.value / total) * circ : 0));
  const slices = data.map((d, i) => ({ ...d, len: lengths[i], start: lengths.slice(0, i).reduce((a, b) => a + b, 0) }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={p.track} strokeWidth={stroke} fill="none" />
        {slices.map((s) => {
          const visible = Math.max(0, s.len - gap);
          const segProgress = clamp01((drawn - s.start) / (s.len || 1));
          const selected = selectedId === s.id;
          const dimmed = selectedId && !selected;
          return (
            <Circle
              key={s.id}
              cx={c}
              cy={c}
              r={r}
              stroke={s.color}
              strokeOpacity={dimmed ? 0.3 : 1}
              strokeWidth={selected ? stroke + 8 : stroke}
              fill="none"
              strokeDasharray={`${visible} ${circ}`}
              strokeDashoffset={visible * (1 - segProgress)}
              transform={`rotate(${-90 + (s.start / circ) * 360} ${c} ${c})`}
              onPress={onSelect ? () => onSelect(selected ? null : s.id) : undefined}
            />
          );
        })}
      </Svg>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ color: p.textTertiary, fontSize: 12 }}>{centerTop}</Text>
        <Text style={{ color: p.text, fontSize: 20, fontWeight: '700', marginTop: 2 }}>{centerValue}</Text>
      </View>
    </View>
  );
}

export type BarGroup = { label: string; income: number; expense: number };

export function BarChart({
  data,
  height = 150,
  trigger,
  selected,
  onSelect,
}: {
  data: BarGroup[];
  height?: number;
  trigger: unknown;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const p = useTheme();
  const progress = useProgress(trigger, 900);
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense])) * 1.1;
  const ticks = [1, 0.5, 0];

  return (
    <View>
      <View style={{ height, flexDirection: 'row' }}>
        <View style={{ width: 44, justifyContent: 'space-between' }}>
          {ticks.map((t) => (
            <Text key={t} style={{ color: p.textTertiary, fontSize: 10 }}>
              {formatCompact(max * t)}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          {ticks.map((t) => (
            <View key={t} style={[styles.grid, { top: (1 - t) * (height - 1), backgroundColor: p.border }]} />
          ))}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
            {data.map((d, i) => {
              const active = i === selected;
              return (
                <Pressable key={d.label} onPress={() => onSelect(i)} style={[styles.column, active && { backgroundColor: p.accentSoft }]}>
                  <View style={[styles.bar, { height: (d.income / max) * height * progress, backgroundColor: p.success, opacity: active ? 1 : 0.55 }]} />
                  <View style={[styles.bar, { height: (d.expense / max) * height * progress, backgroundColor: p.danger, opacity: active ? 1 : 0.55 }]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginLeft: 44, marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i === selected ? p.text : p.textTertiary, fontWeight: i === selected ? '700' : '400' }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function CumulativeChart({
  actual,
  days,
  plan,
  height = 150,
  trigger,
}: {
  actual: number[];
  days: number;
  plan: number;
  height?: number;
  trigger: unknown;
}) {
  const p = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useProgress(trigger, 1200);
  const max = Math.max(plan, ...actual, 1) * 1.1;
  const pad = 6;
  const h = height - pad * 2;
  const x = (i: number) => (days <= 1 ? 0 : (i / (days - 1)) * width);
  const y = (v: number) => pad + h - (v / max) * h;

  const visible = progress * Math.max(0, actual.length - 1);
  const points: [number, number][] = [];
  for (let i = 0; i <= Math.floor(visible) && i < actual.length; i++) points.push([x(i), y(actual[i])]);
  const frac = visible - Math.floor(visible);
  const next = Math.floor(visible) + 1;
  if (frac > 0 && next < actual.length) {
    const prev = actual[next - 1];
    points.push([x(next - 1 + frac), y(prev + (actual[next] - prev) * frac)]);
  }
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const area = last ? `${line} L${last[0].toFixed(1)},${pad + h} L0,${pad + h} Z` : '';
  const overPlan = actual.length > 0 && actual[actual.length - 1] > (plan / days) * actual.length;
  const color = overPlan ? p.danger : p.accent;

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} y1={pad + h} x2={width} y2={pad + h} stroke={p.border} strokeWidth={1} />
            <Line x1={0} y1={y(0)} x2={width} y2={y(plan)} stroke={p.textTertiary} strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={progress} />
            {area ? <Path d={area} fill={color} fillOpacity={0.12} /> : null}
            {line ? <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
            {last ? <Circle cx={last[0]} cy={last[1]} r={4.5} fill={color} stroke={p.card} strokeWidth={2} /> : null}
          </Svg>
        )}
      </View>
      <View style={styles.axis}>
        {[1, Math.round(days / 3), Math.round((days * 2) / 3), days].map((d) => (
          <Text key={d} style={{ color: p.textTertiary, fontSize: 10 }}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: color }]} />
          <Text style={{ color: p.textSecondary, fontSize: 12 }}>Факт</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: p.textTertiary }]} />
          <Text style={{ color: p.textSecondary, fontSize: 12 }}>План: равномерно до лимита</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  column: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, borderRadius: 8, paddingTop: 4 },
  bar: { width: 9, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 14, height: 3, borderRadius: 2 },
});
