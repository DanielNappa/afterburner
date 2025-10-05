import { type JSX, useEffect, useState } from 'react';
import { Box, Text } from 'ink';

declare const setTimeout: (callback: () => void, delay: number) => number;
declare const clearTimeout: (id: number) => void;

const BANNER_TEXT: string = `████████╗██╗    ██╗███████╗ █████╗ ██╗  ██╗     ██████╗  ██████╗
╚══██╔══╝██║    ██║██╔════╝██╔══██╗██║ ██╔╝    ██╔════╝ ██╔════╝
   ██║   ██║ █╗ ██║█████╗  ███████║█████╔╝     ██║  ███╗██║     
   ██║   ██║███╗██║██╔══╝  ██╔══██║██╔═██╗     ██║   ██║██║     
   ██║   ╚███╔███╔╝███████╗██║  ██║██║  ██╗    ╚██████╔╝╚██████╗
   ╚═╝    ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝  ╚═════╝`;

const colors = {
  block_text: 'yellow',
  block_shadow: 'blackBright',
  shine: 'whiteBright',
  text: 'whiteBright',
  stars: 'yellow',
};

interface Frame {
  content: string;
  colors: Record<string, string>;
  duration: number;
}

function generateShinePositions(
  text: string,
  shineWave: number
): Record<string, string> {
  const lines = text.split('\n');
  const colorMap: Record<string, string> = {};

  lines.forEach((line, rowIndex) => {
    Array.from(line).forEach((char, colIndex) => {
      const key = `${rowIndex},${colIndex}`;

      // Apply shine effects in waves across the banner
      if (char.match(/[█╗╔╚═╝║╦╠╬╣╩╚╝]/)) {
        // Block characters get different treatments based on shine wave
        const blockPos = colIndex + rowIndex * 2; // Create diagonal wave effect

        if (shineWave === 0) {
          // Initial text render - no special effects
          colorMap[key] = 'block_text';
        } else if (shineWave === 1) {
          // First shine wave - left side
          if (blockPos < 20) {
            colorMap[key] = 'shine';
          } else {
            colorMap[key] = 'block_text';
          }
        } else if (shineWave === 2) {
          // Second shine wave - middle
          if (blockPos >= 20 && blockPos < 40) {
            colorMap[key] = 'shine';
          } else {
            colorMap[key] = 'block_text';
          }
        } else if (shineWave === 3) {
          // Third shine wave - right side
          if (blockPos >= 40 && blockPos < 60) {
            colorMap[key] = 'shine';
          } else {
            colorMap[key] = 'block_text';
          }
        } else if (shineWave === 4) {
          // Final shine wave - version area
          if (blockPos >= 60) {
            colorMap[key] = 'shine';
          } else {
            colorMap[key] = 'block_text';
          }
        } else {
          colorMap[key] = 'block_text';
        }
      } else if (char.match(/[()vex.]/)) {
        // Version text and parentheses
        if (shineWave >= 3) {
          colorMap[key] = char.match(/[vex.]/) ? 'shine' : 'text';
        } else {
          colorMap[key] = 'text';
        }
      } else if (char.match(/[0-9]/)) {
        // Version numbers
        colorMap[key] = shineWave >= 4 ? 'shine' : 'text';
      } else if (char.trim()) {
        // Other visible characters
        colorMap[key] = 'text';
      }
    });
  });

  return colorMap;
}

function generateFrames(): Frame[] {
  const bannerLines = BANNER_TEXT.split('\n');
  const frames: Frame[] = [];

  // Progressive horizontal reveal (80ms each)
  const maxLineLength = Math.max(...bannerLines.map(line => line.length));

  for (let charPosition = 1; charPosition <= maxLineLength; charPosition += 8) {
    let content = '';
    const colorMap: Record<string, string> = {};

    bannerLines.forEach((line, rowIndex) => {
      const revealedLine = line.slice(0, charPosition);
      content += (rowIndex === 0 ? '' : '\n') + revealedLine;

      Array.from(revealedLine).forEach((char, colIndex) => {
        const key = `${rowIndex},${colIndex}`;
        if (char.match(/[█╗╔╚═╝║╦╠╬╣╩]/)) {
          colorMap[key] = 'block_text';
        } else if (char.match(/[╔╚═╝]/)) {
          colorMap[key] = 'block_shadow';
        } else if (char.trim()) {
          colorMap[key] = 'text';
        }
      });
    });

    frames.push({
      content,
      colors: colorMap,
      duration: charPosition <= 3 ? 60 + charPosition * 10 : 80,
    });
  }

  // Frames 11-14: Shine wave effects (80ms each)
  for (let shineWave = 1; shineWave <= 4; shineWave++) {
    const content = BANNER_TEXT;
    const colorMap: Record<string, string> = {};

    // Generate shine effects
    const bannerShineColors = generateShinePositions(BANNER_TEXT, shineWave);
    Object.entries(bannerShineColors).forEach(([coord, color]) => {
      colorMap[coord] = color;
    });

    frames.push({
      content,
      colors: colorMap,
      duration: 80,
    });
  }

  // Frame 15: Final hold (200ms)
  const finalContent = BANNER_TEXT;
  const finalColorMap: Record<string, string> = {};

  // Final banner colors without shine
  bannerLines.forEach((line, rowIndex) => {
    Array.from(line).forEach((char, colIndex) => {
      const key = `${rowIndex},${colIndex}`;
      if (char.match(/[█╗╔╚═╝║╦╠╬╣╩]/)) {
        finalColorMap[key] = 'block_text';
      } else if (char.match(/[╔╚═╝]/)) {
        finalColorMap[key] = 'block_shadow';
      } else if (char.trim()) {
        finalColorMap[key] = 'text';
      }
    });
  });

  frames.push({
    content: finalContent,
    colors: finalColorMap,
    duration: 200,
  });

  return frames;
}

