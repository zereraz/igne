import { Stack } from 'expo-router';
import { useColors } from '../../sources/theme/colors';

export default function VaultLayout() {
  const { bg } = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[file]" />
    </Stack>
  );
}
