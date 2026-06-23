const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');

/**
 * Explicitní Android Auto Backup pravidla — místo výchozího fileset (celé
 * `files/` + `databases/` + `shared_prefs/`) zálohuje jen to, co appka
 * skutečně potřebuje k obnově: vlastní SQLite DB (`files/SQLite/`),
 * AsyncStorage (`databases/RKStorage`) a `shared_prefs/`.
 *
 * Důvod, proč nespoléhat na default: v dev buildu žije v `files/` i
 * `BridgelessReactNativeDevBundle.js` (~15 MB, RN bridgeless JS bundle cache)
 * — default fileset by ho zálohoval celý, zbytečně žere z 25MB/den kvóty.
 * V produkci tenhle konkrétní soubor nevznikne, ale stejné riziko hrozí
 * jakémukoli budoucímu velkému souboru omylem uloženému do `files/` místo
 * `cache/`. Explicitní include-only pravidla tomu předchází bez ohledu na to,
 * co všechno appka časem do `files/` přidá.
 *
 * Android ≤11 = `backup_rules.xml` (`android:fullBackupContent`).
 * Android 12+ = `data_extraction_rules.xml` (`android:dataExtractionRules`,
 * cloud-backup i device-transfer).
 */

const BACKUP_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="file" path="SQLite/" />
    <include domain="database" path="." />
    <include domain="sharedpref" path="." />
</full-backup-content>
`;

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="file" path="SQLite/" />
        <include domain="database" path="." />
        <include domain="sharedpref" path="." />
    </cloud-backup>
    <device-transfer>
        <include domain="file" path="SQLite/" />
        <include domain="database" path="." />
        <include domain="sharedpref" path="." />
    </device-transfer>
</data-extraction-rules>
`;

function withAndroidBackupRules(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'backup_rules.xml'), BACKUP_RULES_XML);
      fs.writeFileSync(path.join(xmlDir, 'data_extraction_rules.xml'), DATA_EXTRACTION_RULES_XML);
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    mainApplication.$['android:fullBackupContent'] = '@xml/backup_rules';
    mainApplication.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    return config;
  });

  return config;
}

module.exports = withAndroidBackupRules;
