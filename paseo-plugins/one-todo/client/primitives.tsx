import { TextInput } from "@getpaseo/plugin/client/react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

type StableInputProps = {
  initial: string;
  onValue: (v: string) => void;
  style?: any;
  placeholder?: string;
  placeholderTextColor?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  autoCorrect?: boolean;
  onFocus?: () => void;
  editable?: boolean;
};

export const StableInput = memo(function StableInput({
  initial,
  onValue,
  style,
  placeholder,
  placeholderTextColor,
  multiline,
  autoCapitalize,
  autoCorrect,
  onFocus,
  editable,
}: StableInputProps) {
  const ref = useRef(initial);
  const handleChange = useCallback(
    (t: string) => {
      ref.current = t;
      onValue(t);
    },
    [onValue],
  );
  return (
    <TextInput
      style={style}
      defaultValue={initial}
      onChangeText={handleChange}
      multiline={multiline}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      onFocus={onFocus}
      editable={editable}
    />
  );
});

// 一条彩带的两个颜色：底色是莫兰迪（低饱和、高明度），蛇的点比底色深一档。
// 种子按黄金角错开色相，所以每条任务颜色都不一样，但都是同一种淡柔调子。
export function morandiBand(seed: string | number) {
  const n =
    typeof seed === "number"
      ? seed
      : [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = Math.round((n * 137.5) % 360);
  const at = (l: number) => `hsl(${hue}, 22%, ${l}%)`;
  return {
    band: at(74),
    snake: at(66),
  };
}

const LAP_MS = 60 * 1000; // 一圈 60 秒
const FOODS_MAX = 3; // 一圈最多摆几个点
const DOT = 5; // 所有点一样大
const SPACING = DOT - 1; // 点挨着点，不留缝

// 第 i 圈摆几个点、摆在哪：按圈号算出来，所以重开界面、换个设备看到的都一样。
function foodsOf(i: number) {
  let x = ((i + 7) * 1103515245 + 12345) & 0x7fffffff;
  const next = () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
  const n = 1 + Math.floor(next() * FOODS_MAX);
  return Array.from({ length: n }, () => next());
}

// 卡片边上的彩带 + 贪吃蛇。
// 蛇身不存界面里：按任务的开始运行时间算，每分钟长一节，长满一圈（首尾相撞）折回 1 个点。
// 所以重开界面、断线重连、换设备都对得上，不会归零。
export function RibbonSnake({
  ribbon,
  startedAt,
}: {
  ribbon: ReturnType<typeof morandiBand>;
  startedAt?: string;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // 点骑在带子中线上：容器边往里 1 像素（卡片自己那 1 像素的边也染成了彩带色）
  const ink = 1;
  const W = size?.w ?? 0;
  const H = size?.h ?? 0;
  // 拐角圆弧半径，跟彩带的圆角一致；卡片太小时自动收
  const r = Math.max(0, Math.min(12, (W - 2 * ink) / 2, (H - 2 * ink) / 2));
  const ws = Math.max(W - 2 * ink - 2 * r, 0); // 上/下两条直段
  const hs = Math.max(H - 2 * ink - 2 * r, 0); // 左/右两条直段
  const arc = (Math.PI * r) / 2;
  const perimeter = 2 * ws + 2 * hs + 4 * arc;
  const step = perimeter > 0 ? SPACING / perimeter : 0;

  // 沿边走多少（0~1）换算成坐标：从左上角起，顺时针，四个角走圆弧。
  const at = useCallback(
    (s: number) => {
      if (perimeter <= 0) return { x: ink, y: ink };
      const a = (t: number) => (r > 0 ? t / r : 0);
      let t = (((s % 1) + 1) % 1) * perimeter;
      // 上边：左 → 右
      if (t <= ws) return { x: ink + r + t, y: ink };
      t -= ws;
      // 右上角
      if (t <= arc)
        return {
          x: W - ink - r + r * Math.sin(a(t)),
          y: ink + r - r * Math.cos(a(t)),
        };
      t -= arc;
      // 右边：上 → 下
      if (t <= hs) return { x: W - ink, y: ink + r + t };
      t -= hs;
      // 右下角
      if (t <= arc)
        return {
          x: W - ink - r + r * Math.cos(a(t)),
          y: H - ink - r + r * Math.sin(a(t)),
        };
      t -= arc;
      // 下边：右 → 左
      if (t <= ws) return { x: W - ink - r - t, y: H - ink };
      t -= ws;
      // 左下角
      if (t <= arc)
        return {
          x: ink + r - r * Math.sin(a(t)),
          y: H - ink - r + r * Math.cos(a(t)),
        };
      t -= arc;
      // 左边：下 → 上
      if (t <= hs) return { x: ink, y: H - ink - r - t };
      t -= hs;
      // 左上角
      return {
        x: ink + r - r * Math.cos(a(t)),
        y: ink + r - r * Math.sin(a(t)),
      };
    },
    [ink, W, H, r, ws, hs, arc, perimeter],
  );

  const startedMs = startedAt ? Date.parse(startedAt) : NaN;
  const hasClock = Number.isFinite(startedMs);
  const elapsed = hasClock ? Math.max(0, now - startedMs) : 0;

  // 每分钟长一节；长满一圈折回 1 个点
  const cap = step > 0 ? Math.max(2, Math.floor(1 / step)) : 2;
  const len = hasClock ? 1 + (Math.floor(elapsed / 60000) % cap) : 1;

  const s = hasClock ? (elapsed % LAP_MS) / LAP_MS : 0;
  const foods = hasClock
    ? foodsOf(Math.floor(elapsed / LAP_MS)).filter((p) => p > s)
    : [];

  const dot = (key: string, sAt: number) => {
    const pos = at(sAt);
    return (
      <View
        key={key}
        style={{
          position: "absolute",
          left: pos.x - DOT / 2,
          top: pos.y - DOT / 2,
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: ribbon.snake,
        }}
      />
    );
  };

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ w: width, h: height });
      }}
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: ribbon.band,
          shadowColor: ribbon.band,
          shadowOpacity: 0.55,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      {size && perimeter > 0 ? (
        <>
          {foods.map((p, i) => dot(`f${i}`, p))}
          {Array.from({ length: len }, (_, i) => dot(`b${i}`, s - i * step))}
        </>
      ) : null}
    </View>
  );
}
