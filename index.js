// index.js
import 'react-native-gesture-handler'; // MUST be first import
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App />
    </GestureHandlerRootView>
  );
}

// Works for Expo Go and native builds
registerRootComponent(Root);
