import { StyleSheet } from 'react-native';
import { Theme } from '../contexts/ThemeContext';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    flex: 1,
  },
  plantCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 3,
  },
  plantCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plantThumbnail: {
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  pinButton: {
    padding: 8,
    marginLeft: 8,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  plantType: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  plantLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sectionCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  addButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    color: theme.colors.textOnPrimary,
    fontSize: 28,
    lineHeight: 28,
  },
  // Batch mode styles
  plantCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  locationHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  selectAllText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  // Care detail styles
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  severityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityLow: { backgroundColor: '#4CAF50' },
  severityMedium: { backgroundColor: '#ffcb2eff' },
  severityHigh: { backgroundColor: '#F44336' },
  severityButtonSelected: {
    transform: [{ scale: 1.1 }],
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 6,
  },
  severityLowSelected: { backgroundColor: '#2E7D32' },
  severityMediumSelected: { backgroundColor: '#e6ad00ff' },
  severityHighSelected: { backgroundColor: '#C62828' },
  severityText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  severityTextSelected: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  strengthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  strengthOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  strengthOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  strengthTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
}); 