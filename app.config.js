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
      web: {
        bundler: "metro",
        output: "single",
        favicon: "./assets/icon.png",
      },
      plugins: [
        "expo-router",
        "./plugins/withMmkvPin",
        [
          "@sentry/react-native/expo",
          {
            url: "https://sentry.io/",
            project: "react-native",
            organization: "myaschmitz",
          }
        ],
        [
          // MMKV 2.4.1 calls memset_s on Apple without defining __STDC_WANT_LIB_EXT1__,
          // so it fails to compile against the iOS SDK. react-native-mmkv depends on
          // "MMKV >= 1.3.3", which floats to the broken version on every build.
          // Pin both until upstream ships a fix: Tencent/MMKV AESCrypt.cpp secureZero.
          "expo-build-properties",
          {
            ios: {
              extraPods: [
                { name: "MMKV", version: "2.4.0" },
                { name: "MMKVCore", version: "2.4.0" }
              ]
            }
          }
        ]
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