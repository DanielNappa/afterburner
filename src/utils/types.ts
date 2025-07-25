import * as path from 'path';
import * as os from 'os';

export interface Theme {
  name: string;
  id: string;
  colors: {
    autoAccept: string;
    bashBorder: string;
    claude: string;
    permission: string;
    planMode: string;
    secondaryBorder: string;
    text: string;
    inverseText: string;
    secondaryText: string;
    suggestion: string;
    remember: string;
    success: string;
    error: string;
    warning: string;
    diffAdded: string;
    diffRemoved: string;
    diffAddedDimmed: string;
    diffRemovedDimmed: string;
    diffAddedWord: string;
    diffRemovedWord: string;
    diffAddedWordDimmed: string;
    diffRemovedWordDimmed: string;
  };
}

export interface LaunchTextConfig {
  method: 'figlet' | 'custom';
  figletText: string;
  figletFont: string;
  customText: string;
}

export interface ThinkingVerbsConfig {
  useHaikuGenerated: boolean;
  punctuation: string;
  verbs: string[];
}

export interface ThinkingStyleConfig {
  reverseMirror: boolean;
  updateInterval: number;
  phases: string[];
}

export interface Settings {
  themes: Theme[];
  launchText: LaunchTextConfig;
  thinkingVerbs: ThinkingVerbsConfig;
  thinkingStyle: ThinkingStyleConfig;
}

export interface TweakccConfig {
  ccVersion: string;
  ccInstallationDir: string | null;
  lastModified: string;
  changesApplied: boolean;
  settings: Settings;
}

export interface ClaudeCodeInstallationInfo {
  cliPath: string;
  packageJsonPath: string;
  version: string;
}

export enum MainMenuItem {
  THEMES = 'Themes',
  LAUNCH_TEXT = 'Launch text',
  THINKING_VERBS = 'Thinking verbs',
  THINKING_STYLE = 'Thinking style',
  APPLY_CHANGES = '*Apply customizations to cli.js',
  RESTORE_ORIGINAL = 'Restore original Claude Code (preserves tweakcc.json)',
  OPEN_CONFIG = 'Open tweakcc.json',
  OPEN_CLI = "Open Claude Code's cli.js",
  EXIT = 'Exit',
}

