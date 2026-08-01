import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { IMAGE_CONFIG } from "../constants/domain";
import { getMaxEdgeResizeAction } from "../utils/imageDimensions";

export class PhotoProcessingService {
  private static getDimensions(
    sourceUri: string,
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        sourceUri,
        (width, height) => resolve({ width, height }),
        reject,
      );
    });
  }

  static async createOptimizedOriginal(sourceUri: string): Promise<string> {
    const { width, height } = await this.getDimensions(sourceUri);
    const resizeAction = getMaxEdgeResizeAction(
      width,
      height,
      IMAGE_CONFIG.FULL_SIZE_MAX_EDGE,
    );
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      resizeAction ? [resizeAction] : [],
      {
        compress: IMAGE_CONFIG.FULL_SIZE_COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    return result.uri;
  }

  static async createThumbnail(sourceUri: string): Promise<string> {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: IMAGE_CONFIG.THUMBNAIL_WIDTH } }],
      {
        compress: IMAGE_CONFIG.THUMBNAIL_COMPRESSION_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    return result.uri;
  }
}
