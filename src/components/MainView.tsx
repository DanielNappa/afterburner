import { Box, Text } from 'ink';
import Link from 'ink-link';
import { SelectInput, SelectItem } from './SelectInput.js';
import { useContext, useState } from 'react';
import { SettingsContext } from '../App.js';
import { CONFIG_FILE, MainMenuItem } from '../utils/types.js';
import { Banner } from './Banner.js';
import Header from './Header.js';

interface MainViewProps {
  onSubmit: (item: MainMenuItem) => void;
  notification: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null;
}

// prettier-ignore
// const baseMenuItems: SelectItem[] = [
//   {
//     name: MainMenuItem.THEMES,
//     desc: "Modify GitHub Copilot CLI's built-in themes or create your own",
//   },
//   {
//     name: MainMenuItem.LAUNCH_TEXT,
//     desc: 'Change the "GitHub Copilot CLI" banner text that\'s shown when you sign in to GitHub Copilot CLI',
//   },
//   {
//     name: MainMenuItem.THINKING_VERBS,
//     desc: "Customize the list of verbs that GitHub Copilot CLI uses when it's working",
//   },
//   {
//     name: MainMenuItem.THINKING_STYLE,
//     desc: 'Choose custom spinners',
//   },
//   {
//     name: MainMenuItem.USER_MESSAGE_DISPLAY,
//     desc: 'Customize how user messages are displayed',
//   },
//   {
//     name: MainMenuItem.INPUT_BOX,
//     desc: 'Customize the input box appearance (e.g., remove border)',
//   },
// ];

// prettier-ignore
const systemMenuItems: SelectItem[] = [
  {
    name: MainMenuItem.RESTORE_ORIGINAL,
    desc: 'Reverts your GitHub Copilot CLI install to its original state (your customizations are remembered and can be reapplied)',
  },
  {
    name: MainMenuItem.OPEN_CONFIG,
    desc: `Opens your tweakgc config file (${CONFIG_FILE})`,
  },
  {
    name: MainMenuItem.OPEN_CLI,
    desc: "Opens GitHub Copilot CLI's index.js file",
  },
  {
    name: MainMenuItem.EXIT,
    desc: 'Bye!',
  },
];

export function MainView({ onSubmit, notification }: MainViewProps) {
  const menuItems: SelectItem[] = [
    ...(useContext(SettingsContext).changesApplied
      ? []
      : [
          {
            name: MainMenuItem.APPLY_CHANGES,
            desc: "Required: Updates GitHub Copilot CLI's index.js in-place with your changes",
            selectedStyles: {
              color: '#FFA500',
            },
          },
        ]),
    // ...baseMenuItems,
    ...systemMenuItems,
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Header>Tweak GC</Header>
      </Box>
      <Banner animated showLoading />
      <Box marginBottom={1}>
        <Text color="gray">
          <Text bold>Customize your GitHub Copilot CLI installation.</Text>{' '}
          <Text dimColor>Settings will be saved to a JSON file.</Text>
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="yellow">
          ⭐ <Text bold>Star the repo at </Text>
          <Link
            url="https://github.com/DanielNappa/tweakgc-cli"
            fallback={false}
          >
            <Text bold color="cyan">
              https://github.com/DanielNappa/tweakgc-cli
            </Text>
          </Link>
          <Text bold> if you find this useful!</Text> ⭐
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="red">
          ⚠️{' '}
          <Text bold>
            This patcher has been tested and verified to work in version 0.0.335
            of the GitHub Copilot CLI,{' '}
          </Text>
          <Text bold>it may break eventually for newer versions!</Text> ⚠️
        </Text>
      </Box>

      {notification && (
        <Box
          marginBottom={1}
          borderLeft={true}
          borderRight={false}
          borderTop={false}
          borderBottom={false}
          borderStyle="bold"
          borderColor={
            notification?.type === 'success'
              ? 'green'
              : notification?.type === 'error'
                ? 'red'
                : notification?.type === 'info'
                  ? 'blue'
                  : 'yellow'
          }
          paddingLeft={1}
          flexDirection="column"
        >
          <Text
            color={
              notification?.type === 'success'
                ? 'green'
                : notification?.type === 'error'
                  ? 'red'
                  : notification?.type === 'info'
                    ? 'blue'
                    : 'yellow'
            }
          >
            {notification?.message}
          </Text>
        </Box>
      )}

      <SelectInput
        items={menuItems}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onSubmit={item => onSubmit(item as MainMenuItem)}
      />
    </Box>
  );
}