export const DEFAULT_SETTINGS: Settings = {
  themes: [
    {
      name: 'Dark mode',
      id: 'dark',
      colors: {
        autoAccept: 'rgb(175,135,255)',
        bashBorder: 'rgb(253,93,177)',
        claude: 'rgb(215,119,87)',
        permission: 'rgb(177,185,249)',
        planMode: 'rgb(72,150,140)',
        secondaryBorder: 'rgb(136,136,136)',
        text: 'rgb(255,255,255)',
        inverseText: 'rgb(0,0,0)',
        secondaryText: 'rgb(153,153,153)',
        suggestion: 'rgb(177,185,249)',
        remember: 'rgb(177,185,249)',
        success: 'rgb(78,186,101)',
        error: 'rgb(255,107,128)',
        warning: 'rgb(255,193,7)',
        diffAdded: 'rgb(34,92,43)',
        diffRemoved: 'rgb(122,41,54)',
        diffAddedDimmed: 'rgb(71,88,74)',
        diffRemovedDimmed: 'rgb(105,72,77)',
        diffAddedWord: 'rgb(56,166,96)',
        diffRemovedWord: 'rgb(179,89,107)',
        diffAddedWordDimmed: 'rgb(46,107,58)',
        diffRemovedWordDimmed: 'rgb(139,57,69)',
      },
    },
    {
      name: 'Light mode',
      id: 'light',
      colors: {
        autoAccept: 'rgb(135,0,255)',
        bashBorder: 'rgb(255,0,135)',
        claude: 'rgb(215,119,87)',
        permission: 'rgb(87,105,247)',
        planMode: 'rgb(0,102,102)',
        secondaryBorder: 'rgb(153,153,153)',
        text: 'rgb(0,0,0)',
        inverseText: 'rgb(255,255,255)',
        secondaryText: 'rgb(102,102,102)',
        suggestion: 'rgb(87,105,247)',
        remember: 'rgb(0,0,255)',
        success: 'rgb(44,122,57)',
        error: 'rgb(171,43,63)',
        warning: 'rgb(150,108,30)',
        diffAdded: 'rgb(105,219,124)',
        diffRemoved: 'rgb(255,168,180)',
        diffAddedDimmed: 'rgb(199,225,203)',
        diffRemovedDimmed: 'rgb(253,210,216)',
        diffAddedWord: 'rgb(47,157,68)',
        diffRemovedWord: 'rgb(209,69,75)',
        diffAddedWordDimmed: 'rgb(144,194,156)',
        diffRemovedWordDimmed: 'rgb(232,165,173)',
      },
    },
    {
      name: 'Light mode (ANSI colors only)',
      id: 'light-ansi',
      colors: {
        autoAccept: '#cd00cd',
        bashBorder: '#cd00cd',
        claude: '#cdcd00',
        permission: '#0000ee',
        planMode: '#00cdcd',
        secondaryBorder: '#e5e5e5',
        text: '#000000',
        inverseText: '#ffffff',
        secondaryText: '#7f7f7f',
        suggestion: '#0000ee',
        remember: '#0000ee',
        success: '#00cd00',
        error: '#cd0000',
        warning: '#cdcd00',
        diffAdded: '#00cd00',
        diffRemoved: '#cd0000',
        diffAddedDimmed: '#00cd00',
        diffRemovedDimmed: '#cd0000',
        diffAddedWord: '#00ff00',
        diffRemovedWord: '#ff0000',
        diffAddedWordDimmed: '#00cd00',
        diffRemovedWordDimmed: '#cd0000',
      },
    },
    {
      name: 'Dark mode (ANSI colors only)',
      id: 'dark-ansi',
      colors: {
        autoAccept: '#ff00ff',
        bashBorder: '#ff00ff',
        claude: '#cdcd00',
        permission: '#5c5cff',
        planMode: '#00ffff',
        secondaryBorder: '#e5e5e5',
        text: '#ffffff',
        inverseText: '#000000',
        secondaryText: '#e5e5e5',
        suggestion: '#5c5cff',
        remember: '#5c5cff',
        success: '#00ff00',
        error: '#ff0000',
        warning: '#ffff00',
        diffAdded: '#00cd00',
        diffRemoved: '#cd0000',
        diffAddedDimmed: '#00cd00',
        diffRemovedDimmed: '#cd0000',
        diffAddedWord: '#00ff00',
        diffRemovedWord: '#ff0000',
        diffAddedWordDimmed: '#00cd00',
        diffRemovedWordDimmed: '#cd0000',
      },
    },
    {
      name: 'Light mode (colorblind-friendly)',
      id: 'light-daltonized',
      colors: {
        autoAccept: 'rgb(135,0,255)',
        bashBorder: 'rgb(0,102,204)',
        claude: 'rgb(255,153,51)',
        permission: 'rgb(51,102,255)',
        planMode: 'rgb(51,102,102)',
        secondaryBorder: 'rgb(153,153,153)',
        text: 'rgb(0,0,0)',
        inverseText: 'rgb(255,255,255)',
        secondaryText: 'rgb(102,102,102)',
        suggestion: 'rgb(51,102,255)',
        remember: 'rgb(51,102,255)',
        success: 'rgb(0,102,153)',
        error: 'rgb(204,0,0)',
        warning: 'rgb(255,153,0)',
        diffAdded: 'rgb(153,204,255)',
        diffRemoved: 'rgb(255,204,204)',
        diffAddedDimmed: 'rgb(209,231,253)',
        diffRemovedDimmed: 'rgb(255,233,233)',
        diffAddedWord: 'rgb(51,102,204)',
        diffRemovedWord: 'rgb(153,51,51)',
        diffAddedWordDimmed: 'rgb(102,153,204)',
        diffRemovedWordDimmed: 'rgb(204,153,153)',
      },
    },
    {
      name: 'Dark mode (colorblind-friendly)',
      id: 'dark-daltonized',
      colors: {
        autoAccept: 'rgb(175,135,255)',
        bashBorder: 'rgb(51,153,255)',
        claude: 'rgb(255,153,51)',
        permission: 'rgb(153,204,255)',
        planMode: 'rgb(102,153,153)',
        secondaryBorder: 'rgb(136,136,136)',
        text: 'rgb(255,255,255)',
        inverseText: 'rgb(0,0,0)',
        secondaryText: 'rgb(153,153,153)',
        suggestion: 'rgb(153,204,255)',
        remember: 'rgb(153,204,255)',
        success: 'rgb(51,153,255)',
        error: 'rgb(255,102,102)',
        warning: 'rgb(255,204,0)',
        diffAdded: 'rgb(0,68,102)',
        diffRemoved: 'rgb(102,0,0)',
        diffAddedDimmed: 'rgb(62,81,91)',
        diffRemovedDimmed: 'rgb(62,44,44)',
        diffAddedWord: 'rgb(0,119,179)',
        diffRemovedWord: 'rgb(179,0,0)',
        diffAddedWordDimmed: 'rgb(26,99,128)',
        diffRemovedWordDimmed: 'rgb(128,21,21)',
      },
    },
  ],
  launchText: {
    method: 'figlet',
    figletText: 'Claude Code',
    figletFont: 'ANSI Shadow',
    customText: '',
  },
  thinkingVerbs: {
    useHaikuGenerated: true,
    punctuation: '…',
    verbs: [
      'Accomplishing',
      'Actioning',
      'Actualizing',
      'Baking',
      'Booping',
      'Brewing',
      'Calculating',
      'Cerebrating',
      'Channelling',
      'Churning',
      'Clauding',
      'Coalescing',
      'Cogitating',
      'Combobulating',
      'Computing',
      'Concocting',
      'Conjuring',
      'Considering',
      'Contemplating',
      'Cooking',
      'Crafting',
      'Creating',
      'Crunching',
      'Deciphering',
      'Deliberating',
      'Determining',
      'Discombobulating',
      'Divining',
      'Doing',
      'Effecting',
      'Elucidating',
      'Enchanting',
      'Envisioning',
      'Finagling',
      'Flibbertigibbeting',
      'Forging',
      'Forming',
      'Frolicking',
      'Generating',
      'Germinating',
      'Hatching',
      'Herding',
      'Honking',
      'Hustling',
      'Ideating',
      'Imagining',
      'Incubating',
      'Inferring',
      'Jiving',
      'Manifesting',
      'Marinating',
      'Meandering',
      'Moseying',
      'Mulling',
      'Musing',
      'Mustering',
      'Noodling',
      'Percolating',
      'Perusing',
      'Philosophising',
      'Pondering',
      'Pontificating',
      'Processing',
      'Puttering',
      'Puzzling',
      'Reticulating',
      'Ruminating',
      'Scheming',
      'Schlepping',
      'Shimmying',
      'Shucking',
      'Simmering',
      'Smooshing',
      'Spelunking',
      'Spinning',
      'Stewing',
      'Sussing',
      'Synthesizing',
      'Thinking',
      'Tinkering',
      'Transmuting',
      'Unfurling',
      'Unravelling',
      'Vibing',
      'Wandering',
      'Whirring',
      'Wibbling',
      'Wizarding',
      'Working',
      'Wrangling',
    ],
  },
  thinkingStyle: {
    updateInterval: 120,
    phases:
      // On Windows one of these can be an emoji with an ugly green background, which is likely the
      // original cause of this conditional.
      process.env.TERM === 'xterm-ghostty'
        ? ['·', '✢', '✳', '✶', '✻', '*']
        : process.platform === 'darwin'
        ? ['·', '✢', '✳', '✶', '✻', '✽']
        : ['·', '✢', '*', '✶', '✻', '✽'],
    reverseMirror: true,
  },
};

