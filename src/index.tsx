#!/usr/bin/env -S node --enable-source-maps
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import App from './App.js';
import { INDEXJS_SEARCH_PATH_INFO, CONFIG_FILE } from './utils/types.js';
import { startupCheck, readConfigFile } from './utils/config.js';
import { enableDebug } from './utils/misc.js';
import { applyCustomization } from './utils/patches/index.js';

const main = async () => {
  const program = new Command();
  program
    .name('tweakgc')
    .description(
      'Command-line tool to extend your GitHub CLI to accept more selectable models.'
    )
    .version('0.0.1')
    .option('-d, --debug', 'enable debug mode')
    .option('-a, --apply', 'apply saved customizations without interactive UI');
  program.parse();
  const options = program.opts();

  if (options.debug) {
    enableDebug();
  }

  // Handle --apply flag for non-interactive mode
  if (options.apply) {
    console.log('Applying saved customizations to GitHub Copilot CLI...');
    console.log(`Configuration saved at: ${CONFIG_FILE}`);

    try {
      // Read the saved configuration
      const config = await readConfigFile();

      if (!config.settings || Object.keys(config.settings).length === 0) {
        console.error('No saved customizations found in ' + CONFIG_FILE);
        process.exit(1);
      }

      // Find GitHub Copilot CLI installation
      const startupCheckInfo = await startupCheck();

      if (!startupCheckInfo || !startupCheckInfo.instInfo) {
        console.error(`Cannot find GitHub Copilot CLI's index.js`);
        console.error('Searched at the following locations:');
        INDEXJS_SEARCH_PATH_INFO.forEach(info => {
          if (info.isGlob) {
            if (info.expandedPaths.length === 0) {
              console.error(`  - ${info.pattern} (no matches)`);
            } else {
              console.error(`  - ${info.pattern}`);
              info.expandedPaths.forEach(path => {
                console.error(`    - ${path}`);
              });
            }
          } else {
            console.error(`  - ${info.pattern}`);
          }
        });
        process.exit(1);
      }

      console.log(
        `Found GitHub Copilot CLI at: ${startupCheckInfo.instInfo.cliPath}`
      );
      console.log(`Version: ${startupCheckInfo.instInfo.version}`);
      console.log(
        chalk.yellowBright(
          '⚠️ This patcher has been tested and verified to work in version 0.0.337 of the GitHub Copilot CLI, it may break eventually for newer versions! ⚠️'
        )
      );

      // Apply the customizations
      console.log('Applying patches...');
      await applyCustomization(config, startupCheckInfo.instInfo);
      console.log('Patches applied successfully!');
      process.exit(0);
    } catch (error) {
      console.error('Unexpected error:');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  const startupCheckInfo = await startupCheck();

  if (startupCheckInfo) {
    render(<App startupCheckInfo={startupCheckInfo} />);
  } else {
    // Format the search paths to show glob patterns with their expansions
    const formatSearchPaths = () => {
      return INDEXJS_SEARCH_PATH_INFO.map(info => {
        if (info.isGlob) {
          if (info.expandedPaths.length === 0) {
            return `- ${info.pattern} (no matches)`;
          } else {
            const result = [`- ${info.pattern}`];
            info.expandedPaths.forEach(path => {
              result.push(`  - ${path}`);
            });
            return result.join('\n');
          }
        } else {
          return `- ${info.pattern}`;
        }
      }).join('\n');
    };

    console.error(`Cannot find GitHub Copilot CLI's index.js -- do you have GitHub Copilot CLI installed?

Searched at the following locations:
${formatSearchPaths()}

If you have it installed but it's in a location not listed above, please open an issue at
https://github.com/DanielNappa/tweakgc-cli/issues and tell us where you have it--we'll add that location
to our search list and release an update today!  And in the meantime, you can get tweakgc working
by manually specifying that location in ${CONFIG_FILE} with the "installationDir" property:

{
  "installationDir": "${
    process.platform == 'win32'
      ? 'C:\\\\absolute\\\\path\\\\to\\\\node_modules\\\\@github\\\\claude-code'
      : '/absolute/path/to/node_modules/@github/copilot'
  }"
}

Notes:
- Don't include index.js in the path.
- Don't specify the path to your GitHub Copilot CLI executable's directory.  It needs to be the path
  to the folder that contains **index.js**.
- Please also open an issue so that we can add your path to the search list for all users!
`);
    process.exit(1);
  }
};

main();
