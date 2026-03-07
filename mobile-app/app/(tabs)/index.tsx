import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-3xl font-bold text-white mb-2">DYPU Connect</Text>
      <Text className="text-zinc-400 text-lg text-center">
        Native Mobile navigation is now enabled.
      </Text>
    </View>
  );
}
