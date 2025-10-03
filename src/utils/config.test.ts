import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as config from './config.js';
import {
  CopilotInstallationInfo,
  INDEXJS_SEARCH_PATHS,
  CONFIG_DIR,
  CONFIG_FILE,
  DEFAULT_SETTINGS,
} from './types.js';
import fs from 'node:fs/promises';
import type { Stats } from 'node:fs';
import path from 'node:path';
import * as misc from './misc.js';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    chmod: vi.fn(),
    copyFile: vi.fn(),
  },
}));
// Mock the replaceFileBreakingHardLinks function
vi.spyOn(misc, 'replaceFileBreakingHardLinks').mockImplementation(
  async (filePath, content) => {
    // Simulate the function by calling the mocked fs.writeFile
    await fs.writeFile(filePath, content);
  }
);

const createEnoent = () => {
  const error: NodeJS.ErrnoException = new Error(
    'ENOENT: no such file or directory'
  );
  error.code = 'ENOENT';
  return error;
};

describe('config.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'clear').mockImplementation(() => {});
  });

  describe('ensureConfigDir', () => {
    it('should create the config directory', async () => {
      const mkdirSpy = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      await config.ensureConfigDir();
      expect(mkdirSpy).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
    });
  });

  describe('readConfigFile', () => {
    it('should return the default config if the file does not exist', async () => {
      vi.spyOn(fs, 'readFile').mockRejectedValue(createEnoent());
      const result = await config.readConfigFile();
      expect(result).toEqual({
        ccVersion: '',
        ccInstallationDir: null,
        lastModified: expect.any(String),
        changesApplied: true,
        settings: DEFAULT_SETTINGS,
      });
    });

    it('should return the parsed config if the file exists', async () => {
      const mockConfig = { ccVersion: '1.0.0' };
      vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(mockConfig));
      const result = await config.readConfigFile();
      expect(result).toEqual(expect.objectContaining(mockConfig));
    });
  });

  describe('updateConfigFile', () => {
    it('should update the config file', async () => {
      const writeFileSpy = vi
        .spyOn(fs, 'writeFile')
        .mockResolvedValue(undefined);
      vi.spyOn(fs, 'readFile').mockRejectedValue(createEnoent()); // Start with default config
      const newSettings = { ...DEFAULT_SETTINGS, themes: [] };
      await config.updateConfigFile(c => {
        c.settings = newSettings;
      });

      expect(writeFileSpy).toHaveBeenCalledTimes(1);
      const [filePath, fileContent] = writeFileSpy.mock.calls[0];
      expect(filePath).toBe(CONFIG_FILE);
      const writtenConfig = JSON.parse(fileContent as string);
      expect(writtenConfig.settings).toEqual(newSettings);
    });
  });

  describe('restoreClijsFromBackup', () => {
    it('should copy the backup file and update the config', async () => {
      // Mock reading the backup file
      const readFileSpy = vi
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(Buffer.from('backup content')) // Reading backup file
        .mockRejectedValue(createEnoent()); // Reading config file

      // Mock file operations for the helper function
      vi.spyOn(fs, 'stat').mockRejectedValue(createEnoent()); // File doesn't exist
      vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);
      const writeFileSpy = vi
        .spyOn(fs, 'writeFile')
        .mockResolvedValue(undefined);
      vi.spyOn(fs, 'chmod').mockResolvedValue(undefined);

      const ccInstInfo = {
        cliPath: '/fake/path/index.js',
      } as CopilotInstallationInfo;

      await config.restoreClijsFromBackup(ccInstInfo);

      // Verify the backup was read
      expect(readFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('index.js.backup')
      );

      // Verify writeFile was called (at least twice - once for index.js, once for config)
      expect(writeFileSpy).toHaveBeenCalled();

      // Find the call that wrote to index.js (not config.json)
      const cliWriteCall = writeFileSpy.mock.calls.find(
        call => call[0] === ccInstInfo.cliPath
      );

      expect(cliWriteCall).toBeDefined();
      expect(cliWriteCall![1]).toEqual(Buffer.from('backup content'));
    });
  });

  describe('findCopilotInstallation', () => {
    it('should include the brew path on non-windows systems', () => {
      if (process.platform !== 'win32') {
        expect(INDEXJS_SEARCH_PATHS).toContain(
          path.join(
            '/opt',
            'homebrew',
            'lib',
            'node_modules',
            '@github',
            'copilot'
          )
        );
      }
    });

    it('should find the installation and return the correct info', async () => {
      const mockConfig = {
        ccInstallationDir: null,
        changesApplied: false,
        ccVersion: '',
        lastModified: '',
        settings: DEFAULT_SETTINGS,
      };

      const mockCliPath = path.join(INDEXJS_SEARCH_PATHS[0], 'index.js');
      const mockPackageJsonPath = path.join(
        INDEXJS_SEARCH_PATHS[0],
        'package.json'
      );
      const mockPackageJson = JSON.stringify({ version: '1.2.3' });

      // Mock fs.stat to simulate that index.js exists
      vi.spyOn(fs, 'stat').mockImplementation(async p => {
        if (p === mockCliPath) {
          return {} as Stats; // File exists
        }
        throw createEnoent(); // File not found
      });

      vi.spyOn(fs, 'readFile').mockImplementation(async p => {
        if (p === mockPackageJsonPath) {
          return mockPackageJson;
        }
        throw new Error('File not found');
      });

      const result = await config.findCopilotInstallation(mockConfig);

      expect(result).toEqual({
        cliPath: mockCliPath,
        packageJsonPath: mockPackageJsonPath,
        version: '1.2.3',
      });
    });

    it('should return null if the installation is not found', async () => {
      const mockConfig = {
        ccInstallationDir: null,
        changesApplied: false,
        ccVersion: '',
        lastModified: '',
        settings: DEFAULT_SETTINGS,
      };

      // Mock fs.stat to simulate that no index.js files exist
      vi.spyOn(fs, 'stat').mockRejectedValue(createEnoent());
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

      const result = await config.findCopilotInstallation(mockConfig);

      expect(result).toBe(null);
    });
  });

  describe('startupCheck', () => {
    it('should backup index.js if no backup exists', async () => {
      const ccInstInfo: CopilotInstallationInfo = {
        cliPath: '/fake/path/index.js',
        version: '1.0.0',
        packageJsonPath: '/fake/path/package.json',
      };

      // Mock fs.stat to reject only for the backup file
      vi.spyOn(fs, 'stat').mockImplementation(async filePath => {
        if (filePath.toString().includes('index.js.backup')) {
          throw createEnoent(); // Backup doesn't exist
        }
        return {} as Stats; // Other files exist
      });

      const copyFileSpy = vi.spyOn(fs, 'copyFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'readFile').mockResolvedValue(
        JSON.stringify({ ccVersion: '1.0.0' })
      );
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(config, 'findCopilotInstallation').mockResolvedValue(ccInstInfo);

      await config.startupCheck();

      expect(copyFileSpy).toHaveBeenCalled();
    });

    it('should re-backup if the version has changed', async () => {
      const ccInstInfo: CopilotInstallationInfo = {
        cliPath: '/fake/path/index.js',
        version: '2.0.0',
        packageJsonPath: '/fake/path/package.json',
      };
      vi.spyOn(fs, 'stat').mockResolvedValue({} as Stats);
      const unlinkSpy = vi.spyOn(fs, 'unlink').mockResolvedValue(undefined);
      const copyFileSpy = vi.spyOn(fs, 'copyFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'readFile').mockResolvedValue(
        JSON.stringify({ ccVersion: '1.0.0' })
      );
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(config, 'findCopilotInstallation').mockResolvedValue(ccInstInfo);

      const result = await config.startupCheck();

      expect(unlinkSpy).toHaveBeenCalled();
      expect(copyFileSpy).toHaveBeenCalled();
      expect(result).not.toBe(null);
      expect(result!.wasUpdated).toBe(true);
    });
  });
});
