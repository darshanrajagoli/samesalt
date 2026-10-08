import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { NTI_WARNING } from '../constants/nti';
import { T } from './ui';

export function NTIWarning() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="warning" size={20} color={Colors.redDeep} />
        <T v="headline" color={Colors.redDeep} style={{ marginLeft: 8 }}>
          Don't switch this brand
        </T>
      </View>
      <T v="subhead" color={Colors.label} style={{ marginTop: 6 }}>
        {NTI_WARNING}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.redSoft,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 28,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
});
