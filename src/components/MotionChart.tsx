import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { colors, fonts } from "../theme";

export function MotionChart({
  samples,
  acceleration,
  rotation,
  threshold,
  live,
  demo,
}: {
  samples: number[];
  acceleration: number;
  rotation: number;
  threshold: number;
  live: boolean;
  demo: boolean;
}) {
  const hasSignal = live && samples.length > 0;
  const ceiling = Math.max(threshold * 2, ...samples, 0.5);
  const y = (value: number) => 64 - Math.min(value / ceiling, 1) * 54;
  const points = samples
    .map(
      (value, index) =>
        (index === 0 ? "M" : "L") +
        " " +
        (4 + (index / 59) * 292) +
        " " +
        y(value),
    )
    .join(" ");
  return (
    <View style={s.panel}>
      <View style={s.header}>
        <Text style={s.label}>ทุกการขยับ เห็นได้ชัด</Text>
        <View style={s.live}>
          <View
            style={[
              s.dot,
              { backgroundColor: hasSignal ? colors.success : colors.muted },
            ]}
          />
          <Text style={s.caption}>
            {demo ? "ข้อมูลตัวอย่าง" : hasSignal ? "เซนเซอร์สด" : "รอสัญญาณ"}
          </Text>
        </View>
      </View>
      <View
        accessible
        accessibilityLabel={
          hasSignal
            ? "ความเร่ง " +
              acceleration.toFixed(2) +
              " จี การหมุน " +
              rotation.toFixed(2) +
              " เรเดียนต่อวินาที"
            : "รอข้อมูลเซนเซอร์ ยังไม่มีค่าการเคลื่อนไหว"
        }
      >
        <View style={s.valueRow}>
          <View style={s.metric}>
            <Text style={s.value}>
              {hasSignal ? acceleration.toFixed(2) : "—"}
              <Text style={s.unit}> g</Text>
            </Text>
          </View>
          <View style={s.rotation}>
            <Text style={s.rotationLabel}>การหมุน</Text>
            <Text style={s.rotationValue}>
              {hasSignal ? rotation.toFixed(2) : "—"}
              <Text style={s.unit}> rad/s</Text>
            </Text>
          </View>
        </View>
        <Svg width="100%" height={75} viewBox="0 0 300 75" aria-hidden={true}>
          {[10, 37, 64].map((position) => (
            <Line
              key={position}
              x1={0}
              y1={position}
              x2={300}
              y2={position}
              stroke={colors.line}
              strokeWidth={0.8}
            />
          ))}
          <Line
            x1={0}
            y1={y(threshold)}
            x2={300}
            y2={y(threshold)}
            stroke={colors.warning}
            strokeDasharray="4 5"
            strokeWidth={1}
          />
          {hasSignal && points ? (
            <Path
              d={points}
              fill="none"
              stroke={colors.chart}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
      <View style={s.footer}>
        <Text style={s.caption}>
          {hasSignal
            ? "ย้อนหลังประมาณ 3 วินาที"
            : "เชื่อมต่อเพื่อดูการเคลื่อนไหว"}
        </Text>
        <Text style={[s.caption, { color: colors.warning }]}>
          − − เกณฑ์ {threshold.toFixed(2)} g
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  live: { flexDirection: "row", gap: 5, alignItems: "center" },
  dot: { width: 5, height: 5, borderRadius: 3 },
  caption: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 16,
    color: colors.muted,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metric: { flex: 1 },
  value: {
    fontFamily: fonts.data,
    color: colors.ink,
    fontSize: 28,
    lineHeight: 36,
  },
  unit: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  rotation: { alignItems: "flex-end", gap: 1 },
  rotationLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 14,
    color: colors.muted,
  },
  rotationValue: {
    fontFamily: fonts.data,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 22,
  },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
