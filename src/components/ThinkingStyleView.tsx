import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { ThinkingStyleConfig } from "../types.js";
import { getCurrentClaudeTheme } from "../utils/claudeTheme.js";
import { themes } from "../themes.js";

interface ThinkingStyleViewProps {
  onBack: () => void;
  onSave: (config: ThinkingStyleConfig) => void;
  initialConfig?: ThinkingStyleConfig;
}

const DEFAULT_PHASES = ["·", "✢", "✳", "✶", "✻", "✽"];

const PRESETS = [
  {
    name: "Default",
    phases: ["·", "✢", "✳", "✶", "✻", "✽"],
    reverseMirror: true,
  },
  { name: "Basic", phases: ["|", "/", "-", "\\"], reverseMirror: false },
  {
    name: "Braille",
    phases: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    reverseMirror: false,
  },
  { name: "Circle", phases: ["◐", "◓", "◑", "◒"], reverseMirror: false },
  {
    name: "Wave",
    phases: ["▁", "▃", "▄", "▅", "▆", "▇", "█"],
    reverseMirror: true,
  },
  { name: "Glow", phases: ["░", "▒", "▓", "█"], reverseMirror: true },
  {
    name: "Partial block",
    phases: ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"],
    reverseMirror: true,
  },
  {
    name: "Clock",
    phases: ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕"],
    reverseMirror: false,
  },
  { name: "Globe", phases: ["🌍", "🌎", "🌏"], reverseMirror: false },
  { name: "Arc", phases: ["◜", "◠", "◝", "◞", "◡", "◟"], reverseMirror: false },
  { name: "Triangle", phases: ["◤", "◥", "◢", "◣"], reverseMirror: false },
  {
    name: "Bouncing",
    phases: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
    reverseMirror: false,
  },
  { name: "Dots", phases: [".", "..", "..."], reverseMirror: false },
  {
    name: "Colors",
    phases: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"],
    reverseMirror: false,
  },
];