export const CONFIG_DIR = path.join(os.homedir(), '.tweakcc');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const CLIJS_BACKUP_FILE = path.join(CONFIG_DIR, 'cli.js.backup');

// prettier-ignore
export const CLIJS_SEARCH_PATHS = [
  // Volta installation
  path.join(os.homedir(), "AppData", "Local", "Volta", "tools", "image", "packages", "@anthropic-ai", "claude-code", "node_modules", "@anthropic-ai", "claude-code"),
  // NPM global installations
  path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules", "@anthropic-ai", "claude-code"),
  // Yarn global
  path.join(os.homedir(), "AppData", "Local", "Yarn", "config", "global", "node_modules", "@anthropic-ai", "claude-code"),
  // PNPM global
  path.join(os.homedir(), "AppData", "Local", "pnpm", "global", "5", "node_modules", "@anthropic-ai", "claude-code"),
];

// n
if (process.env.N_PREFIX) {
  // prettier-ignore
  CLIJS_SEARCH_PATHS.push(path.join(process.env.N_PREFIX, 'lib', 'node_modules', '@anthropic-ai', 'claude-code'));
}
if (process.platform != 'win32') {
  // prettier-ignore
  CLIJS_SEARCH_PATHS.push(path.join('/usr', 'local', 'lib', 'node_modules', '@anthropic-ai', 'claude-code'));
}
