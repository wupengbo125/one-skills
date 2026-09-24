import { TextInput } from "@getpaseo/plugin/client/react-native";
import { memo, useCallback, useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

type StableInputProps = {
  initial: string;
  onValue: (v: string) => void;
  style?: any;
  placeholder?: string;
  placeholderTextColor?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters" | undefined;
  autoCorrect?: boolean;
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
    />
  );
});

export function PulsingPurpleDot() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 4,
      }}
    >
      <Animated.View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: "#a855f7",
          opacity,
        }}
      />
      <Text style={{ fontSize: 9, color: "#a855f7", fontWeight: "600" }}>
        进行中
      </Text>
    </View>
  );
}
