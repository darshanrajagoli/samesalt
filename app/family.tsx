import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useCabinet } from '../src/context/CabinetContext';
import { useRevenueCat } from '../src/context/RevenueCatContext';
import { Config } from '../src/constants/config';

export default function FamilyScreen() {
  const router = useRouter();
  const {
    data,
    activeProfile,
    createProfile,
    deleteProfile,
    setActiveProfile,
  } = useCabinet();
  const { isPro } = useRevenueCat();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }
    if (data.profiles.length >= Config.MAX_FAMILY_PROFILES) {
      Alert.alert('Limit Reached', `Maximum ${Config.MAX_FAMILY_PROFILES} profiles.`);
      return;
    }
    const name = newName.trim();
    if (!name) return;
    await createProfile(name);
    setNewName('');
    setShowAdd(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === 'default') {
      Alert.alert('Cannot Delete', 'The default profile cannot be deleted.');
      return;
    }
    Alert.alert('Delete Profile', `Remove "${name}" and all their saved medicines?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteProfile(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data.profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>
            Family Profiles ({data.profiles.length}/{Config.MAX_FAMILY_PROFILES})
          </Text>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeProfile.id;
          return (
            <TouchableOpacity
              style={[styles.profileCard, isActive && styles.activeCard]}
              onPress={() => setActiveProfile(item.id)}
            >
              <View style={styles.profileLeft}>
                <Ionicons
                  name={isActive ? 'person-circle' : 'person-circle-outline'}
                  size={36}
                  color={isActive ? Colors.teal600 : Colors.gray400}
                />
                <View>
                  <Text
                    style={[
                      styles.profileName,
                      isActive && styles.activeText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={styles.medCount}>
                    {item.medicines.length} medicines saved
                  </Text>
                </View>
              </View>

              <View style={styles.profileRight}>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
                {item.id !== 'default' && (
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id, item.name)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Colors.gray400}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            {showAdd ? (
              <View style={styles.addForm}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Profile name"
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  maxLength={20}
                />
                <TouchableOpacity style={styles.addConfirmBtn} onPress={handleAdd}>
                  <Text style={styles.addConfirmText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdd(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => {
                  if (!isPro && data.profiles.length >= 1) {
                    router.push('/paywall');
                  } else {
                    setShowAdd(true);
                  }
                }}
              >
                <Ionicons name="add-circle-outline" size={22} color={Colors.teal600} />
                <Text style={styles.addBtnText}>Add Profile</Text>
              </TouchableOpacity>
            )}

            {!isPro && (
              <View style={styles.proHint}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.proHintText}>
                  Multiple profiles require SameSalt Family
                </Text>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeCard: { borderColor: Colors.teal400, backgroundColor: Colors.teal50 },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  activeText: { color: Colors.teal800 },
  medCount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  profileRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeBadge: {
    backgroundColor: Colors.teal600,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  addForm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: Colors.white,
  },
  addConfirmBtn: {
    backgroundColor: Colors.teal700,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addConfirmText: { color: Colors.white, fontWeight: '600' },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 15, color: Colors.teal600, fontWeight: '600' },
  proHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  proHintText: { fontSize: 12, color: Colors.textMuted },
});
