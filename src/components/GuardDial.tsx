import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Line } from "react-native-svg";
import type { GuardPhase } from "../types";
import { colors, fonts } from "../theme";

export const GuardDial = React.memo(function GuardDial({
  phase,
  countdown,
}: {
  phase: GuardPhase;
  countdown: number;
}) {
  const alarm = phase === "alarm";
  const color = alarm
    ? colors.danger
    : phase === "armed"
      ? colors.success
      : colors.primary;
  const wash = alarm
    ? colors.dangerWash
    : phase === "armed"
      ? colors.successWash
      : colors.primaryWash;
  return (
    <View style={s.wrap} accessible={false}>
      <Svg width={236} height={236} viewBox="0 0 236 236" aria-hidden={true}>
        <Circle
          cx={118}
          cy={118}
          r={113}
          fill="none"
          stroke={colors.line}
          strokeWidth={1}
        />
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i * Math.PI) / 24;
          return (
            <Line
              key={i}
              x1={118 + Math.sin(a) * 101}
              y1={118 - Math.cos(a) * 101}
              x2={118 + Math.sin(a) * (i % 4 === 0 ? 92 : 97)}
              y2={118 - Math.cos(a) * (i % 4 === 0 ? 92 : 97)}
              stroke={i % 4 === 0 ? color : colors.line}
              strokeWidth={i % 4 === 0 ? 2 : 1}
            />
          );
        })}
        <Circle cx={118} cy={118} r={82} fill={wash} />
        {phase === "countdown" && (
          <Circle
            cx={118}
            cy={118}
            r={82}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeDasharray={`${(2 * Math.PI * 82 * countdown) / 5} 1000`}
            transform="rotate(-90 118 118)"
            strokeLinecap="round"
          />
        )}
        {phase !== "countdown" && (
          <>
            <Path
              d="M118 68 L153 81 V110 C153 136 137 153 118 162 C99 153 83 136 83 110 V81 Z"
              fill={color}
            />
            {alarm ? (
              <>
                <Line
                  x1={118}
                  y1={92}
                  x2={118}
                  y2={122}
                  stroke={colors.surface}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <Circle cx={118} cy={136} r={3.5} fill={colors.surface} />
              </>
            ) : (
              <Path
                d="M102 115 L113 126 L135 103"
                fill="none"
                stroke={colors.surface}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </>
        )}
        <Circle cx={118} cy={5} r={4} fill={color} />
      </Svg>
      {phase === "countdown" && (
        <View pointerEvents="none" style={s.center}>
          <Text style={[s.count, { color }]}>
            {countdown > 0 ? countdown : "…"}
          </Text>
          <Text style={s.seconds}>
            {countdown > 0 ? "วินาที" : "ปรับเซนเซอร์"}
          </Text>
        </View>
      )}
    </View>
  );
});
const s = StyleSheet.create({
  wrap: { alignSelf: "center", position: "relative", width: 236, height: 236 },
  center: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  count: { fontFamily: fonts.data, fontSize: 66, fontWeight: "600" },
  seconds: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
