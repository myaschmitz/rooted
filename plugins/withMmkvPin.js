const fs = require('fs');
const path = require('path');
const { createRunOncePlugin, withDangerousMod } = require('expo/config-plugins');

const MARKER = '# MMKV pinned by plugins/withMmkvPin.js';
const PODFILE_ANCHOR = '  use_expo_modules!';
const PODFILE_ADDITIONS = `${MARKER}
  pod 'MMKV', '2.4.0'
  pod 'MMKVCore', '2.4.0'

${PODFILE_ANCHOR}`;

const withMmkvPin = (config) =>
  withDangerousMod(config, [
    'ios',
    (modifiedConfig) => {
      const podfilePath = path.join(
        modifiedConfig.modRequest.platformProjectRoot,
        'Podfile',
      );
      const podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes(MARKER)) {
        if (!podfile.includes(PODFILE_ANCHOR)) {
          throw new Error('Unable to locate the iOS Podfile insertion point');
        }

        fs.writeFileSync(
          podfilePath,
          podfile.replace(PODFILE_ANCHOR, PODFILE_ADDITIONS),
        );
      }

      return modifiedConfig;
    },
  ]);

module.exports = createRunOncePlugin(withMmkvPin, 'with-mmkv-pin', '1.0.0');
