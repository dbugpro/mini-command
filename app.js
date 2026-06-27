const input = document.getElementById('commandInput');
const runBtn = document.getElementById('runBtn');
const result = document.getElementById('result');

const commands = {
  hello: () => 'Hello. This is a working black box command.',
  help: () => 'Try: hello, clear, status, or type any custom text.',
  clear: () => '',
  status: () => 'Status: the launcher is running normally.'
};

function runCommand(raw) {
  const text = raw.trim().toLowerCase();
  if (!text) return 'Type a command to begin.';
  if (commands[text]) return commands[text]();
  return `You entered: ${raw.trim()}`;
}

function execute() {
  const output = runCommand(input.value);
  result.textContent = output === '' ? 'Cleared.' : output;
  if (input.value.trim().toLowerCase() === 'clear') input.value = '';
}

runBtn.addEventListener('click', execute);

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') execute();
});

document.querySelectorAll('[data-command]').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.command;
    execute();
  });
});