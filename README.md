# 🎨 afterburner

[![afterburner on npm](https://img.shields.io/npm/v/afterburner?color=yellow")](https://www.npmjs.com/package/afterburner)
[![Mentioned in Awesome Github Copilot CLI](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)
[![ClaudeLog - A comprehensive knowledge base for Claude.](https://claudelog.com/img/claude_log_badge.svg)](https://claudelog.com/)

`afterburner` is a lightweight, interactive CLI tool that lets you personalize your Github Copilot CLI interface.

> [!note]
> ⭐ **If you find afterburner useful, please consider [starring the repository](https://github.com/Piebald-AI/afterburner) to show your support!** ⭐

<img src="./assets/demo.gif" alt="Animated GIF demonstrating running `npx afterburner`, creating a new theme, changing all of Github Copilot CLI's UI colors to purple, changing the thinking format from '<verb>ing...' to 'Claude is <verb>ing', changing the generating spinner style to a 50m glow animation, applying the changes, running Claude, and using '/config' to switch to the new theme, and sending a message to see the new thinking verb format." width="800">

With afterburner, you can

- Create **custom themes** with a graphical HSL/RGB color picker
- Add custom **thinking verbs** that will show while Claude's working
- Create custom **thinking spinner animations** with different speeds and phases
- Change the "Github Copilot CLI" banner text to your own text with your own [figlet](http://www.figlet.org/) fonts
- Supports Github Copilot CLI installed on **Windows, macOS, and Linux**, using npm, yarn, pnpm, bun, Homebrew, nvm, fnm, n, volta, nvs, and nodenv, or a custom location
- Style the **user messages in the chat history** beyond the default plain gray text
- Remove the **ASCII border** from the input box

afterburner also
- Restores the **token counter** and **elapsed time metric** that were shown during generation before Github Copilot CLI 1.0.83
- Fixes a bug where the **spinner animation** is frozen if you have the `GITHUB_COPILOT_DISABLE_NONESSENTIAL_TRAFFIC` environment variable set ([#46](https://github.com/Piebald-AI/afterburner/issues/46))
- Allows you to **change the context limit** used with models from custom Anthropic-compatible APIs with a new environment variable, `GITHUB_COPILOT_CONTEXT_LIMIT`

Additionally, we're working on features that will allow you to
- Pick from over **70+ spinning/thinking animations** from [`cli-spinners`](https://github.com/sindresorhus/cli-spinners)
- Apply **custom styling** to the markdown elements in Claude's responses like code, bold, headers, etc
- Customize the **shimmering effect** on the thinking verb: disable it; change its speed, width, and colors

Run without installation:

```bash
$ npx afterburner

# Or use pnpm:
$ pnpm dlx afterburner
```

## How it works

`afterburner` works by patching the Github Copilot CLI's minified `index.js` file.  When you update your Github Copilot CLI installation, your customizations will be overwritten, but they're remembered in your `~/.afterburner/config.js` configuration file, so they can be reapplied by just rerunning the tool.

`afterburner` is verified to work with Github Copilot CLI **1.0.128.**

## Running

Run with installing it with `npx afterburner`.  Or build and run it locally:

```bash
git clone https://github.com/Piebald-AI/afterburner.git
cd afterburner
pnpm i
pnpm build
node dist/index.js
```

## Related projects

- [**ccstatusline**](https://github.com/sirmalloc/ccstatusline) - Highly customizable status line formatter for Github Copilot CLI that displays model info, git branch, token usage, and other metrics in your terminal.
- [**claude-powerline**](https://github.com/Owloops/claude-powerline) - Vim-style powerline statusline for Github Copilot CLI with real-time usage tracking, git integration, and custom themes.
- [**CCometixLine**](https://github.com/Haleclipse/CCometixLine) - A high-performance Github Copilot CLI statusline tool written in Rust with Git integration, usage tracking, interactive TUI configuration, and Github Copilot CLI enhancement utilities.
- [**cc-statuslines**](https://github.com/chongdashu/cc-statusline) - Transform your Github Copilot CLI experience with a beautiful, informative statusline.  One command.  Three questions.  Custom statusline.

## FAQ

#### How can I customize my Github Copilot CLI theme?

Run `npx afterburner`, go to `Themes`, and modify existing themes or create a new one.  Then go back to the main menu and choose `Apply customizations to index.js`.

#### Why isn't all the text in Github Copilot CLI is getting its color changed?

Some of the text Github Copilot CLI outputs has no coloring information at all, and unfortunately, that text is rendered using your terminal's default text foreground color and can't be customized.

#### Is there a way to disable colored output in Github Copilot CLI altogether?

Yes!  You can use the [`FORCE_COLOR`](https://force-color.org/) environment variable, a convention which many CLI tools including Github Copilot CLI respect.  Set it to `0` to disable colors entirely in Github Copilot CLI.

#### Why isn't my new theme being applied?

Could you have have forgotten to actually set Github Copilot CLI's theme to your new theme?  Run `claude` and then use `/theme` to switch to your new theme if so.

#### `afterburner` vs. `tweakcn`...?

[`tweakcn`](https://github.com/jnsahaj/tweakcn), though similarly named, is unrelated to `afterburner` or Github Copilot CLI.  It's a tool for editing your [shadcn/ui](https://github.com/shadcn-ui/ui) themes.  Check it out!

## License

[MIT](https://github.com/Piebald-AI/afterburner/blob/main/LICENSE)

Copyright © 2025 [Piebald LLC](https://piebald.ai).
