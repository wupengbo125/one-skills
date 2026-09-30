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

// 一条彩带的几档颜色：同一个色相，越往上越深（底色 → 蛇的点 → 小时点 → 天点）。
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
    hour: at(58),
    day: at(48),
  };
}

const LAP_MS = 60 * 1000; // 一圈 60 秒
const MIN_MS = 60 * 1000; // 一个点 = 一分钟
const DOT = 5; // 所有点一样大
const SPACING = DOT - 1; // 点挨着点，不留缝
const HOUR_POINTS = 60; // 60 个普通点合成 1 个小时点
const DAY_HOURS = 24; // 24 个小时点合成 1 个天点
const CAP = 220; // 一圈装 220 节：虚点 + 实点攒到这个数就是首尾相撞（写死，跟卡片多大无关）
const BASE = 150; // 蛇的本命长度：开跑就带着 150 个虚点，常驻、不记账

// 蛇的真实状态只存在"任务的开始时间"上：打开界面时从那一刻往后推一遍，
// 每分钟长一个实点；虚点（本命长度 BASE）只占位置不记账：
// 它算进"绕满一圈是 220 节"里，但撞上时合成小时点/天点只数实点。
type Sim = { upto: number; hour: number; day: number; normals: number };

function advance(sim: Sim) {
  sim.normals += 1;
  if (BASE + sim.normals + sim.hour + sim.day < CAP) return;
  sim.hour += Math.floor(sim.normals / HOUR_POINTS);
  sim.normals %= HOUR_POINTS;
  sim.day += Math.floor(sim.hour / DAY_HOURS);
  sim.hour %= DAY_HOURS;
  // 等级点加到把一圈占满（显示不下了）→ 重置，从 0 重算
  if (BASE + sim.hour + sim.day >= CAP) {
    sim.hour = 0;
    sim.day = 0;
    sim.normals = 0;
  }
}

type Kind = "head" | "normal" | "hour" | "day";

export function RibbonSnake({
  ribbon,
  startedAt,
}: {
  ribbon: ReturnType<typeof morandiBand>;
  startedAt?: string;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<{
    s: number;
    hour: number;
    day: number;
    normals: number;
  }>({ s: 0, hour: 0, day: 0, normals: 0 });
  const [foods, setFoods] = useState<number[]>([]);
  const [eaten, setEaten] = useState(0);

  const foodRef = useRef<number[]>([]);
  const headRef = useRef(0);
  const eatenRef = useRef(0);
  const simRef = useRef<Sim>({ upto: 0, hour: 0, day: 0, normals: 0 });
  const simKeyRef = useRef("");

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
      if (t <= ws) return { x: ink + r + t, y: ink };
      t -= ws;
      if (t <= arc)
        return {
          x: W - ink - r + r * Math.sin(a(t)),
          y: ink + r - r * Math.cos(a(t)),
        };
      t -= arc;
      if (t <= hs) return { x: W - ink, y: ink + r + t };
      t -= hs;
      if (t <= arc)
        return {
          x: W - ink - r + r * Math.cos(a(t)),
          y: H - ink - r + r * Math.sin(a(t)),
        };
      t -= arc;
      if (t <= ws) return { x: W - ink - r - t, y: H - ink };
      t -= ws;
      if (t <= arc)
        return {
          x: ink + r - r * Math.sin(a(t)),
          y: H - ink - r + r * Math.cos(a(t)),
        };
      t -= arc;
      if (t <= hs) return { x: ink, y: H - ink - r - t };
      t -= hs;
      return {
        x: ink + r - r * Math.cos(a(t)),
        y: ink + r - r * Math.sin(a(t)),
      };
    },
    [ink, W, H, r, ws, hs, arc, perimeter],
  );

  useEffect(() => {
    if (perimeter <= 0 || !startedAt) return;
    const startedMs = Date.parse(startedAt);
    if (!Number.isFinite(startedMs)) return;
    const key = `${startedAt}|${Math.round(W)}x${Math.round(H)}`;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startedMs);
      const minute = Math.floor(elapsed / MIN_MS);
      const s = (elapsed % LAP_MS) / LAP_MS;

      // 从上次推到的分钟往前走：界面开着时一次只走一格，只有刚打开时要一路推过来
      const sim = simRef.current;
      if (simKeyRef.current !== key) {
        simKeyRef.current = key;
        sim.upto = 0;
        sim.hour = 0;
        sim.day = 0;
        sim.normals = 0;
        eatenRef.current = 0;
        setEaten(0);
      }
      while (sim.upto < minute) {
        advance(sim);
        sim.upto += 1;
      }

      // 新点只落在空白弧里：蛇身占多长就避开多长；空白只剩一点也照放，那就瞬间被吃掉
      const spot = (head: number) => {
        const stepLen = SPACING / perimeter;
        const bodyLen = Math.min(
          CAP,
          BASE + sim.day + sim.hour + sim.normals + eatenRef.current,
        );
        const span = Math.min(0.98, Math.max(0, bodyLen - 1) * stepLen);
        const p = head + Math.random() * (1 - span);
        return ((p % 1) + 1) % 1;
      };

      // 食物只在被吃掉时才换位置（唯一的触发点）；这里只负责开局摆第一个
      if (foodRef.current.length === 0) {
        foodRef.current = [spot(s)];
        setFoods(foodRef.current);
      }

      // 吃到就立刻在别处空的地方补一个
      const prev = headRef.current;
      headRef.current = s;
      const crossed = (p: number) =>
        prev <= s ? p > prev && p <= s : p > prev || p <= s;
      if (foodRef.current.some(crossed)) {
        foodRef.current = foodRef.current.map((p) =>
          crossed(p) ? spot(s) : p,
        );
        setFoods(foodRef.current);
        // 吃一个身上立刻长一节（这条只在界面里算，重开界面就掉回按时间算的长度）
        eatenRef.current += 1;
        setEaten(eatenRef.current);
      }

      setView({ s, hour: sim.hour, day: sim.day, normals: sim.normals });
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [perimeter, W, H, startedAt]);

  const colorOf = (k: Kind) =>
    k === "hour" ? ribbon.hour : k === "day" ? ribbon.day : ribbon.snake;

  const body: Kind[] = ["head"];
  // 本命长度：常驻的虚点，只占位置
  for (let i = 0; i < BASE; i++) body.push("normal");
  for (let i = 0; i < view.day; i++) body.push("day");
  for (let i = 0; i < view.hour; i++) body.push("hour");
  for (let i = 0; i < view.normals; i++) body.push("normal");
  // 吃出来的额外节数：一圈最多封顶到 CAP，满了就不再涨，免得无限叠在自己身上
  const extra = Math.max(
    0,
    Math.min(eaten, CAP - BASE - view.day - view.hour - view.normals),
  );
  for (let i = 0; i < extra; i++) body.push("normal");

  const dot = (key: string, sAt: number, color: string) => {
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
          backgroundColor: color,
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
      {perimeter > 0 && startedAt ? (
        <>
          {foods.map((p, i) => dot(`f${i}`, p, ribbon.snake))}
          {body.map((k, i) => dot(`b${i}`, view.s - i * step, colorOf(k)))}
        </>
      ) : null}
    </View>
  );
}
