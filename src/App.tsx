import { useState, KeyboardEvent } from 'react';

interface Commands {
  [key: string]: () => string;
}

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [resultText, setResultText] = useState('Ready.');

  const commands: Commands = {
    hello: () => 'Hello. This is a working black box command.',
    help: () => 'Try: hello, clear, status, or type any custom text.',
    clear: () => '',
    status: () => 'Status: the launcher is running normally.'
  };

  const runCommand = (raw: string): string => {
    const text = raw.trim().toLowerCase();
    if (!text) return 'Type a command to begin.';
    if (commands[text]) return commands[text]();
    return `You entered: ${raw.trim()}`;
  };

  const execute = (valueToRun: string = inputValue) => {
    const output = runCommand(valueToRun);
    setResultText(output === '' ? 'Cleared.' : output);
    if (valueToRun.trim().toLowerCase() === 'clear') {
      setInputValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      execute();
    }
  };

  const handleChipClick = (cmd: string) => {
    setInputValue(cmd);
    execute(cmd);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <main id="app_launcher_card" className="app w-full max-w-[520px] rounded-[24px] p-6 border border-[var(--panel-edge)] bg-gradient-to-b from-[#f8f4ee] to-[var(--panel)] shadow-[0_18px_36px_rgba(0,0,0,0.16),_inset_0_1px_0_rgba(255,255,255,0.65)]">
        <h1 id="app_title" className="m-0 mb-[14px] text-[1.35rem] font-bold text-[var(--text)] tracking-tight">
          Mini Command Launcher
        </h1>

        <div className="row grid grid-cols-[1fr_auto] gap-3">
          <input
            id="commandInput"
            type="text"
            placeholder="Type a command like hello, clear, or help"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full font-inherit text-[1.05rem] px-4 py-3.5 rounded-[14px] border border-[var(--field-edge)] bg-gradient-to-b from-[#fffdfa] to-[var(--field)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)] outline-none text-[var(--text)] focus:border-[var(--text)] transition-colors"
          />
          <button
            id="runBtn"
            onClick={() => execute()}
            className="retro-btn h-full px-[18px] min-w-[110px] text-base font-semibold text-[var(--text)] cursor-pointer flex items-center justify-center"
          >
            Run
          </button>
        </div>

        <div className="chips flex flex-wrap gap-2 mt-4">
          <button
            id="chip_hello"
            className="retro-chip px-3.5 py-2 text-sm text-[var(--text)] font-semibold cursor-pointer"
            onClick={() => handleChipClick('hello')}
          >
            hello
          </button>
          <button
            id="chip_help"
            className="retro-chip px-3.5 py-2 text-sm text-[var(--text)] font-semibold cursor-pointer"
            onClick={() => handleChipClick('help')}
          >
            help
          </button>
          <button
            id="chip_clear"
            className="retro-chip px-3.5 py-2 text-sm text-[var(--text)] font-semibold cursor-pointer"
            onClick={() => handleChipClick('clear')}
          >
            clear
          </button>
          <button
            id="chip_status"
            className="retro-chip px-3.5 py-2 text-sm text-[var(--text)] font-semibold cursor-pointer"
            onClick={() => handleChipClick('status')}
          >
            status
          </button>
        </div>

        <div
          id="result"
          className="result mt-4 min-h-[70px] p-[14px_16px] rounded-[14px] bg-gradient-to-b from-[#fffdf8] to-[#f0eadf] border border-[var(--field-edge)] text-[var(--text)] font-mono text-sm leading-relaxed whitespace-pre-wrap transition-all"
        >
          {resultText}
        </div>

        <div id="hint_text" className="hint mt-3.5 text-xs text-[var(--text)] opacity-80 italic font-medium">
          This starts as separate files from the beginning.
        </div>
      </main>
    </div>
  );
}
