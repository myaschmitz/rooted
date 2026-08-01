// Sentry-wrapped Metro config so bundles/source maps get unique Debug IDs.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = config;
