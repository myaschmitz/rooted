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
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  plantInfo: {
    flex: 1,
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
}); 