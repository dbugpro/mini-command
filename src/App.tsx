import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { 
  Terminal, Search, Calculator, ShieldCheck, Copy, Plus, Trash2, 
  Clock, Sparkles, Link, Globe, Cpu, Eye, Check, Sun, Moon, 
  Play, Pause, Calendar, ChevronRight, Info, X, ExternalLink, 
  RefreshCw, Hash, Sliders, Type, BarChart2, CloudRain, Wind, Compass
} from 'lucide-react';

// Interfaces for structured state
interface CustomShortcut {
  id: string;
  trigger: string;
  name: string;
  url: string; // e.g. "https://google.com/search?q={query}"
  category: string;
}

interface CommandHistory {
  id: string;
  timestamp: string;
  command: string;
  outputSummary: string;
  status: 'success' | 'error' | 'info';
}

interface Lap {
  id: number;
  time: number;
  overall: number;
}

export default function App() {
  // --- STATE ---
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'utilities' | 'shortcuts' | 'settings'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTool, setActiveTool] = useState<string | null>(null); // e.g., 'calc', 'password', etc.
  const [showNotification, setShowNotification] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ show: false, msg: '', type: 'success' });
  const [isFocused, setIsFocused] = useState(false);

  // Persistence loaded on mount
  const [customShortcuts, setCustomShortcuts] = useState<CustomShortcut[]>([]);
  const [history, setHistory] = useState<CommandHistory[]>([]);

  // Individual interactive widget states
  // 1. Password state
  const [pwLength, setPwLength] = useState(16);
  const [pwOptions, setPwOptions] = useState({ upper: true, numbers: true, symbols: true });
  const [generatedPw, setGeneratedPw] = useState('');

  // 2. Calculator state
  const [calcInput, setCalcInput] = useState('');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);

  // 3. Text analysis state
  const [textInput, setTextInput] = useState('');

  // 4. Color converter state
  const [colorHex, setColorHex] = useState('#6366f1');
  const [colorRgb, setColorRgb] = useState('rgb(99, 102, 241)');
  const [colorHsl, setColorHsl] = useState('hsl(239, 84%, 67%)');

  // 5. Weather state
  const [weatherCity, setWeatherCity] = useState('New York');

  // 6. Timer/Stopwatch states
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchActive, setStopwatchActive] = useState(false);
  const [stopwatchLaps, setStopwatchLaps] = useState<Lap[]>([]);
  const [timerDuration, setTimerDuration] = useState(60); // seconds
  const [timerRemaining, setTimerRemaining] = useState(60);
  const [timerActive, setTimerActive] = useState(false);

  // 7. Custom shortcut form state
  const [newShortcutName, setNewShortcutName] = useState('');
  const [newShortcutTrigger, setNewShortcutTrigger] = useState('');
  const [newShortcutUrl, setNewShortcutUrl] = useState('');
  const [newShortcutCategory, setNewShortcutCategory] = useState('Dev');

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger temporary notification helper
  const triggerNotification = (msg: string, type: 'success' | 'info' = 'success') => {
    setShowNotification({ show: true, msg, type });
    setTimeout(() => {
      setShowNotification((prev) => ({ ...prev, show: false }));
    }, 2500);
  };

  // --- PERSISTENCE LOAD & INITIALIZE ---
  useEffect(() => {
    const savedShortcuts = localStorage.getItem('ml_shortcuts');
    if (savedShortcuts) {
      setCustomShortcuts(JSON.parse(savedShortcuts));
    } else {
      // Default shortcuts if empty
      const defaultShortcuts: CustomShortcut[] = [
        { id: '1', trigger: 'g', name: 'Google Search', url: 'https://google.com/search?q={query}', category: 'Web' },
        { id: '2', trigger: 'gh', name: 'GitHub Repo Search', url: 'https://github.com/search?q={query}', category: 'Code' },
        { id: '3', trigger: 'so', name: 'StackOverflow', url: 'https://stackoverflow.com/search?q={query}', category: 'Help' },
        { id: '4', trigger: 'yt', name: 'YouTube Video search', url: 'https://youtube.com/results?search_query={query}', category: 'Media' }
      ];
      setCustomShortcuts(defaultShortcuts);
      localStorage.setItem('ml_shortcuts', JSON.stringify(defaultShortcuts));
    }

    const savedHistory = localStorage.getItem('ml_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    } else {
      const defaultHistory: CommandHistory[] = [
        { id: 'h1', timestamp: new Date().toLocaleTimeString(), command: 'system startup', outputSummary: 'Mini Command Launcher loaded successfully', status: 'success' }
      ];
      setHistory(defaultHistory);
      localStorage.setItem('ml_history', JSON.stringify(defaultHistory));
    }

    // Default password generation
    generateNewPassword(16, { upper: true, numbers: true, symbols: true });
  }, []);

  // Save changes to shortcuts
  const saveShortcuts = (updated: CustomShortcut[]) => {
    setCustomShortcuts(updated);
    localStorage.setItem('ml_shortcuts', JSON.stringify(updated));
  };

  // Add history event
  const addHistory = (command: string, summary: string, status: 'success' | 'error' | 'info' = 'success') => {
    const newEvent: CommandHistory = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      command,
      outputSummary: summary,
      status
    };
    const updatedHistory = [newEvent, ...history].slice(0, 30); // limit 30 logs
    setHistory(updatedHistory);
    localStorage.setItem('ml_history', JSON.stringify(updatedHistory));
  };

  const clearAllHistory = () => {
    const fresh: CommandHistory[] = [{ id: 'h_clr', timestamp: new Date().toLocaleTimeString(), command: 'history cleared', outputSummary: 'Terminal logs flushed', status: 'info' }];
    setHistory(fresh);
    localStorage.setItem('ml_history', JSON.stringify(fresh));
    triggerNotification('Command logs cleared');
  };

  // --- PASSWORD GENERATION ENGINE ---
  const generateNewPassword = (length: number, opts: typeof pwOptions) => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let pool = lowercase;
    if (opts.upper) pool += uppercase;
    if (opts.numbers) pool += numbers;
    if (opts.symbols) pool += symbols;

    let result = '';
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      result += pool.charAt(idx);
    }
    setGeneratedPw(result);
  };

  useEffect(() => {
    if (activeTool === 'password') {
      generateNewPassword(pwLength, pwOptions);
    }
  }, [pwLength, pwOptions, activeTool]);

  // --- CALCULATOR ENGINE (SAFE PARSER) ---
  const safeEvaluateMath = (expr: string): { value: string; success: boolean } => {
    try {
      if (!expr.trim()) return { value: '', success: false };
      
      // Filter safe mathematical characters
      let sanitized = expr
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^0-9+\-*/().\s^a-z,]/g, '') // allowed tokens
        .replace(/pi/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString());

      // Interactive math transformations
      sanitized = sanitized.replace(/sqrt\(([^)]+)\)/g, (_, val) => Math.sqrt(parseFloat(val)).toString());
      sanitized = sanitized.replace(/sin\(([^)]+)\)/g, (_, val) => Math.sin(parseFloat(val)).toString());
      sanitized = sanitized.replace(/cos\(([^)]+)\)/g, (_, val) => Math.cos(parseFloat(val)).toString());
      sanitized = sanitized.replace(/tan\(([^)]+)\)/g, (_, val) => Math.tan(parseFloat(val)).toString());
      sanitized = sanitized.replace(/log\(([^)]+)\)/g, (_, val) => Math.log10(parseFloat(val)).toString());
      sanitized = sanitized.replace(/pow\(([^,]+),([^)]+)\)/g, (_, v1, v2) => Math.pow(parseFloat(v1), parseFloat(v2)).toString());
      sanitized = sanitized.replace(/\^/g, '**');

      // Restrict eval container scope
      const result = new Function(`return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return { value: Number(result.toFixed(6)).toString(), success: true };
      }
      return { value: 'Invalid expression', success: false };
    } catch (err) {
      return { value: 'Parsing error', success: false };
    }
  };

  // --- TEXT ANALYSIS STATS ---
  const textAnalysis = useMemo(() => {
    const raw = textInput || '';
    const charCount = raw.length;
    const wordCount = raw.trim() ? raw.trim().split(/\s+/).length : 0;
    const sentenceCount = raw.trim() ? raw.split(/[.!?]+/).filter(Boolean).length : 0;
    const linesCount = raw.trim() ? raw.split('\n').length : 0;
    const readingTime = Math.ceil(wordCount / 200); // avg 200 wpm

    // Simple letter frequency analyzer
    const freq: { [key: string]: number } = {};
    const alphaOnly = raw.toLowerCase().replace(/[^a-z]/g, '');
    for (const char of alphaOnly) {
      freq[char] = (freq[char] || 0) + 1;
    }
    const topFreq = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { charCount, wordCount, sentenceCount, linesCount, readingTime, topFreq };
  }, [textInput]);

  // --- COLOR CONVERSION ENGINE ---
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const handleHexChange = (hexVal: string) => {
    setColorHex(hexVal);
    if (/^#?[0-9a-fA-F]{3,6}$/.test(hexVal)) {
      const rgb = hexToRgb(hexVal);
      if (rgb) {
        const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        setColorRgb(rgbStr);
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        setColorHsl(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
      }
    }
  };

  // --- PROCEDURAL WEATHER ENGINE ---
  const weatherDetails = useMemo(() => {
    const name = weatherCity.trim().toLowerCase();
    if (!name) return null;
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    const temp = (hash % 35) - 3; // -3 to 32 C
    const humidity = 25 + (hash % 71); // 25% to 96%
    const windSpeed = 3 + (hash % 42); // 3 to 45 km/h
    const uvIndex = hash % 11; // 0 to 10
    const pressure = 992 + (hash % 38); // 992 to 1030 hPa
    
    const conditions = [
      { type: 'Sunny', desc: 'Clear radiant skies and bright sun.', color: 'text-amber-400 bg-amber-500/10' },
      { type: 'Cloudy', desc: 'Slightly overcast with grey cloud layers.', color: 'text-slate-400 bg-slate-500/10' },
      { type: 'Rainy', desc: 'Fresh rainfall with damp misting.', color: 'text-blue-400 bg-blue-500/10' },
      { type: 'Snowy', desc: 'Chilly winds bringing light snow flurries.', color: 'text-sky-300 bg-sky-500/10' },
      { type: 'Stormy', desc: 'Rumbling skies with heavy rainfall bursts.', color: 'text-violet-400 bg-violet-500/10' },
    ];
    
    const condition = conditions[hash % conditions.length];
    
    return {
      city: weatherCity.charAt(0).toUpperCase() + weatherCity.slice(1),
      temp,
      humidity,
      windSpeed,
      uvIndex,
      pressure,
      ...condition
    };
  }, [weatherCity]);

  // --- STOPWATCH LOGIC ---
  const startStopwatch = () => {
    if (stopwatchActive) return;
    setStopwatchActive(true);
    stopwatchIntervalRef.current = setInterval(() => {
      setStopwatchTime((t) => t + 10);
    }, 10);
  };

  const pauseStopwatch = () => {
    setStopwatchActive(false);
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
    }
  };

  const resetStopwatch = () => {
    pauseStopwatch();
    setStopwatchTime(0);
    setStopwatchLaps([]);
  };

  const recordLap = () => {
    const overall = stopwatchTime;
    const lastOverall = stopwatchLaps.length > 0 ? stopwatchLaps[0].overall : 0;
    const diff = overall - lastOverall;
    const newLap: Lap = {
      id: stopwatchLaps.length + 1,
      time: diff,
      overall
    };
    setStopwatchLaps([newLap, ...stopwatchLaps]);
  };

  const formatTime = (timeMs: number) => {
    const mins = Math.floor(timeMs / 60000);
    const secs = Math.floor((timeMs % 60000) / 1000);
    const ms = Math.floor((timeMs % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // --- COUNTDOWN TIMER LOGIC ---
  const startTimer = () => {
    if (timerActive) return;
    setTimerActive(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setTimerActive(false);
          triggerNotification('Timer finished!', 'info');
          addHistory('timer finished', `Countdown of ${timerDuration}s expired`, 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerActive(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  const resetTimer = () => {
    pauseTimer();
    setTimerRemaining(timerDuration);
  };

  useEffect(() => {
    setTimerRemaining(timerDuration);
  }, [timerDuration]);

  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // --- ALL BUILT-IN COMMANDS MAP ---
  const builtInCommands = useMemo(() => [
    {
      id: 'calc',
      trigger: 'calc',
      name: 'Calculator & Math',
      description: 'Solve mathematical equations & functions instantly',
      category: 'utilities',
      icon: Calculator,
      placeholder: 'calc 25 * 4 + 100',
      action: (args: string) => {
        setActiveTool('calc');
        if (args) {
          setCalcInput(args);
          const evalRes = safeEvaluateMath(args);
          if (evalRes.success) {
            setCalcHistory((prev) => [args + ' = ' + evalRes.value, ...prev].slice(0, 10));
            addHistory(`calc ${args}`, `Evaluated to ${evalRes.value}`, 'success');
          }
        }
      }
    },
    {
      id: 'password',
      trigger: 'password',
      name: 'Password Generator',
      description: 'Generate high-entropy customizable random passwords',
      category: 'utilities',
      icon: ShieldCheck,
      placeholder: 'password [length]',
      action: (args: string) => {
        setActiveTool('password');
        const num = parseInt(args);
        if (num && num >= 6 && num <= 128) {
          setPwLength(num);
        }
        generateNewPassword(pwLength, pwOptions);
        addHistory('password gen', 'Created a secure customized token', 'success');
      }
    },
    {
      id: 'uuid',
      trigger: 'uuid',
      name: 'UUID v4 Generator',
      description: 'Generate standard compliant random UUID tokens',
      category: 'utilities',
      icon: Terminal,
      action: () => {
        setActiveTool('uuid');
        // Simple v4 UUID generator
        const val = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
        navigator.clipboard.writeText(val);
        addHistory('uuid', `Generated ${val} (Copied)`, 'success');
        triggerNotification('UUID copied to clipboard!');
      }
    },
    {
      id: 'text',
      trigger: 'text',
      name: 'Text Metrics Analyzer',
      description: 'Live character, word counts, reading time, and stats',
      category: 'utilities',
      icon: Type,
      placeholder: 'text [some sample string]',
      action: (args: string) => {
        setActiveTool('text');
        if (args) {
          setTextInput(args);
        }
        addHistory('text analysis', 'Loaded string parameter into text workbench', 'success');
      }
    },
    {
      id: 'color',
      trigger: 'color',
      name: 'Color Converter',
      description: 'Transform hex, rgb, and hsl formats with dynamic swatch',
      category: 'utilities',
      icon: Hash,
      placeholder: 'color #6366f1',
      action: (args: string) => {
        setActiveTool('color');
        if (args) {
          handleHexChange(args);
        }
        addHistory('color converter', `Inspected ${args || colorHex} palette`, 'success');
      }
    },
    {
      id: 'weather',
      trigger: 'weather',
      name: 'Weather Forecaster',
      description: 'Generate a rich interactive meteorological weather dashboard',
      category: 'utilities',
      icon: CloudRain,
      placeholder: 'weather Tokyo',
      action: (args: string) => {
        setActiveTool('weather');
        if (args) {
          setWeatherCity(args);
        }
        addHistory('weather lookup', `Observed weather matrix for ${args || weatherCity}`, 'success');
      }
    },
    {
      id: 'stopwatch',
      trigger: 'stopwatch',
      name: 'Stopwatch Terminal',
      description: 'Precision timer with live millisecond lap tracking',
      category: 'time',
      icon: Clock,
      action: () => {
        setActiveTool('stopwatch');
        addHistory('stopwatch', 'Opened stopwatch tool panel', 'info');
      }
    },
    {
      id: 'timer',
      trigger: 'timer',
      name: 'Countdown Timer',
      description: 'Set a customizable countdown with alerts',
      category: 'time',
      icon: Clock,
      placeholder: 'timer 120',
      action: (args: string) => {
        setActiveTool('timer');
        const secs = parseInt(args);
        if (secs && secs > 0) {
          setTimerDuration(secs);
        }
        addHistory('timer set', `Timer set to ${secs || timerDuration}s`, 'info');
      }
    },
    {
      id: 'sysinfo',
      trigger: 'sysinfo',
      name: 'System Specs Monitor',
      description: 'Audit local screen dimensions, OS parameters, and environment state',
      category: 'utilities',
      icon: Cpu,
      action: () => {
        setActiveTool('sysinfo');
        addHistory('sysinfo', 'Inspected browser environment specs', 'success');
      }
    }
  ], [pwLength, pwOptions, colorHex, weatherCity, timerDuration]);

  // --- MERGED FILTER & SEARCH LOGIC ---
  const filteredCommands = useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Check if the query is a prefix trigger (e.g., "calc 5+5" -> command id 'calc' matched with args)
    const spaceIndex = cleanQuery.indexOf(' ');
    const prefix = spaceIndex !== -1 ? cleanQuery.substring(0, spaceIndex) : cleanQuery;
    
    // Commands list matching standard categories
    let pool = [...builtInCommands];

    // Filter by tab
    if (activeTab === 'utilities') {
      pool = pool.filter(c => c.category === 'utilities' || c.category === 'time');
    } else if (activeTab === 'shortcuts') {
      pool = []; // custom links will be added separately below
    }

    // Match keywords
    let results = pool.filter(cmd => {
      return (
        cmd.trigger.startsWith(prefix) ||
        cmd.name.toLowerCase().includes(cleanQuery) ||
        cmd.description.toLowerCase().includes(cleanQuery)
      );
    });

    // Append custom shortcuts
    const mappedCustoms = customShortcuts.map(sh => ({
      id: `custom_${sh.id}`,
      trigger: sh.trigger,
      name: sh.name,
      description: `Launch external URL: ${sh.url.replace('{query}', '[arg]')}`,
      category: 'shortcuts',
      icon: Link,
      placeholder: `${sh.trigger} [query]`,
      action: (args: string) => {
        const destination = sh.url.replace('{query}', encodeURIComponent(args));
        window.open(destination, '_blank');
        addHistory(sh.trigger, `Launched URL: ${destination}`, 'success');
        triggerNotification(`Redirecting to ${sh.name}...`);
      }
    }));

    const matchedCustoms = mappedCustoms.filter(sh => {
      if (activeTab === 'utilities') return false;
      return (
        sh.trigger.startsWith(prefix) ||
        sh.name.toLowerCase().includes(cleanQuery) ||
        sh.description.toLowerCase().includes(cleanQuery)
      );
    });

    return [...results, ...matchedCustoms];
  }, [query, builtInCommands, activeTab, customShortcuts]);

  // Adjust selectedIndex boundary on filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Live expression preview under command bar
  const quickMathResult = useMemo(() => {
    if (!query) return null;
    // Check if query looks like a standalone math calculation (e.g. "45*12")
    const isMathPattern = /^[0-9+\-*/().\s^%]+$/.test(query);
    if (isMathPattern) {
      const res = safeEvaluateMath(query);
      if (res.success) return res.value;
    }
    // Check if it's the calc command prefix (e.g. "calc 12 * 12")
    if (query.startsWith('calc ')) {
      const mathExpr = query.replace('calc ', '');
      const res = safeEvaluateMath(mathExpr);
      if (res.success) return res.value;
    }
    return null;
  }, [query]);

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // 1. Ctrl+K or / to focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // 2. Keyboard Navigation if search input is focused
      if (document.activeElement === inputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((idx) => (idx + 1) % Math.max(1, filteredCommands.length));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((idx) => (idx - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          triggerSelectedCommand();
        } else if (e.key === 'Escape') {
          setQuery('');
          setActiveTool(null);
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [filteredCommands, selectedIndex, query]);

  const triggerSelectedCommand = (customCmd?: any) => {
    const activeCmd = customCmd || filteredCommands[selectedIndex];
    if (!activeCmd) {
      // If no exact match list but has standalone query, run Google search default or calc if relevant
      if (query.trim()) {
        const mathRes = safeEvaluateMath(query);
        if (mathRes.success) {
          setActiveTool('calc');
          setCalcInput(query);
          setCalcHistory((prev) => [query + ' = ' + mathRes.value, ...prev].slice(0, 10));
          addHistory(`calc ${query}`, `Evaluated standalone math: ${mathRes.value}`, 'success');
          setQuery('');
          return;
        }
        // Redirect google search
        const dest = `https://google.com/search?q=${encodeURIComponent(query)}`;
        window.open(dest, '_blank');
        addHistory('search', `Google searched: "${query}"`, 'success');
        setQuery('');
      }
      return;
    }

    // Extract arguments from the search query text input
    let args = '';
    const cleanQuery = query.toLowerCase().trim();
    if (cleanQuery.startsWith(activeCmd.trigger + ' ')) {
      args = query.substring(activeCmd.trigger.length + 1);
    }

    activeCmd.action(args);
    setQuery(''); // Reset query after launch
  };

  // --- CUSTOM SHORTCUT REGISTRY FORM ACTIONS ---
  const handleAddShortcut = (e: FormEvent) => {
    e.preventDefault();
    if (!newShortcutName.trim() || !newShortcutTrigger.trim() || !newShortcutUrl.trim()) {
      triggerNotification('Please populate all shortcut parameters', 'info');
      return;
    }

    // Check if trigger is safe
    const isConflict = builtInCommands.some(c => c.trigger === newShortcutTrigger.trim().toLowerCase());
    if (isConflict) {
      triggerNotification('Shortcut trigger conflicts with a built-in command', 'info');
      return;
    }

    const newSc: CustomShortcut = {
      id: Math.random().toString(),
      name: newShortcutName,
      trigger: newShortcutTrigger.trim().toLowerCase().replace(/\s/g, ''),
      url: newShortcutUrl.trim(),
      category: newShortcutCategory
    };

    const updated = [...customShortcuts, newSc];
    saveShortcuts(updated);
    addHistory('create shortcut', `Added custom trigger "${newSc.trigger}" -> ${newSc.name}`, 'success');
    triggerNotification('Shortcut successfully registered!');

    // Reset inputs
    setNewShortcutName('');
    setNewShortcutTrigger('');
    setNewShortcutUrl('');
  };

  const handleDeleteShortcut = (id: string) => {
    const updated = customShortcuts.filter(s => s.id !== id);
    saveShortcuts(updated);
    addHistory('delete shortcut', 'Removed custom shortcut trigger', 'info');
    triggerNotification('Shortcut deleted');
  };

  // Environment data for sysinfo tool
  const sysSpecs = useMemo(() => {
    if (typeof window === 'undefined') return {};
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      innerDimensions: `${window.innerWidth} x ${window.innerHeight}`,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      localTime: new Date().toString(),
      onlineStatus: navigator.onLine ? 'ONLINE' : 'OFFLINE'
    };
  }, []);

  return (
    <div id="app_container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* Top Header Bar */}
      <header id="header_nav" className="w-full h-14 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="font-mono text-sm tracking-wider font-semibold text-slate-300">MINI_SHELL_v1.0</span>
          <span className="text-slate-600">/</span>
          <h1 className="text-sm font-semibold text-slate-200">Mini Command Launcher</h1>
        </div>

        {/* Dynamic UTC Clock */}
        <div id="dynamic_clock_display" className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-mono text-slate-400">
            <Clock size={12} />
            <span>UTC: {new Date().toUTCString().slice(17, 25)}</span>
          </div>
          <span className="text-xs text-slate-500">Press <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[10px] text-indigo-400">⌘K</kbd> or <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[10px] text-indigo-400">/</kbd> to launch</span>
        </div>
      </header>

      {/* Main Body Grid Layout */}
      <main id="main_layout_content" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        
        {/* Left Column - Launcher & Search Hub (7 cols on large screens) */}
        <div id="launcher_hub_column" className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Main Command Input Box */}
          <div 
            id="command_search_box" 
            className={`bg-slate-900/40 rounded-xl border p-4 transition-all duration-300 backdrop-blur-sm shadow-xl flex flex-col gap-3 relative overflow-hidden ${
              isFocused ? 'border-indigo-500 bg-slate-900/75 shadow-indigo-950/20' : 'border-slate-800'
            }`}
          >
            {/* Ambient Background Gradient for search area */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>

            <div className="flex items-center gap-3 relative">
              <div className="text-slate-400">
                <Search size={20} className={isFocused ? 'text-indigo-400' : ''} />
              </div>
              <input
                ref={inputRef}
                id="search_query_input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Type a command or query (e.g. calc, password, g tech news)..."
                className="w-full bg-transparent text-slate-100 placeholder-slate-500 outline-none text-base font-mono py-1"
                autoComplete="off"
                autoFocus
              />
              {query && (
                <button 
                  id="clear_query_btn"
                  onClick={() => { setQuery(''); setSelectedIndex(0); }} 
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Inline dynamic search engine preview */}
            {quickMathResult && (
              <div id="math_preview_bar" className="mt-1 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Calculator size={13} />
                  <span>Real-time math computation:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded text-indigo-300">{quickMathResult}</span>
                  <button 
                    id="copy_math_btn"
                    onClick={() => {
                      navigator.clipboard.writeText(quickMathResult);
                      triggerNotification('Calculated output copied!');
                    }}
                    className="hover:text-white p-0.5 rounded hover:bg-slate-800"
                    title="Copy Answer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filtering Tabs & Command Registry Grid */}
          <div id="command_registry_panel" className="bg-slate-900/30 rounded-xl border border-slate-900 flex flex-col flex-1 min-h-[450px]">
            
            {/* Custom Tab Selectors */}
            <div id="tabs_container" className="flex border-b border-slate-900 px-4 pt-3 gap-2">
              {[
                { id: 'all', label: '⚡ All Utilities' },
                { id: 'utilities', label: '🛠️ Core Tools' },
                { id: 'shortcuts', label: '🌐 Custom Web Links' },
                { id: 'settings', label: '⚙️ Shortcut Registry' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`tab_select_${tab.id}`}
                  onClick={() => { setActiveTab(tab.id as any); setSelectedIndex(0); }}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'border-indigo-500 text-indigo-400 bg-slate-900/40' 
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List Content */}
            <div id="command_scroll_area" className="flex-1 overflow-y-auto p-4 max-h-[500px] flex flex-col gap-2">
              
              {activeTab === 'settings' ? (
                // Custom shortcut register layout
                <div id="settings_tab_form" className="flex flex-col gap-5 py-2">
                  <div className="p-4 bg-slate-900/55 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
                      <Plus size={14} className="text-emerald-400" />
                      Register New Command / External Shortcut
                    </h3>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Create keyboard shortcuts to query search engines or launch URLs with standard parameters. Use <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">{`{query}`}</code> to pass search strings dynamically.
                    </p>

                    <form id="create_shortcut_form" onSubmit={handleAddShortcut} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase text-slate-400 font-mono mb-1">Shortcut Trigger Key</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. twitter, doc, wiki"
                          value={newShortcutTrigger}
                          onChange={(e) => setNewShortcutTrigger(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase text-slate-400 font-mono mb-1">Display Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Wikipedia Search"
                          value={newShortcutName}
                          onChange={(e) => setNewShortcutName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[11px] uppercase text-slate-400 font-mono mb-1">Target URL Template</label>
                        <input
                          type="url"
                          required
                          placeholder="e.g. https://en.wikipedia.org/wiki/Special:Search?search={query}"
                          value={newShortcutUrl}
                          onChange={(e) => setNewShortcutUrl(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-between items-center mt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] uppercase text-slate-400 font-mono">Category:</span>
                          <div className="flex gap-2">
                            {['Dev', 'Web', 'Work', 'Social'].map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNewShortcutCategory(cat)}
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${
                                  newShortcutCategory === cat 
                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                                    : 'border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          type="submit"
                          id="submit_shortcut_btn"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} />
                          Add Shortcut
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Registered List */}
                  <div className="mt-2">
                    <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-3">Active Registered Custom Shortcuts ({customShortcuts.length})</h4>
                    <div id="shortcuts_list_grid" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customShortcuts.map((sc) => (
                        <div key={sc.id} className="p-3 bg-slate-900/30 rounded border border-slate-900 flex items-center justify-between">
                          <div className="flex flex-col gap-0.5 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-xs px-1.5 py-0.5 rounded">{sc.trigger}</span>
                              <span className="text-xs font-semibold text-slate-200">{sc.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate font-mono">{sc.url}</span>
                          </div>
                          <button
                            id={`del_shortcut_${sc.id}`}
                            onClick={() => handleDeleteShortcut(sc.id)}
                            className="p-1 hover:bg-red-950/40 rounded text-slate-500 hover:text-red-400 transition"
                            title="Delete Shortcut"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Standard filtered lists
                <div id="standard_command_list" className="flex flex-col gap-1.5">
                  {filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd, idx) => {
                      const IconComp = cmd.icon;
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={cmd.id}
                          id={`command_item_${cmd.id}`}
                          onClick={() => triggerSelectedCommand(cmd)}
                          className={`group p-3 rounded-lg border flex items-center justify-between transition-all duration-150 cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-950/20 border-indigo-500 shadow-sm shadow-indigo-950/30' 
                              : 'bg-slate-900/20 border-slate-900 hover:bg-slate-900/40 hover:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-950 text-slate-400 group-hover:text-indigo-400'
                            }`}>
                              <IconComp size={16} />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-200">{cmd.name}</span>
                                {cmd.category && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono bg-slate-900 text-slate-500 border border-slate-800/60">
                                    {cmd.category}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 mt-0.5">{cmd.description}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {cmd.placeholder && (
                              <span className="hidden sm:inline text-[10px] font-mono text-slate-600 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded">
                                {cmd.placeholder}
                              </span>
                            )}
                            <div className={`px-2 py-1 rounded text-[10px] font-mono transition-colors flex items-center gap-1 ${
                              isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-950 text-indigo-400 group-hover:bg-slate-900'
                            }`}>
                              <span>{cmd.trigger}</span>
                              <ChevronRight size={10} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div id="no_commands_found" className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                      <Terminal size={32} className="text-slate-700 animate-pulse" />
                      <span className="text-xs font-mono">No utility triggers found matching "{query}"</span>
                      <p className="text-[11px] text-slate-600 max-w-xs text-center mt-1">
                        Try looking for "calc", "password", "uuid", "weather", or press <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800">Enter</kbd> to launch a custom web query.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Keyboard Reference footer */}
            <div id="keyboard_quick_reference" className="p-3 bg-slate-900/40 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><kbd className="bg-slate-950 border border-slate-800 px-1 py-0.5 rounded">↑↓</kbd> Navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-slate-950 border border-slate-800 px-1 py-0.5 rounded">Enter</kbd> Execute</span>
                <span className="flex items-center gap-1"><kbd className="bg-slate-950 border border-slate-800 px-1 py-0.5 rounded">Esc</kbd> Reset</span>
              </div>
              <span className="text-indigo-400 hidden sm:inline">Active command triggers: {filteredCommands.length} matches</span>
            </div>
          </div>
        </div>

        {/* Right Column - Sandbox Workbench & Shell logs (5 cols) */}
        <div id="active_workbench_column" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main output console card */}
          <div id="output_console_card" className="bg-slate-900/30 rounded-xl border border-slate-900 overflow-hidden flex flex-col min-h-[400px]">
            
            {/* Header / Console status */}
            <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-xs font-mono text-slate-400 ml-1.5 uppercase tracking-wider">SANDBOX_WORKBENCH</span>
              </div>
              
              {activeTool && (
                <button
                  id="close_tool_btn"
                  onClick={() => setActiveTool(null)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition flex items-center gap-1"
                >
                  <span className="text-[10px] font-mono">CLOSE</span>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sandbox workbench workspace rendering */}
            <div id="workbench_main_display" className="flex-1 p-4 flex flex-col">
              
              {activeTool === 'calc' && (
                <div id="calc_workbench" className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                      <Calculator size={14} /> Calculator Workbench
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Real-time Sandbox</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <input
                      id="calc_workbench_input"
                      type="text"
                      value={calcInput}
                      onChange={(e) => {
                        setCalcInput(e.target.value);
                        const res = safeEvaluateMath(e.target.value);
                        if (res.success) {
                          setCalcHistory((prev) => [e.target.value + ' = ' + res.value, ...prev].slice(0, 10));
                        }
                      }}
                      placeholder="Type custom equation (e.g. sqrt(144) + 12)..."
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                      <span>Live output:</span>
                      <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        {safeEvaluateMath(calcInput).value || '0'}
                      </span>
                    </div>
                  </div>

                  {/* Calculator Pad Grid */}
                  <div id="calc_keypad" className="grid grid-cols-4 gap-1.5">
                    {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', 'C', '+'].map((btn) => (
                      <button
                        key={btn}
                        id={`calc_btn_${btn === '/' ? 'div' : btn === '*' ? 'mul' : btn === '+' ? 'add' : btn === '-' ? 'sub' : btn}`}
                        onClick={() => {
                          if (btn === 'C') {
                            setCalcInput('');
                          } else {
                            setCalcInput((prev) => prev + btn);
                          }
                        }}
                        className="py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-800 active:bg-slate-700 transition cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                    {['sqrt(', 'sin(', 'cos(', 'pi'].map((btn) => (
                      <button
                        key={btn}
                        id={`calc_adv_btn_${btn.replace('(', '')}`}
                        onClick={() => setCalcInput((prev) => prev + btn)}
                        className="py-1 rounded bg-slate-950 border border-slate-900 text-indigo-400 font-mono text-[10px] hover:bg-slate-900/60 transition cursor-pointer"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>

                  {/* Calculation logs */}
                  <div className="mt-2 border-t border-slate-900 pt-3 flex-1 flex flex-col">
                    <span className="text-[10px] uppercase font-mono text-slate-500 mb-1.5 block">History Matrix</span>
                    <div id="calc_history_logs" className="flex-1 bg-slate-950 rounded border border-slate-900 p-2 font-mono text-[11px] text-slate-400 overflow-y-auto max-h-[120px] flex flex-col gap-1">
                      {calcHistory.length > 0 ? (
                        calcHistory.map((item, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-slate-900/40 pb-1">
                            <span className="truncate">{item}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.split(' = ')[1]);
                                triggerNotification('Value copied!');
                              }}
                              className="text-slate-500 hover:text-white"
                              title="Copy Answer"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-600 text-center py-2">No calculations recorded</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTool === 'password' && (
                <div id="password_workbench" className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                      <ShieldCheck size={14} /> Secure Tokenizer
                    </span>
                    <button
                      id="regen_pw_btn"
                      onClick={() => generateNewPassword(pwLength, pwOptions)}
                      className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded transition"
                      title="Regenerate Token"
                    >
                      <RefreshCw size={13} className="animate-spin-slow" />
                    </button>
                  </div>

                  {/* Generated Password block */}
                  <div className="bg-slate-950 border border-slate-800 rounded p-3 flex items-center justify-between">
                    <span id="generated_password_display" className="font-mono text-sm text-emerald-400 break-all select-all font-semibold">{generatedPw || 'Configuring...'}</span>
                    <button
                      id="copy_generated_password"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPw);
                        triggerNotification('Secure password copied!');
                      }}
                      className="p-1.5 hover:bg-slate-900 text-slate-400 hover:text-white rounded transition"
                      title="Copy Password"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {/* Password Configuration widgets */}
                  <div className="flex flex-col gap-3.5 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span>Entropy Length:</span>
                        <span className="text-emerald-400 font-bold">{pwLength} characters</span>
                      </div>
                      <input
                        id="pw_length_slider"
                        type="range"
                        min="8"
                        max="64"
                        value={pwLength}
                        onChange={(e) => setPwLength(parseInt(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex flex-col gap-2 border-t border-slate-900 pt-3">
                      <span className="text-[11px] font-mono text-slate-400 mb-1 block">Entropy Configuration:</span>
                      
                      {[
                        { key: 'upper', label: 'Include uppercase letters (A-Z)' },
                        { key: 'numbers', label: 'Include numerical values (0-9)' },
                        { key: 'symbols', label: 'Include special characters (&-$)' }
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={(pwOptions as any)[opt.key]}
                            onChange={(e) => setPwOptions((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                            className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-0 cursor-pointer"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTool === 'text' && (
                <div id="text_workbench" className="flex flex-col gap-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                      <Type size={14} /> Text Metrics Analyzer
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Live telemetry</span>
                  </div>

                  <textarea
                    id="text_metrics_input"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste or type raw content string here for full analytical reports..."
                    className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-2.5 text-xs font-mono outline-none focus:border-indigo-500 resize-none"
                  ></textarea>

                  {/* Stats Matrix */}
                  <div className="grid grid-cols-2 gap-2 text-center bg-slate-900/30 p-2.5 rounded border border-slate-900">
                    <div className="bg-slate-950/50 p-2 rounded">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Characters</span>
                      <span className="text-sm font-semibold text-slate-200 font-mono">{textAnalysis.charCount}</span>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Words</span>
                      <span className="text-sm font-semibold text-slate-200 font-mono">{textAnalysis.wordCount}</span>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Sentences</span>
                      <span className="text-sm font-semibold text-slate-200 font-mono">{textAnalysis.sentenceCount}</span>
                    </div>
                    <div className="bg-slate-950/50 p-2 rounded">
                      <span className="text-[10px] uppercase font-mono text-slate-500 block">Reading Time</span>
                      <span className="text-xs font-semibold text-indigo-400 font-mono">~{textAnalysis.readingTime} min</span>
                    </div>
                  </div>

                  {/* Character Frequency Analysis */}
                  {textAnalysis.topFreq.length > 0 && (
                    <div className="mt-1 bg-slate-950/40 p-2.5 rounded border border-slate-900/50">
                      <span className="text-[10px] uppercase font-mono text-slate-500 mb-2 block flex items-center gap-1">
                        <BarChart2 size={12} /> Letter Frequency Spectrum
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {textAnalysis.topFreq.map(([letter, count]) => {
                          const maxCount = textAnalysis.topFreq[0][1];
                          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={letter} className="flex items-center gap-2 text-[11px] font-mono">
                              <span className="uppercase text-indigo-400 font-bold w-3">{letter}</span>
                              <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded" style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className="text-slate-400 text-[10px] w-6 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'color' && (
                <div id="color_workbench" className="flex flex-col gap-4 flex-1">
                  <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                    <Sliders size={14} /> Color Converter Sandbox
                  </span>

                  {/* Swatch & Input Selection */}
                  <div className="flex gap-4 items-center">
                    <div 
                      id="color_preview_swatch"
                      className="w-16 h-16 rounded-xl border border-slate-800 shadow shadow-slate-950/50 relative overflow-hidden"
                      style={{ backgroundColor: colorHex }}
                    >
                      <input 
                        id="color_native_picker"
                        type="color" 
                        value={colorHex.startsWith('#') ? colorHex : '#6366f1'} 
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase font-mono text-slate-400 mb-0.5">HEX Format Code</label>
                      <input
                        id="color_hex_input"
                        type="text"
                        value={colorHex}
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs font-mono text-white outline-none focus:border-indigo-500"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>

                  {/* Mapped results */}
                  <div className="flex flex-col gap-2.5 mt-2 bg-slate-900/30 p-3 rounded-lg border border-slate-900">
                    {[
                      { label: 'RGB Matrix', value: colorRgb },
                      { label: 'HSL Spectrum', value: colorHsl }
                    ].map((fmt, i) => (
                      <div key={i} className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500">{fmt.label}:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-900/60">{fmt.value}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(fmt.value);
                              triggerNotification(`${fmt.label} format copied!`);
                            }}
                            className="p-1 hover:bg-slate-900 text-slate-500 hover:text-white rounded"
                            title="Copy Formatted Value"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === 'weather' && (
                <div id="weather_workbench" className="flex flex-col gap-4 flex-1">
                  <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                    <CloudRain size={14} /> Procedural Weather Monitor
                  </span>

                  <div className="flex gap-2">
                    <input
                      id="weather_city_input"
                      type="text"
                      value={weatherCity}
                      onChange={(e) => setWeatherCity(e.target.value)}
                      placeholder="Type city name (e.g. Sydney, Cairo, Berlin)..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1 text-xs font-mono text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  {weatherDetails && (
                    <div id="weather_report_card" className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{weatherDetails.city}</h4>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive simulation</span>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-bold font-mono text-indigo-400">{weatherDetails.temp}°C</span>
                        </div>
                      </div>

                      <div className="my-4 p-2 rounded bg-slate-950/50 border border-slate-900 text-xs flex flex-col gap-1 text-slate-400">
                        <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-[11px]">
                          <span>Forecast:</span>
                          <span className="bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[10px]">{weatherDetails.type}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed mt-0.5 italic">{weatherDetails.desc}</p>
                      </div>

                      {/* Micro specs grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-900 pt-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Wind size={12} className="text-slate-400" />
                          <span>Wind:</span>
                          <span className="text-slate-300">{weatherDetails.windSpeed} km/h</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Compass size={12} className="text-slate-400" />
                          <span>Humidity:</span>
                          <span className="text-slate-300">{weatherDetails.humidity}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span>UV Index:</span>
                          <span className="text-slate-300">{weatherDetails.uvIndex} / 10</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <span>Pressure:</span>
                          <span className="text-slate-300">{weatherDetails.pressure} hPa</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'stopwatch' && (
                <div id="stopwatch_workbench" className="flex flex-col gap-4 flex-1">
                  <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                    <Clock size={14} /> Stopwatch Sandbox
                  </span>

                  {/* Main Dial */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
                    <span id="stopwatch_digital_time" className="text-4xl font-bold font-mono text-emerald-400 select-all tracking-wider">
                      {formatTime(stopwatchTime)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-widest">Millisecond Precision</span>
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2">
                    {!stopwatchActive ? (
                      <button
                        id="stopwatch_start_btn"
                        onClick={startStopwatch}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play size={13} /> START
                      </button>
                    ) : (
                      <button
                        id="stopwatch_pause_btn"
                        onClick={pauseStopwatch}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pause size={13} /> PAUSE
                      </button>
                    )}

                    <button
                      id="stopwatch_lap_btn"
                      onClick={recordLap}
                      disabled={!stopwatchActive}
                      className="px-4 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 font-medium rounded text-xs transition hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      LAP
                    </button>

                    <button
                      id="stopwatch_reset_btn"
                      onClick={resetStopwatch}
                      className="px-4 py-1.5 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white font-medium rounded text-xs transition hover:bg-slate-900 cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>

                  {/* Laps history list */}
                  <div className="mt-2 border-t border-slate-900 pt-3 flex flex-col flex-1">
                    <span className="text-[10px] uppercase font-mono text-slate-500 mb-1.5 block">Lap Chronology</span>
                    <div id="stopwatch_laps_list" className="flex-1 bg-slate-950 rounded border border-slate-900 p-2 font-mono text-[11px] text-slate-400 overflow-y-auto max-h-[120px] flex flex-col gap-1">
                      {stopwatchLaps.length > 0 ? (
                        stopwatchLaps.map((lap) => (
                          <div key={lap.id} className="flex justify-between border-b border-slate-900/40 pb-1">
                            <span className="text-indigo-400 font-bold">LAP {lap.id}</span>
                            <span>{formatTime(lap.time)}</span>
                            <span className="text-slate-500">{formatTime(lap.overall)}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-600 text-center py-2">No laps logged</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTool === 'timer' && (
                <div id="timer_workbench" className="flex flex-col gap-4 flex-1">
                  <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1">
                    <Clock size={14} /> Countdown Timer Workbench
                  </span>

                  {/* Visual timer radial state container */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-850 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                    <span id="timer_digital_display" className="text-4xl font-bold font-mono text-indigo-400">
                      {Math.floor(timerRemaining / 60)}:{(timerRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 uppercase">
                      {timerActive ? 'Active Countdown' : 'Timer Configured'}
                    </span>
                  </div>

                  {/* Timer Preset sliders */}
                  <div className="flex flex-col gap-1.5 bg-slate-900/40 p-2.5 rounded border border-slate-900">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Duration:</span>
                      <span className="text-indigo-300 font-bold">{timerDuration} seconds</span>
                    </div>
                    <input
                      id="timer_duration_slider"
                      type="range"
                      min="10"
                      max="600"
                      step="10"
                      value={timerDuration}
                      disabled={timerActive}
                      onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-950 rounded cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  {/* Presets quick list */}
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {[30, 60, 120, 300].map((preset) => (
                      <button
                        key={preset}
                        id={`timer_preset_${preset}`}
                        disabled={timerActive}
                        onClick={() => setTimerDuration(preset)}
                        className={`px-2.5 py-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                          timerDuration === preset 
                            ? 'border-indigo-500 bg-indigo-500/15 text-indigo-400 font-bold' 
                            : 'border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset}s
                      </button>
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-2">
                    {!timerActive ? (
                      <button
                        id="timer_start_btn"
                        onClick={startTimer}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play size={13} /> START COUNTDOWN
                      </button>
                    ) : (
                      <button
                        id="timer_pause_btn"
                        onClick={pauseTimer}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pause size={13} /> PAUSE TIMER
                      </button>
                    )}
                    <button
                      id="timer_reset_btn"
                      onClick={resetTimer}
                      className="px-4 py-1.5 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white font-medium rounded text-xs transition cursor-pointer"
                    >
                      RESET
                    </button>
                  </div>
                </div>
              )}

              {activeTool === 'sysinfo' && (
                <div id="sysinfo_workbench" className="flex flex-col gap-3 flex-1 text-xs font-mono">
                  <span className="text-xs uppercase tracking-wider font-mono text-indigo-400 flex items-center gap-1.5">
                    <Cpu size={14} /> System Specs Monitor
                  </span>

                  <div id="sysinfo_specs_grid" className="flex-1 bg-slate-950 p-3 rounded border border-slate-900 flex flex-col gap-2.5 max-h-[300px] overflow-y-auto">
                    {[
                      { label: 'Environment URL', value: window.location.origin, copyable: true },
                      { label: 'Agent Browser', value: sysSpecs.userAgent, truncate: true },
                      { label: 'Resolution', value: `${sysSpecs.screenWidth} x ${sysSpecs.screenHeight} (Viewport: ${sysSpecs.innerDimensions})` },
                      { label: 'Language Locale', value: sysSpecs.language },
                      { label: 'Active Timezone', value: sysSpecs.timezone },
                      { label: 'Client Node State', value: sysSpecs.onlineStatus, customStyle: 'text-emerald-400 font-bold' }
                    ].map((spec, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 border-b border-slate-900/60 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{spec.label}</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[11px] text-slate-300 break-all leading-relaxed ${spec.truncate ? 'truncate max-w-[90%]' : ''} ${spec.customStyle || ''}`}>
                            {spec.value || 'Detecting...'}
                          </span>
                          {spec.copyable && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(spec.value || '');
                                triggerNotification('Copied environment URL!');
                              }}
                              className="text-slate-500 hover:text-white transition"
                              title="Copy value"
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Welcome card if no active utility is open */}
              {!activeTool && (
                <div id="workbench_welcome_card" className="flex-1 flex flex-col justify-between py-2">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <Sparkles size={16} />
                      <span className="text-xs uppercase tracking-wider font-mono">Core Dashboard</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Select any utility triggers or type parameters into the search input bar to instantiate sandboxed workbenches.
                    </p>
                  </div>

                  {/* Browser / environment specs summary card */}
                  <div className="bg-slate-950 border border-slate-900 p-3 rounded-lg flex flex-col gap-2 my-2 font-mono text-[10px] text-slate-500">
                    <span className="uppercase text-slate-400 text-[11px] border-b border-slate-900 pb-1 flex items-center gap-1">
                      <Cpu size={11} /> Shell Environment Overview
                    </span>
                    <div className="flex justify-between">
                      <span>TIMEZONE:</span>
                      <span className="text-indigo-400 font-bold">{sysSpecs.timezone || 'UTC'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CLIENT STATUS:</span>
                      <span className="text-emerald-400 font-bold">● ACTIVE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VIEWPORT SIZE:</span>
                      <span className="text-slate-300">{sysSpecs.innerDimensions || 'Responsive'}</span>
                    </div>
                  </div>

                  {/* History Logs */}
                  <div className="mt-2 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-2 border-b border-slate-900/60 pb-1.5">
                      <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                        <Terminal size={12} /> Execution History Logs
                      </span>
                      <button
                        id="clear_logs_btn"
                        onClick={clearAllHistory}
                        className="text-[10px] text-slate-500 hover:text-red-400 transition font-mono"
                      >
                        FLUSH
                      </button>
                    </div>

                    <div id="terminal_history_panel" className="flex-1 bg-slate-950/80 rounded border border-slate-900 p-2.5 font-mono text-[11px] text-slate-400 overflow-y-auto max-h-[160px] flex flex-col gap-1.5 scrollbar-thin">
                      {history.map((item) => (
                        <div key={item.id} className="flex flex-col gap-0.5 border-b border-slate-900/30 pb-1 last:border-0 last:pb-0">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-600">[{item.timestamp}]</span>
                            <span className={`font-semibold uppercase ${
                              item.status === 'success' ? 'text-emerald-500/80' : item.status === 'error' ? 'text-red-500/80' : 'text-indigo-400/80'
                            }`}>
                              {item.command}
                            </span>
                          </div>
                          <span className="text-slate-300 leading-relaxed truncate">{item.outputSummary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Quick preset card launchers */}
          <div id="quick_launch_presets_card" className="bg-slate-900/30 rounded-xl border border-slate-900 p-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-mono mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" />
              Quick Launch Workspace Presets
            </h3>
            <div id="presets_row" className="flex flex-wrap gap-2">
              {[
                { id: 'calc', label: 'Math Calculator', icon: Calculator },
                { id: 'password', label: 'Token Maker', icon: ShieldCheck },
                { id: 'text', label: 'Metrics Parser', icon: Type },
                { id: 'weather', label: 'Forecaster', icon: CloudRain },
                { id: 'stopwatch', label: 'Stopwatch', icon: Clock }
              ].map((preset) => (
                <button
                  key={preset.id}
                  id={`preset_launcher_${preset.id}`}
                  onClick={() => {
                    setActiveTool(preset.id);
                    addHistory(preset.id, `Opened standard ${preset.label} workbench`, 'success');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer ${
                    activeTool === preset.id 
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold' 
                      : 'border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  <preset.icon size={12} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </main>

      {/* Persistent global floating notifications */}
      {showNotification.show && (
        <div 
          id="global_toast_notification"
          className="fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-xl border backdrop-blur-md flex items-center gap-2 text-xs font-mono z-50 animate-bounce duration-300 bg-slate-950 border-indigo-500 text-slate-100"
        >
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span>{showNotification.msg}</span>
        </div>
      )}

      {/* Minimal Footer */}
      <footer id="footer_copyright" className="w-full py-4 border-t border-slate-900 bg-slate-950/50 mt-auto text-center text-xs text-slate-600 font-mono">
        <span>© {new Date().getFullYear()} Mini Command Launcher. Built with pristine layout & offline metrics persistence.</span>
      </footer>

    </div>
  );
}
