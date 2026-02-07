export default ({ config }) => {
  const bundleSuffix = process.env.BUNDLE_SUFFIX || '';
  const appName = process.env.EXPO_PUBLIC_ENVIRONMENT === 'development' ? 'Rooted (dev)' : 'Rooted';
  const schemeName = process.env.EXPO_PUBLIC_ENVIRONMENT === 'development' ? 'rooted-dev' : 'rooted'

  return {
    ...config,
    expo: {
      name: appName,
      slug: "rooted",
      version: "1.0.0",
      sdkVersion: "54.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      updates: {
        url: "https://u.expo.dev/c985d2e8-93a8-4a5d-a7b7-cb59d9e46f11",
        channel: process.env.EXPO_PUBLIC_ENVIRONMENT === 'development' ? 'development' : 'production'
      },
      android: {
        package: `com.myaschm.rooted${bundleSuffix}`,
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        runtimeVersion: "1.0.0"
      },
      userInterfaceStyle: "automatic",
      assetBundlePatterns: [
        "**/*"
      ],
      ios: {
        supportsTablet: true,
        bundleIdentifier: `com.myaschm.rooted${bundleSuffix}`,
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
          NSCameraUsageDescription: "This app needs access to your camera to take photos of your plants.",
          NSPhotoLibraryUsageDescription: "This app needs access to your photo library to select photos of your plants."
        },
        runtimeVersion: {
          policy: "appVersion"
        }
      },
      web: {},
      plugins: [
        "expo-router"
      ],
      scheme: schemeName,
      extra: {
        router: {},
        eas: {
          projectId: "c985d2e8-93a8-4a5d-a7b7-cb59d9e46f11"
        }
      },
      owner: "myaschm"
    }
  };
};