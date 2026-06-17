import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator, Text } from 'react-native';
// import { Text } from '../../../ui/Text';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export function StepFields({
  selectedFields, onToggleField, remoteCategories, isLoading
}: {
  selectedFields: any[]
  onToggleField: (field: any) => void
  remoteCategories: any[] | undefined
  isLoading: boolean
}) {
  const { t } = useTranslation();

  const toggleField = (field: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleField(field);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#10b981" />
      </View>
    );
  }

  const rootCategories = remoteCategories?.filter(c => !c.parent_id) || [];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('auth.profile.education.specialization')}</Text>
      <View style={styles.gridContainer}>
        {rootCategories.map((field) => {
          const isSelected = selectedFields.some(item => item.id === field.id);

          return (
            <Pressable
              key={field.id}
              onPress={() => toggleField(field)}
              style={[
                styles.itemHeader,
                {
                  marginBottom: 12,
                  padding: 20,
                  borderRadius: 16,
                  borderWidth: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                  borderColor: isSelected ? '#10B981' : '#f4f4f5'
                }
              ]}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: isSelected ? '#059669' : '#3f3f46'
              }}>
                {field.name}
              </Text>
              {isSelected ? (
                <CheckCircle2 size={22} color="#10B981" />
              ) : (
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d4d4d8' }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  gridContainer: {
    gap: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  listContainer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  itemContainerSelected: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  itemHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27272a',
  },
  itemTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(113,113,122,0.4)',
  },
  selectedBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  levelBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '800',
  },
  levelContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  levelItemSelected: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  levelText: {
    fontSize: 15,
    color: '#3f3f46',
    fontWeight: '700',
  },
  levelTextSelected: {
    color: '#059669',
    fontWeight: '900',
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    color: '#52525b',
    fontWeight: '500',
    fontStyle: 'italic',
    paddingHorizontal: 8,
    lineHeight: 18,
  }
});
