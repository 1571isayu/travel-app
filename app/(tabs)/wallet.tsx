import { View, Text, StyleSheet } from 'react-native';

export default function AdventureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🗺️ 冒險地圖</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF0' },
  text: { fontSize: 24, fontWeight: 'bold', color: '#4A342E' }
});