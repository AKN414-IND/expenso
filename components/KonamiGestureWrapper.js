// components/KonamiGestureWrapper.js
import React, { useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";

const KONAMI_CODE = ["UP", "UP", "DOWN", "DOWN", "LEFT", "RIGHT", "LEFT", "RIGHT"];

export const KonamiGestureWrapper = ({ children }) => {
  const navigation = useNavigation();
  const [sequence, setSequence] = useState([]);

  const panGesture = Gesture.Pan()
    .onEnd((e) => {
      const { translationX, translationY } = e;
      let direction;
      if (Math.abs(translationX) > Math.abs(translationY)) {
        direction = translationX > 0 ? "RIGHT" : "LEFT";
      } else {
        direction = translationY > 0 ? "DOWN" : "UP";
      }

      const newSequence = [...sequence, direction];

      if (KONAMI_CODE[newSequence.length - 1] !== direction) {
        // Incorrect swipe, reset sequence
        setSequence([]);
        return;
      }

      if (newSequence.length === KONAMI_CODE.length) {
        // Success!
        navigation.navigate("SecretScreen");
        setSequence([]);
      } else {
        setSequence(newSequence);
      }
    });

  return <GestureDetector gesture={panGesture}>{children}</GestureDetector>;
};