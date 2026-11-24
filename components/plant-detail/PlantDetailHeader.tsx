import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { MapPin, Sprout } from "lucide-react-native";
import { Plant, PlantPhoto } from "../../types/Plant";
import { PhotoService } from "../../services/PhotoService";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { Spacing, Typography, BorderRadius } from "../../styles/theme";
import ActionMenu, { ActionMenuItem } from "../ActionMenu";

interface PlantDetailHeaderProps {
  plant: Plant;
  thumbnailPhoto: PlantPhoto | null | undefined;
  onThumbnailPress: () => void;
  /** Infrequent actions shown in the "⋯" menu. */
  menuGroups: ActionMenuItem[][];
  /** Rendered under the title row inside the header card (e.g. tags). */
  children?: React.ReactNode;
}

const THUMBNAIL_SIZE = 72;

export default function PlantDetailHeader({
  plant,
  thumbnailPhoto,
  onThumbnailPress,
  menuGroups,
  children,
}: PlantDetailHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const title = plant.name || plant.type;
  const showType = !!plant.name && plant.name !== plant.type;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {thumbnailPhoto ? (
          <TouchableOpacity
            onPress={onThumbnailPress}
            accessibilityLabel="View photo"
          >
            <Image
              source={{ uri: PhotoService.getImageUrl(thumbnailPhoto, true) }}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          </TouchableOpacity>
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Sprout size={30} color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={2}>
            {title}
          </Text>
          {showType ? (
            <Text style={styles.type} numberOfLines={1}>
              {plant.type}
            </Text>
          ) : null}
          {plant.location ? (
            <View style={styles.locationRow}>
              <MapPin size={13} color={theme.colors.textTertiary} />
              <Text style={styles.location} numberOfLines={1}>
                {plant.location}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.menu}>
          <ActionMenu
            groups={menuGroups}
            accessibilityLabel="Plant actions"
          />
        </View>
      </View>

      {children ? <View style={styles.footer}>{children}</View> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: Spacing.sm + 2,
      marginTop: Spacing.sm + 2,
      marginBottom: Spacing.sm + 2,
      padding: Spacing.base,
      borderRadius: BorderRadius.xl,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.base - 2,
    },
    thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    thumbnailPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: Typography["2xl"],
      fontWeight: Typography.weights.bold,
      color: theme.colors.text,
    },
    type: {
      fontSize: Typography.base,
      color: theme.colors.textSecondary,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      marginTop: 2,
    },
    location: {
      fontSize: Typography.sm,
      color: theme.colors.textTertiary,
      flexShrink: 1,
    },
    menu: {
      alignSelf: "flex-start",
      marginTop: -Spacing.xs,
      marginRight: -Spacing.xs,
    },
    footer: {
      marginTop: Spacing.base - 2,
      paddingTop: Spacing.base - 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderLight,
    },
  });
