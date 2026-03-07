import { Tabs } from 'expo-router';
import { Home, MessageSquare, User, Users } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#09090b' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#09090b', borderTopColor: '#27272a' },
        tabBarActiveTintColor: '#3b82f6', // blue-500
        tabBarInactiveTintColor: '#a1a1aa', // zinc-400
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <Users color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
