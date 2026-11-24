import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Download, Star } from 'lucide-react-native';
import { BaseColors } from '../../styles/theme';
import { TextSkeleton } from '../Skeleton';

export interface FormattedDate {
  date: string;
  timeAgo: string;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

interface PhotoViewerHeaderProps {
  index: number;
  total: number;
  onClose: () => void;
  onDownload?: () => void;
}

/** Top bar: download (left), "x of y" (center), close (right). */
export function PhotoViewerHeader({ index, total, onClose, onDownload }: PhotoViewerHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
      <View style={styles.headerSide}>
        {onDownload && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDownload}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Download photo"
          >
            <Download size={20} color={BaseColors.white} />
          </TouchableOpacity>
        )}
      </View>

      {total > 1 ? (
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>
            {index + 1} of {total}
          </Text>
        </View>
      ) : (
        <View />
      )}

      <View style={[styles.headerSide, styles.headerSideRight]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onClose}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Close photo viewer"
        >
          <X size={22} color={BaseColors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface PhotoViewerFooterProps {
  formattedDate?: FormattedDate;
  isThumbnail: boolean;
  onSetThumbnail?: () => void;
}

/** Bottom caption: date + relative time, with a small thumbnail toggle. */
export function PhotoViewerFooter({ formattedDate, isThumbnail, onSetThumbnail }: PhotoViewerFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
      {formattedDate ? (
        <>
          <Text style={styles.dateText}>{formattedDate.date}</Text>
          <Text style={styles.timeAgoText}>{formattedDate.timeAgo}</Text>
        </>
      ) : (
        <TextSkeleton width={120} height={14} />
      )}

      {onSetThumbnail && (
        <TouchableOpacity
          style={[styles.thumbnailChip, isThumbnail && styles.thumbnailChipActive]}
          onPress={onSetThumbnail}
          disabled={isThumbnail}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isThumbnail ? 'Current thumbnail' : 'Set as thumbnail'}
          accessibilityState={{ selected: isThumbnail }}
        >
          <Star
            size={13}
            color={isThumbnail ? BaseColors.primaryLight : BaseColors.white}
            fill={isThumbnail ? BaseColors.primaryLight : 'transparent'}
          />
          <Text style={[styles.thumbnailChipText, isThumbnail && styles.thumbnailChipTextActive]}>
            {isThumbnail ? 'Thumbnail' : 'Set as thumbnail'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerSide: {
    width: 40,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  counterText: {
    color: BaseColors.white,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dateText: {
    color: BaseColors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  timeAgoText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    marginTop: 2,
  },
  thumbnailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  thumbnailChipActive: {
    borderColor: 'rgba(102, 187, 106, 0.5)',
    backgroundColor: 'rgba(102, 187, 106, 0.15)',
  },
  thumbnailChipText: {
    color: BaseColors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  thumbnailChipTextActive: {
    color: BaseColors.primaryLight,
  },
});