export function ThinkingStyleView({
  onBack,
  onSave,
  initialConfig,
}: ThinkingStyleViewProps) {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 120;

  const [config, setConfig] = useState<ThinkingStyleConfig>(
    initialConfig || {
      reverseMirror: true,
      updateInterval: 120,
      phases: [...DEFAULT_PHASES],
    }
  );

  const options = [
    "reverseMirror",
    "updateInterval",
    "phases",
    "presets",
  ] as const;
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const selectedOption = options[selectedOptionIndex];
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [editingPhase, setEditingPhase] = useState(false);
  const [phaseInput, setPhaseInput] = useState("");
  const [addingNewPhase, setAddingNewPhase] = useState(false);
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState(
    config.updateInterval.toString()
  );
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  // Get current Claude theme and color
  const currentThemeId = getCurrentClaudeTheme();
  const currentTheme =
    themes.find((t) => t.id === currentThemeId) ||
    themes.find((t) => t.id === "dark");
  const claudeColor = currentTheme?.colors.claude || "rgb(215,119,87)";

  // Animate spinner based on config
  useEffect(() => {
    if (config.phases.length > 0) {
      const phases = config.reverseMirror
        ? [...config.phases, ...[...config.phases].reverse().slice(1, -1)]
        : config.phases;

      const interval = setInterval(() => {
        setCurrentPhaseIndex((prev) => (prev + 1) % phases.length);
      }, config.updateInterval);

      return () => clearInterval(interval);
    }
  }, [config.phases, config.updateInterval, config.reverseMirror]);

  useInput((input, key) => {
    if (editingInterval) {
      if (key.return) {
        const newInterval = parseInt(intervalInput);
        if (!isNaN(newInterval) && newInterval > 0) {
          const newConfig = { ...config, updateInterval: newInterval };
          setConfig(newConfig);
          onSave(newConfig);
        }
        setEditingInterval(false);
      } else if (key.escape) {
        setIntervalInput(config.updateInterval.toString());
        setEditingInterval(false);
      } else if (key.backspace || key.delete) {
        setIntervalInput((prev) => prev.slice(0, -1));
      } else if (input && input.match(/^[0-9]$/)) {
        setIntervalInput((prev) => prev + input);
      }
      return;
    }

    if (editingPhase || addingNewPhase) {
      if (key.return) {
        if (phaseInput.trim()) {
          if (addingNewPhase) {
            const newConfig = {
              ...config,
              phases: [...config.phases, phaseInput.trim()],
            };
            setConfig(newConfig);
            onSave(newConfig);
            setAddingNewPhase(false);
          } else {
            const newConfig = {
              ...config,
              phases: config.phases.map((phase, index) =>
                index === selectedPhaseIndex ? phaseInput.trim() : phase
              ),
            };
            setConfig(newConfig);
            onSave(newConfig);
            setEditingPhase(false);
          }
        }
        setPhaseInput("");
      } else if (key.escape) {
        setPhaseInput("");
        setEditingPhase(false);
        setAddingNewPhase(false);
      } else if (key.backspace || key.delete) {
        setPhaseInput((prev) => prev.slice(0, -1));
      } else if (input) {
        setPhaseInput((prev) => prev + input);
      }
      return;
    }

    if (key.escape) {
      onBack();
    } else if (key.return) {
      if (selectedOption === "updateInterval") {
        setIntervalInput(config.updateInterval.toString());
        setEditingInterval(true);
      } else if (selectedOption === "presets") {
        // Apply selected preset
        const preset = PRESETS[selectedPresetIndex];
        const newConfig = {
          ...config,
          phases: [...preset.phases],
          reverseMirror: preset.reverseMirror,
        };
        setConfig(newConfig);
        onSave(newConfig);
      } else {
        onSave(config);
      }
    } else if (key.tab) {
      if (key.shift) {
        setSelectedOptionIndex((prev) =>
          prev === 0 ? options.length - 1 : prev - 1
        );
      } else {
        setSelectedOptionIndex((prev) =>
          prev === options.length - 1 ? 0 : prev + 1
        );
      }
    } else if (key.upArrow) {
      if (selectedOption === "phases" && config.phases.length > 0) {
        setSelectedPhaseIndex((prev) =>
          prev > 0 ? prev - 1 : config.phases.length - 1
        );
      } else if (selectedOption === "presets") {
        setSelectedPresetIndex((prev) =>
          prev > 0 ? prev - 1 : PRESETS.length - 1
        );
      }
    } else if (key.downArrow) {
      if (selectedOption === "phases" && config.phases.length > 0) {
        setSelectedPhaseIndex((prev) =>
          prev < config.phases.length - 1 ? prev + 1 : 0
        );
      } else if (selectedOption === "presets") {
        setSelectedPresetIndex((prev) =>
          prev < PRESETS.length - 1 ? prev + 1 : 0
        );
      }
    } else if (input === " ") {
      if (selectedOption === "reverseMirror") {
        const newConfig = { ...config, reverseMirror: !config.reverseMirror };
        setConfig(newConfig);
        onSave(newConfig);
      }
    } else if (input === "e" && selectedOption === "phases") {
      if (config.phases.length > 0) {
        setPhaseInput(config.phases[selectedPhaseIndex]);
        setEditingPhase(true);
      }
    } else if (input === "a" && selectedOption === "phases") {
      // Add new phase
      setAddingNewPhase(true);
      setPhaseInput("");
    } else if (input === "d" && selectedOption === "phases") {
      if (config.phases.length > 1) {
        const newConfig = {
          ...config,
          phases: config.phases.filter(
            (_, index) => index !== selectedPhaseIndex
          ),
        };
        setConfig(newConfig);
        onSave(newConfig);
        if (selectedPhaseIndex >= newConfig.phases.length) {
          setSelectedPhaseIndex(Math.max(0, newConfig.phases.length - 1));
        }
      }
    } else if (input === "w" && selectedOption === "phases") {
      // Move phase up
      if (selectedPhaseIndex > 0) {
        const newPhases = [...config.phases];
        [newPhases[selectedPhaseIndex - 1], newPhases[selectedPhaseIndex]] = [
          newPhases[selectedPhaseIndex],
          newPhases[selectedPhaseIndex - 1],
        ];
        const newConfig = { ...config, phases: newPhases };
        setConfig(newConfig);
        onSave(newConfig);
        setSelectedPhaseIndex((prev) => prev - 1);
      }
    } else if (input === "s" && selectedOption === "phases") {
      // Move phase down
      if (selectedPhaseIndex < config.phases.length - 1) {
        const newPhases = [...config.phases];
        [newPhases[selectedPhaseIndex], newPhases[selectedPhaseIndex + 1]] = [
          newPhases[selectedPhaseIndex + 1],
          newPhases[selectedPhaseIndex],
        ];
        const newConfig = { ...config, phases: newPhases };
        setConfig(newConfig);
        onSave(newConfig);
        setSelectedPhaseIndex((prev) => prev + 1);
      }
    } else if (key.ctrl && input === "r") {
      // Reset all settings to default
      const newConfig = {
        reverseMirror: true,
        updateInterval: 120,
        phases: [...DEFAULT_PHASES],
      };
      setConfig(newConfig);
      onSave(newConfig);
      setSelectedPhaseIndex(0);
      setSelectedPresetIndex(0);
    }
  });

  const checkboxChar = config.reverseMirror ? "x" : " ";
  const previewWidth = 50;

  const getAnimatedPhases = () => {
    return config.reverseMirror
      ? [...config.phases, ...[...config.phases].reverse().slice(1, -1)]
      : config.phases;
  };

  const animatedPhases = getAnimatedPhases();
  const currentPhase =
    animatedPhases.length > 0 ? animatedPhases[currentPhaseIndex] : "·";

  return (
    <Box>
      <Box flexDirection="column" width={`${100 - previewWidth}%`}>
        <Box marginBottom={1} flexDirection="column">
          <Text bold backgroundColor="#ffd500" color="black">
            {" "}
            Thinking style{" "}
          </Text>
          <Box>
            <Text dimColor>
              enter to{" "}
              {selectedOption === "updateInterval"
                ? "edit interval"
                : selectedOption === "presets"
                ? "apply preset"
                : "save"}
            </Text>
          </Box>
          <Box>
            <Text dimColor>esc to go back</Text>
          </Box>
        </Box>

        <Box>
          <Text>
            <Text
              color={selectedOption === "reverseMirror" ? "yellow" : undefined}
            >
              {selectedOption === "reverseMirror" ? "❯ " : "  "}
            </Text>
            <Text
              bold
              color={selectedOption === "reverseMirror" ? "yellow" : undefined}
            >
              Reverse-mirror phases
            </Text>
          </Text>
        </Box>

        {selectedOption === "reverseMirror" && (
          <Text dimColor>{"  "}space to toggle</Text>
        )}

        <Box marginLeft={2} marginBottom={1}>
          <Text>
            [{checkboxChar}] {config.reverseMirror ? "Enabled" : "Disabled"}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text>
            <Text
              color={selectedOption === "updateInterval" ? "yellow" : undefined}
            >
              {selectedOption === "updateInterval" ? "❯ " : "  "}
            </Text>
            <Text
              bold
              color={selectedOption === "updateInterval" ? "yellow" : undefined}
            >
              Update interval (ms)
            </Text>
          </Text>
          {selectedOption === "updateInterval" &&
            (editingInterval ? (
              <Text dimColor>{"  "}enter to save</Text>
            ) : (
              <Text dimColor>{"  "}enter to edit</Text>
            ))}
        </Box>

        <Box marginLeft={2} marginBottom={1}>
          <Box
            borderStyle="round"
            borderColor={editingInterval ? "yellow" : "gray"}
          >
            <Text>
              {editingInterval ? intervalInput : config.updateInterval}
            </Text>
          </Box>
        </Box>

        <Box>
          <Text>
            <Text color={selectedOption === "phases" ? "yellow" : undefined}>
              {selectedOption === "phases" ? "❯ " : "  "}
            </Text>
            <Text
              bold
              color={selectedOption === "phases" ? "yellow" : undefined}
            >
              Phases
            </Text>
          </Text>
        </Box>

        {selectedOption === "phases" && (
          <Box marginBottom={1} flexDirection="column">
            <Text dimColor>
              {"  "}e to edit · a to add · d to delete · w to move up · s to
              move down
            </Text>
          </Box>
        )}

        <Box marginLeft={2} marginBottom={1}>
          <Box flexDirection="column">
            {(() => {
              const maxVisible = 8; // Show 8 phases at a time
              const startIndex = Math.max(
                0,
                selectedPhaseIndex - Math.floor(maxVisible / 2)
              );
              const endIndex = Math.min(
                config.phases.length,
                startIndex + maxVisible
              );
              const adjustedStartIndex = Math.max(0, endIndex - maxVisible);

              const visiblePhases = config.phases.slice(
                adjustedStartIndex,
                endIndex
              );

              return (
                <>
                  {adjustedStartIndex > 0 && (
                    <Text color="gray" dimColor>
                      {" "}
                      ↑ {adjustedStartIndex} more above
                    </Text>
                  )}
                  {visiblePhases.map((phase, visibleIndex) => {
                    const actualIndex = adjustedStartIndex + visibleIndex;
                    return (
                      <Text
                        key={actualIndex}
                        color={
                          selectedOption === "phases" &&
                          actualIndex === selectedPhaseIndex
                            ? "cyan"
                            : undefined
                        }
                      >
                        {selectedOption === "phases" &&
                        actualIndex === selectedPhaseIndex
                          ? "❯ "
                          : "  "}
                        {phase}
                      </Text>
                    );
                  })}
                  {endIndex < config.phases.length && (
                    <Text color="gray" dimColor>
                      {" "}
                      ↓ {config.phases.length - endIndex} more below
                    </Text>
                  )}
                </>
              );
            })()}
            {addingNewPhase && (
              <Box>
                <Text color="yellow">❯ </Text>
                <Box borderStyle="round" borderColor="yellow">
                  <Text>{phaseInput}</Text>
                </Box>
              </Box>
            )}
            {editingPhase && (
              <Box marginTop={1}>
                <Text>Editing: </Text>
                <Box borderStyle="round" borderColor="yellow">
                  <Text>{phaseInput}</Text>
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <Box>
          <Text>
            <Text color={selectedOption === "presets" ? "yellow" : undefined}>
              {selectedOption === "presets" ? "❯ " : "  "}
            </Text>
            <Text
              bold
              color={selectedOption === "presets" ? "yellow" : undefined}
            >
              Presets
            </Text>
          </Text>
        </Box>

        {selectedOption === "presets" && (
          <Text dimColor>
            {"  "}Selecting one will overwrite your choice of phases
          </Text>
        )}

        <Box marginLeft={2} marginBottom={1}>
          <Box flexDirection="column">
            {(() => {
              const maxVisible = 8; // Show 8 presets at a time
              const startIndex = Math.max(
                0,
                selectedPresetIndex - Math.floor(maxVisible / 2)
              );
              const endIndex = Math.min(
                PRESETS.length,
                startIndex + maxVisible
              );
              const adjustedStartIndex = Math.max(0, endIndex - maxVisible);

              const visiblePresets = PRESETS.slice(
                adjustedStartIndex,
                endIndex
              );

              return (
                <>
                  {adjustedStartIndex > 0 && (
                    <Text color="gray" dimColor>
                      {" "}
                      ↑ {adjustedStartIndex} more above
                    </Text>
                  )}
                  {visiblePresets.map((preset, visibleIndex) => {
                    const actualIndex = adjustedStartIndex + visibleIndex;
                    return (
                      <Text
                        key={actualIndex}
                        color={
                          selectedOption === "presets" &&
                          actualIndex === selectedPresetIndex
                            ? "cyan"
                            : undefined
                        }
                      >
                        {selectedOption === "presets" &&
                        actualIndex === selectedPresetIndex
                          ? "❯ "
                          : "  "}
                        {preset.name} {preset.phases.join("")}
                      </Text>
                    );
                  })}
                  {endIndex < PRESETS.length && (
                    <Text color="gray" dimColor>
                      {" "}
                      ↓ {PRESETS.length - endIndex} more below
                    </Text>
                  )}
                </>
              );
            })()}
          </Box>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>ctrl+r to reset all settings to default</Text>
        </Box>
      </Box>

      <Box width={`${previewWidth}%`} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Preview</Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor="gray"
          padding={1}
          flexDirection="column"
        >
          <Text>
            <Text color={claudeColor}>{currentPhase} Thinking… </Text>
            <Text color={currentTheme?.colors.secondaryText}>
              (10s · ↑ 456 tokens · esc to interrupt)
            </Text>
          </Text>

          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Phases: {config.phases.join("")}</Text>
            <Text dimColor>
              Reverse-mirror: {config.reverseMirror ? "Yes" : "No"}
            </Text>
            <Text dimColor>Update interval: {config.updateInterval}ms</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
