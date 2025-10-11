import { createContext, useContext, type ReactNode } from 'react';
import { Box, Text, type BoxProps, type TextProps } from 'ink';

type Theme = {
  components: Record<string, ComponentTheme>;
};

const colorByVariant: Record<string, string> = {
  info: 'blue',
  success: 'green',
  error: 'red',
  warning: 'yellow',
};

type ComponentTheme = {
  styles: {
    container: ({ variant }: { variant: string }) => BoxProps;
    iconContainer: () => BoxProps;
    icon: ({ variant }: { variant: string }) => TextProps;
    content: () => BoxProps;
    title: () => TextProps;
    message: () => TextProps;
  };
};

const theme = {
  styles: {
    container: ({ variant }: { variant: string }): BoxProps => ({
      flexGrow: 1,
      borderStyle: 'round',
      borderColor: colorByVariant[variant],
      gap: 1,
      paddingX: 1,
    }),
    iconContainer: (): BoxProps => ({
      flexShrink: 0,
    }),
    icon: ({ variant }): TextProps => ({
      color: colorByVariant[variant],
    }),
    content: (): BoxProps => ({
      flexShrink: 1,
      flexGrow: 1,
      minWidth: 0,
      flexDirection: 'column',
      gap: 1,
    }),
    title: (): TextProps => ({
      bold: true,
    }),
    message: (): TextProps => ({}),
  },
} satisfies ComponentTheme;

const ThemeContext = createContext<Theme>({ components: { Alert: theme } });

const useComponentTheme = <Theme extends ComponentTheme>(
  component: string
): Theme => {
  const theme = useContext(ThemeContext);
  return theme.components[component] as Theme;
};

type AlertProps = {
  /**
   * Message.
   */
  readonly children: ReactNode;

  /**
   * Variant, which determines the color of the alert.
   */
  readonly variant: 'info' | 'success' | 'error' | 'warning';

  /**
   * Title to show above the message.
   */
  readonly title?: string;
};

export function Alert({ children, variant, title }: AlertProps) {
  const { styles } = useComponentTheme<ComponentTheme>('Alert');

  return (
    <Box {...styles.container({ variant })}>
      <Box {...styles.content()}>
        {title && <Text {...styles.title()}>{title}</Text>}
        <Text {...styles.message()}>{children}</Text>
      </Box>
    </Box>
  );
}
