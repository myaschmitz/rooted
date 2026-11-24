import {
  SquarePen,
  GitBranch,
  Link2,
  Unlink,
  Archive,
  Trash2,
} from "lucide-react-native";
import type { ActionMenuItem } from "../ActionMenu";

interface PlantMenuHandlers {
  hasParent: boolean;
  onEdit: () => void;
  onPropagate: () => void;
  onLinkParent: () => void;
  onLinkChild: () => void;
  onUnlinkParent: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

/** Builds the grouped "⋯" menu for the plant detail header. */
export function buildPlantMenuGroups({
  hasParent,
  onEdit,
  onPropagate,
  onLinkParent,
  onLinkChild,
  onUnlinkParent,
  onArchive,
  onDelete,
}: PlantMenuHandlers): ActionMenuItem[][] {
  return [
    [{ key: "edit", label: "Edit plant", icon: SquarePen, onPress: onEdit }],
    [
      {
        key: "propagate",
        label: "Propagate",
        icon: GitBranch,
        onPress: onPropagate,
      },
      hasParent
        ? {
            key: "unlink-parent",
            label: "Unlink from parent",
            icon: Unlink,
            onPress: onUnlinkParent,
          }
        : {
            key: "link-parent",
            label: "Mark as propagation",
            icon: Link2,
            onPress: onLinkParent,
          },
      {
        key: "link-child",
        label: "Add existing propagation",
        icon: Link2,
        onPress: onLinkChild,
      },
    ],
    [
      { key: "archive", label: "Archive", icon: Archive, onPress: onArchive },
      {
        key: "delete",
        label: "Delete",
        icon: Trash2,
        onPress: onDelete,
        destructive: true,
      },
    ],
  ];
}
