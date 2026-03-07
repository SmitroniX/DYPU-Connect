import { Text, View } from 'react-native';

export default function ChatScreen() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-3xl font-bold text-white mb-2">Chat</Text>
      <Text className="text-zinc-400 text-lg text-center">
        Public and Private chats go here.
      </Text>
    </View>
  );
}