interface BannerProps {
  animated?: boolean;
  showLoading?: boolean;
  onComplete?: () => void;
}

export function Banner({
  animated = true,
  showLoading = true,
  onComplete,
}: BannerProps = {}): JSX.Element | null {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const frames = generateFrames();

  useEffect(() => {
    if (currentFrame >= frames.length) {
      setIsComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentFrame(prev => prev + 1);
    }, frames[currentFrame]?.duration || 80);

    return () => clearTimeout(timer);
  }, [currentFrame, frames]);

  if (isComplete) {
    if (onComplete) {
      onComplete();
    }

    // Show the final frame
    const finalFrame = frames[frames.length - 1];
    if (!finalFrame) return null;

    const lines = finalFrame.content.split('\n');
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {lines.map((line, rowIndex) => {
          const characters = Array.from(line).map((char, colIndex) => {
            const colorKey = `${rowIndex},${colIndex}`;
            const colorRole = finalFrame.colors[colorKey];
            const color = colorRole
              ? colors[colorRole as keyof typeof colors] || 'blue'
              : 'blue';
            return { char, color };
          });

          const segments: Array<{ text: string; color: string }> = [];
          let currentSegment = {
            text: '',
            color: characters[0]?.color || 'blue',
          };

          characters.forEach(({ char, color }) => {
            if (color === currentSegment.color) {
              currentSegment.text += char;
            } else {
              if (currentSegment.text) segments.push(currentSegment);
              currentSegment = { text: char, color };
            }
          });

          if (currentSegment.text) segments.push(currentSegment);

          return (
            <Text key={rowIndex}>
              {segments.map((segment, segmentIndex) => (
                <Text key={segmentIndex} color={segment.color}>
                  {segment.text}
                </Text>
              ))}
            </Text>
          );
        })}
      </Box>
    );
  }

  // If not animated, show static banner
  if (!animated) {
    const staticFrame = frames[frames.length - 1];
    if (!staticFrame) return null;

    const lines = staticFrame.content.split('\n');
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {lines.map((line, rowIndex) => {
          const characters = Array.from(line).map((char, colIndex) => {
            const colorKey = `${rowIndex},${colIndex}`;
            const colorRole = staticFrame.colors[colorKey];
            const color = colorRole
              ? colors[colorRole as keyof typeof colors] || 'blue'
              : 'blue';
            return { char, color };
          });

          const segments: Array<{ text: string; color: string }> = [];
          let currentSegment = {
            text: '',
            color: characters[0]?.color || 'blue',
          };

          characters.forEach(({ char, color }) => {
            if (color === currentSegment.color) {
              currentSegment.text += char;
            } else {
              if (currentSegment.text) segments.push(currentSegment);
              currentSegment = { text: char, color };
            }
          });

          if (currentSegment.text) segments.push(currentSegment);

          return (
            <Text key={rowIndex}>
              {segments.map((segment, segmentIndex) => (
                <Text key={segmentIndex} color={segment.color}>
                  {segment.text}
                </Text>
              ))}
            </Text>
          );
        })}
      </Box>
    );
  }

  // Skip loading frames if showLoading is false
  const startFrame = showLoading ? 0 : 3;

  const frame: Frame | undefined =
    frames[Math.min(Math.max(currentFrame, startFrame), frames.length - 1)];
  if (!frame) return null;

  const lines: string[] = frame.content.split('\n');

  return (
    <Box flexDirection="column" alignItems="flex-start">
      {lines.map((line, rowIndex) => {
        const characters = Array.from(line).map((char, colIndex) => {
          const colorKey = `${rowIndex},${colIndex}`;
          const colorRole = frame.colors[colorKey];
          const color = colorRole
            ? colors[colorRole as keyof typeof colors] || 'blue'
            : 'blue';
          return { char, color };
        });

        const segments: Array<{ text: string; color: string }> = [];
        let currentSegment = {
          text: '',
          color: characters[0]?.color || 'blue',
        };

        characters.forEach(({ char, color }) => {
          if (color === currentSegment.color) {
            currentSegment.text += char;
          } else {
            if (currentSegment.text) segments.push(currentSegment);
            currentSegment = { text: char, color };
          }
        });

        if (currentSegment.text) segments.push(currentSegment);

        return (
          <Text key={rowIndex}>
            {segments.map((segment, segmentIndex) => (
              <Text key={segmentIndex} color={segment.color}>
                {segment.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </Box>
  );
}
