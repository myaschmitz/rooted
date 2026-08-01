import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { PhotoProcessingService } from "../../services/PhotoProcessingService";

jest.mock("react-native", () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

describe("PhotoProcessingService", () => {
  const getSizeMock = Image.getSize as jest.Mock;
  const manipulateMock = ImageManipulator.manipulateAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    manipulateMock.mockResolvedValue({ uri: "optimized.jpg" });
  });

  it("caps a portrait original at a 2048px maximum edge with 80% quality", async () => {
    getSizeMock.mockImplementation(
      (
        _uri: string,
        success: (width: number, height: number) => void,
      ) => success(3024, 4032),
    );

    await PhotoProcessingService.createOptimizedOriginal("source.jpg");

    expect(manipulateMock).toHaveBeenCalledWith(
      "source.jpg",
      [{ resize: { height: 2048 } }],
      { compress: 0.8, format: "jpeg" },
    );
  });

  it("does not upscale an original already within the size limit", async () => {
    getSizeMock.mockImplementation(
      (
        _uri: string,
        success: (width: number, height: number) => void,
      ) => success(1200, 1600),
    );

    await PhotoProcessingService.createOptimizedOriginal("source.jpg");

    expect(manipulateMock).toHaveBeenCalledWith("source.jpg", [], {
      compress: 0.8,
      format: "jpeg",
    });
  });

  it("keeps thumbnails at 300px and 70% quality", async () => {
    await PhotoProcessingService.createThumbnail("source.jpg");

    expect(manipulateMock).toHaveBeenCalledWith(
      "source.jpg",
      [{ resize: { width: 300 } }],
      { compress: 0.7, format: "jpeg" },
    );
  });
});
