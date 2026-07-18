'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu, Server, Database, Layers, ArrowRightLeft, WifiOff, Mic, Code, Play, CheckCircle2, Info, RefreshCw, Terminal, Eye, Sliders, Landmark } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";

type ArchitectureNode = {
  id: string;
  name: string;
  type: "frontend" | "backend" | "database" | "offline" | "ai";
  description: string;
  tech: string;
  files: string[];
  role: string;
};

const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: "frontend",
    name: "Next.js Web Client",
    type: "frontend",
    tech: "Next.js 16 (App Router), React Query, Zustand, Tailwind v4",
    role: "User interface, state store, voice recording, offline request dispatching, responsive UI layouts.",
    files: [
      "src/app/dashboard/page.tsx",
      "src/app/dashboard/add/page.tsx",
      "src/components/AmountInput.tsx",
      "src/stores/useThemeStore.ts"
    ],
    description: "The core frontend app. Uses Zustand stores to sync themes and auth states. Uses React Query to cache REST API responses and synchronize mutations."
  },
  {
    id: "offline",
    name: "Offline Queue Engine",
    type: "offline",
    tech: "Local Storage, Window Event Listeners, Axios Interceptors",
    role: "Buffers requests when disconnected, monitors network status, and replays failed actions on reconnection.",
    files: [
      "src/lib/offline.ts",
      "src/lib/api.ts"
    ],
    description: "Monitors network connection status reactive triggers. Buffers failed mutations (POST, PUT, DELETE) to localStorage, and replays them sequentially upon network recovery."
  },
  {
    id: "ai",
    name: "Capacitor Speech Recognition",
    type: "ai",
    tech: "Capacitor Speech-to-Text plugin, Custom parser",
    role: "Captures microphone audio, performs local transcription, and extracts amounts, category tags, and dates.",
    files: [
      "src/app/dashboard/add/page.tsx",
      "src/app/dashboard/edit/page.tsx"
    ],
    description: "Invokes native Android/iOS speech synthesis and recognizer through Capacitor plugins. Passes text stream to an NLP keyword extractor."
  },
  {
    id: "backend",
    name: "Node.js REST API",
    type: "backend",
    tech: "Node.js, Express, JSON Web Tokens, Mongoose",
    role: "Validates auth headers, processes transactions CRUD, auto-groups categories, and parses locations.",
    files: [
      "server/src/index.js",
      "server/src/routes/transactions.js",
      "server/src/models/Transaction.js"
    ],
    description: "The API backend. Decodes JWT headers, runs transaction calculations, performs CRUD actions, and connects to MongoDB."
  },
  {
    id: "database",
    name: "MongoDB Database",
    type: "database",
    tech: "MongoDB Atlas Cloud Cluster, Mongoose schemas",
    role: "Persistent document storage for user profiles, categories, configurations, and transaction ledgers.",
    files: [
      "server/src/models/Transaction.js",
      "server/src/models/Category.js"
    ],
    description: "Document-based database. Implements indexes on date fields for fast range queries, and subdocument arrays for subcategories."
  }
];

type LifecycleStep = {
  title: string;
  desc: string;
  source: string;
  dest: string;
  file: string;
  code: string;
  payload?: string;
  response?: string;
};

type LifecycleSimulator = {
  id: string;
  name: string;
  description: string;
  steps: LifecycleStep[];
};

const LIFECYCLE_SIMULATORS: LifecycleSimulator[] = [
  {
    id: "online_add",
    name: "Add Transaction (Online Flow)",
    description: "Normal API operation flow. The transaction is validated locally, sent to the server, and saved to MongoDB.",
    steps: [
      {
        title: "1. Form submission & state check",
        desc: "The client handles standard key inputs, validates that amount > 0, and checks network connectivity.",
        source: "Client Form Component",
        dest: "Zustand / React Query",
        file: "src/app/dashboard/add/page.tsx",
        code: `const handleSubmit = async (e) => {
  e.preventDefault();
  const payload = { amount, categoryId, description, date, paymentMode };
  quickAddMutation.mutate(payload);
};`,
        payload: `{
  "amount": 250,
  "description": "Lunch with colleagues",
  "categoryId": "cat_food_123",
  "paymentMode": "UPI"
}`
      },
      {
        title: "2. Axios Network Interception",
        desc: "Axios client appends the user's JWT Authorization token from localStorage to the headers.",
        source: "Axios client",
        dest: "Express API Backend",
        file: "src/lib/api.ts",
        code: `api.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('lumina_user'))?.token;
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});`
      },
      {
        title: "3. Express Authentication & Payload Check",
        desc: "Backend API decodes the Authorization Bearer header, sets req.user.id, and validates inputs.",
        source: "Express Router Middleware",
        dest: "Transaction Controller",
        file: "server/src/routes/transactions.js",
        code: `router.post('/', authMiddleware, async (req, res) => {
  const { amount, categoryId, description, date } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid Amount" });
  }
  // Proceed to database controller...
});`
      },
      {
        title: "4. Mongoose MongoDB Document Insertion",
        desc: "Mongoose maps inputs to the transaction schema and writes a new document in MongoDB.",
        source: "Mongoose Driver",
        dest: "MongoDB Atlas Cluster",
        file: "server/src/models/Transaction.js",
        code: `const transaction = new Transaction({
  user: req.user.id,
  amount,
  category: categoryId,
  description,
  date: date || new Date()
});
const savedTx = await transaction.save();
res.status(201).json(savedTx);`,
        response: `{
  "_id": "tx_987654",
  "user": "user_id_456",
  "amount": 250,
  "description": "Lunch with colleagues",
  "category": "cat_food_123",
  "date": "2026-07-18T14:20:00.000Z",
  "createdAt": "2026-07-18T14:20:15.000Z"
}`
      },
      {
        title: "5. Frontend Cache Invalidation",
        desc: "React Query triggers onSuccess, invalidates cached ledger statistics, and updates the local state query.",
        source: "React Query Mutation",
        dest: "Client DOM view",
        file: "src/app/dashboard/page.tsx",
        code: `onSuccess: (data) => {
  toast.success(\`Logged: \${data.description} - ₹\${data.amount}\`);
  queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
}`
      }
    ]
  },
  {
    id: "offline_sync",
    name: "Add Transaction (Offline Queue Flow)",
    description: "Simulates network loss. The transaction is captured locally, queued in localStorage, and replayed once network is restored.",
    steps: [
      {
        title: "1. API call fails & interceptor catches error",
        desc: "The network is disconnected. Axios interceptor catches the ENOTFOUND / timeout error.",
        source: "Axios request",
        dest: "Offline Queue Handler",
        file: "src/lib/api.ts",
        code: `api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!navigator.onLine || error.message === 'Network Error') {
      return handleOfflineRequest(error.config);
    }
    return Promise.reject(error);
  }
);`
      },
      {
        title: "2. Queue write to Local Storage",
        desc: "The request configuration is saved into a buffered array in localStorage. Client view gets immediate fallback.",
        source: "Offline Queue Engine",
        dest: "localStorage buffer",
        file: "src/lib/offline.ts",
        code: `export function queueOfflineRequest(url, method, data) {
  const queue = JSON.parse(localStorage.getItem('offline_requests_queue') || '[]');
  queue.push({ id: Date.now(), url, method, data });
  localStorage.setItem('offline_requests_queue', JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-interaction'));
}`
      },
      {
        title: "3. Connection monitoring & trigger",
        desc: "A window event listener detects the network state recovery and triggers the replay loop.",
        source: "Window listener",
        dest: "Queue Replay Engine",
        file: "src/lib/offline.ts",
        code: `window.addEventListener('online', () => {
  toast.info("Connection restored. Syncing local operations...");
  processOfflineQueue();
});`
      },
      {
        title: "4. Sequential Replay Loop",
        desc: "Replay engine iterates the queue, triggers identical POST requests, and clears local storage items.",
        source: "Queue Processor",
        dest: "Express API Backend",
        file: "src/lib/offline.ts",
        code: `for (const request of queue) {
  try {
    await api({ url: request.url, method: request.method, data: request.data });
    removeRequestFromQueue(request.id);
  } catch (err) {
    break; // halt sequence if server remains down
  }
}`
      }
    ]
  },
  {
    id: "voice_ai",
    name: "Voice AI Dictation Logging Flow",
    description: "Speech-to-text integration. Native microphone recording parses numerical values, category filters, and comments.",
    steps: [
      {
        title: "1. Speech-to-Text invocation",
        desc: "Capacitor Speech Recognition plugin is activated. The client streams microphone audio into text buffers.",
        source: "Microphone Stream",
        dest: "Capacitor speech plugin",
        file: "src/app/dashboard/add/page.tsx",
        code: `const startListening = async () => {
  await SpeechRecognition.start({
    language: "en-US",
    maxResults: 1,
    partialResults: false
  });
};`
      },
      {
        title: "2. Native callback returns transcript",
        desc: "The Android/iOS voice engines transcribe audio to string, returning raw text outputs.",
        source: "Speech recognizer callback",
        dest: "NLP Keyword Extractor",
        file: "src/app/dashboard/add/page.tsx",
        code: `SpeechRecognition.addListener("listeningState", (result) => {
  if (result.matches) {
    const rawText = result.matches[0]; // e.g. "spent 500 rupees for fuel yesterday"
    parseVoiceInput(rawText);
  }
});`
      },
      {
        title: "3. Natural Language parser logic",
        desc: "Extracts regex matches for digits (Amount), checks categories mapping lists (Category), and captures details.",
        source: "Regex Extractor",
        dest: "Form Input fields",
        file: "src/app/dashboard/add/page.tsx",
        code: `const parseVoiceInput = (text) => {
  const amountMatch = text.match(/\\d+/); // extracts "500"
  const dateMatch = checkDateKeywords(text); // extracts yesterday
  const category = matchCategoryKeywords(text, categoriesList); // match "fuel" -> Transport
  setAmount(amountMatch[0]);
  setCategoryId(category._id);
};`
      }
    ]
  }
];

export default function SystemDesignPage() {
  const { radius } = useThemeStore();
  const pillRoundness = radius === 0 ? "rounded-none" : "rounded-full";
  const cardRoundness = radius === 0 ? "rounded-none" : "rounded-3xl";
  const buttonRoundness = radius === 0 ? "rounded-none" : "rounded-xl";

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"architecture" | "lifecycles" | "schemas">("architecture");
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(ARCHITECTURE_NODES[0]);
  
  const [selectedSimulator, setSelectedSimulator] = useState<LifecycleSimulator>(LIFECYCLE_SIMULATORS[0]);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentStep = selectedSimulator.steps[activeStepIdx];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-12">
      
      {/* Header Row */}
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className={`w-12 h-12 bg-card flex items-center justify-center border border-border/50 shadow-sm hover:bg-accent transition-colors shrink-0 \${pillRoundness}`}
        >
          <ArrowLeft className="text-foreground w-5 h-5" />
        </Link>
        <div className="text-left">
          <h2 className="font-heading text-lg font-bold text-foreground">System Design</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Interactive Architecture & Lifecycles</p>
        </div>
      </header>

      {/* Tabs Selector */}
      <div className={`flex bg-card border border-border p-1 \${buttonRoundness}`}>
        {(["architecture", "lifecycles", "schemas"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase transition-all duration-300 \${buttonRoundness} \${
              activeTab === tab 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "architecture" ? "Architecture" : tab === "lifecycles" ? "Request Lifecycles" : "Data Schemas"}
          </button>
        ))}
      </div>

      {/* TAB 1: ARCHITECTURE DIAGRAM */}
      {activeTab === "architecture" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className={`p-5 bg-card border border-border \${cardRoundness} space-y-4`}>
            <h3 className="font-heading text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Visual Architecture Nodes
            </h3>
            
            {/* Interactive Graph Display */}
            <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 py-8 border border-dashed border-border/60 rounded-2xl bg-accent/10 px-4 min-h-[300px]">
              
              {/* Frontend Node */}
              <button 
                onClick={() => setSelectedNode(ARCHITECTURE_NODES.find(n => n.id === "frontend") || null)}
                className={`w-36 p-3 flex flex-col items-center bg-card border text-center transition-all \${buttonRoundness} \${
                  selectedNode?.id === "frontend" ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Cpu className="w-5 h-5 text-primary mb-1.5" />
                <span className="text-[10px] font-bold text-foreground truncate max-w-full">Next.js client</span>
                <span className="text-[8px] text-muted-foreground uppercase mt-0.5 px-2 py-0.5 rounded-full bg-accent">Frontend</span>
              </button>

              <div className="hidden md:flex items-center text-muted-foreground/40 font-mono text-xs">
                <ArrowRightLeft className="w-5 h-5 animate-pulse" />
              </div>

              <div className="flex flex-row md:flex-col items-center gap-4">
                {/* Offline Queue Node */}
                <button 
                  onClick={() => setSelectedNode(ARCHITECTURE_NODES.find(n => n.id === "offline") || null)}
                  className={`w-36 p-3 flex flex-col items-center bg-card border text-center transition-all \${buttonRoundness} \${
                    selectedNode?.id === "offline" ? "border-amber-400 ring-2 ring-amber-400/20 scale-105" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <WifiOff className="w-5 h-5 text-amber-400 mb-1.5" />
                  <span className="text-[10px] font-bold text-foreground truncate max-w-full">Offline Queue</span>
                  <span className="text-[8px] text-muted-foreground uppercase mt-0.5 px-2 py-0.5 rounded-full bg-accent">Buffer Layer</span>
                </button>

                {/* Voice AI Node */}
                <button 
                  onClick={() => setSelectedNode(ARCHITECTURE_NODES.find(n => n.id === "ai") || null)}
                  className={`w-36 p-3 flex flex-col items-center bg-card border text-center transition-all \${buttonRoundness} \${
                    selectedNode?.id === "ai" ? "border-cyan-400 ring-2 ring-cyan-400/20 scale-105" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <Mic className="w-5 h-5 text-cyan-400 mb-1.5" />
                  <span className="text-[10px] font-bold text-foreground truncate max-w-full">Capacitor Speech</span>
                  <span className="text-[8px] text-muted-foreground uppercase mt-0.5 px-2 py-0.5 rounded-full bg-accent">Speech AI</span>
                </button>
              </div>

              <div className="hidden md:flex items-center text-muted-foreground/40 font-mono text-xs">
                <ArrowRightLeft className="w-5 h-5 animate-pulse" />
              </div>

              {/* Express Backend Node */}
              <button 
                onClick={() => setSelectedNode(ARCHITECTURE_NODES.find(n => n.id === "backend") || null)}
                className={`w-36 p-3 flex flex-col items-center bg-card border text-center transition-all \${buttonRoundness} \${
                  selectedNode?.id === "backend" ? "border-indigo-400 ring-2 ring-indigo-400/20 scale-105" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Server className="w-5 h-5 text-indigo-400 mb-1.5" />
                <span className="text-[10px] font-bold text-foreground truncate max-w-full">Express.js API</span>
                <span className="text-[8px] text-muted-foreground uppercase mt-0.5 px-2 py-0.5 rounded-full bg-accent">Backend</span>
              </button>

              <div className="hidden md:flex items-center text-muted-foreground/40 font-mono text-xs">
                <ArrowRightLeft className="w-5 h-5 animate-pulse" />
              </div>

              {/* MongoDB Node */}
              <button 
                onClick={() => setSelectedNode(ARCHITECTURE_NODES.find(n => n.id === "database") || null)}
                className={`w-36 p-3 flex flex-col items-center bg-card border text-center transition-all \${buttonRoundness} \${
                  selectedNode?.id === "database" ? "border-emerald-400 ring-2 ring-emerald-400/20 scale-105" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Database className="w-5 h-5 text-emerald-400 mb-1.5" />
                <span className="text-[10px] font-bold text-foreground truncate max-w-full">MongoDB Database</span>
                <span className="text-[8px] text-muted-foreground uppercase mt-0.5 px-2 py-0.5 rounded-full bg-accent">Data Layer</span>
              </button>

            </div>
          </div>

          {/* Node Specification Details */}
          {selectedNode && (
            <div className={`p-6 bg-card border border-border \${cardRoundness} space-y-4 animate-in slide-in-from-top-4 duration-300`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/40 rounded-xl">
                  {selectedNode.type === "frontend" && <Cpu className="w-5 h-5 text-primary" />}
                  {selectedNode.type === "offline" && <WifiOff className="w-5 h-5 text-amber-400" />}
                  {selectedNode.type === "ai" && <Mic className="w-5 h-5 text-cyan-400" />}
                  {selectedNode.type === "backend" && <Server className="w-5 h-5 text-indigo-400" />}
                  {selectedNode.type === "database" && <Database className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="text-left">
                  <h3 className="font-heading font-black text-sm text-foreground">{selectedNode.name}</h3>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">{selectedNode.type} System Spec</span>
                </div>
              </div>

              <div className="space-y-3.5 border-t border-border/50 pt-4 text-left text-xs">
                <div>
                  <h4 className="font-bold text-foreground mb-1">Functional Role</h4>
                  <p className="text-muted-foreground leading-relaxed">{selectedNode.role}</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1 font-mono">Tech Stack & Middleware</h4>
                  <p className="text-muted-foreground leading-relaxed font-mono">{selectedNode.tech}</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1">Architecture Implementation</h4>
                  <p className="text-muted-foreground leading-relaxed">{selectedNode.description}</p>
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-1.5">Key File Boundaries</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.files.map(f => (
                      <span key={f} className="font-mono text-[9px] font-semibold bg-accent px-2.5 py-1 border border-border/40 text-muted-foreground rounded-md">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUEST LIFECYCLES */}
      {activeTab === "lifecycles" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Simulation Selector Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            {LIFECYCLE_SIMULATORS.map((sim) => (
              <button
                key={sim.id}
                onClick={() => { setSelectedSimulator(sim); setActiveStepIdx(0); }}
                className={`flex-1 p-4 border text-left flex flex-col justify-center transition-all \${buttonRoundness} \${
                  selectedSimulator.id === sim.id 
                    ? "bg-card border-primary ring-2 ring-primary/10 shadow-sm" 
                    : "bg-card/45 border-border hover:bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Play className={`w-3.5 h-3.5 \${selectedSimulator.id === sim.id ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-heading font-black text-xs text-foreground">{sim.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{sim.description}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Step-by-Step Flow List */}
            <div className={`p-5 bg-card border border-border \${cardRoundness} space-y-4`}>
              <h3 className="font-heading text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" /> Lifecycle Steps
              </h3>
              
              <div className="flex flex-col gap-3 relative text-left">
                {selectedSimulator.steps.map((step, idx) => {
                  const isActive = activeStepIdx === idx;
                  const isPassed = activeStepIdx > idx;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveStepIdx(idx)}
                      className={`flex items-start gap-4 p-3.5 border transition-all \${buttonRoundness} \${
                        isActive 
                          ? "bg-accent/40 border-primary" 
                          : isPassed 
                            ? "bg-card border-emerald-500/20 opacity-80" 
                            : "bg-card/30 border-border/50"
                      }`}
                    >
                      <div className="mt-0.5">
                        {isPassed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black font-mono border \${
                            isActive ? "bg-primary border-primary text-black" : "bg-accent border-border text-muted-foreground"
                          }`}>
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-tight \${isActive ? "text-foreground" : "text-foreground/80"}`}>{step.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Workspace Terminal */}
            <div className={`p-5 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-4 font-mono overflow-hidden shadow-2xl relative min-h-[400px]`}>
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-md">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>IDE: {currentStep.file.split('/').pop()}</span>
                </div>
              </div>

              <div className="space-y-4 text-left">
                {/* File boundary path */}
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">File Context</span>
                  <span className="text-xs text-primary font-bold">{currentStep.file}</span>
                </div>

                {/* Code Block */}
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Execution Code Segment</span>
                  <pre className="text-[10px] bg-zinc-900/50 p-3 rounded-lg border border-zinc-900 text-zinc-300 overflow-x-auto select-all leading-normal whitespace-pre-wrap">
                    <code>{currentStep.code}</code>
                  </pre>
                </div>

                {/* Optional Payload Data */}
                {currentStep.payload && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5"><Code className="w-3 h-3 text-cyan-400" /> Request Payload (Body)</span>
                    <pre className="text-[10px] bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900/60 text-cyan-400 overflow-x-auto">
                      <code>{currentStep.payload}</code>
                    </pre>
                  </div>
                )}

                {/* Optional Response Output */}
                {currentStep.response && (
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5"><Eye className="w-3 h-3 text-emerald-400" /> Response Response Data</span>
                    <pre className="text-[10px] bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900/60 text-emerald-400 overflow-x-auto">
                      <code>{currentStep.response}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: DATA SCHEMAS */}
      {activeTab === "schemas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300 text-left">
          
          {/* Schema 1: Transaction Model */}
          <div className={`p-6 bg-card border border-border \${cardRoundness} space-y-4 shadow-sm`}>
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2.5 bg-accent/40 rounded-xl text-primary"><Database className="w-5 h-5" /></div>
              <div>
                <h3 className="font-heading font-black text-sm text-foreground">Transaction Schema</h3>
                <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Mongoose Document Structure</span>
              </div>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">user</span>
                <span className="text-primary font-mono font-semibold">ObjectId</span>
                <span className="text-muted-foreground">Reference: 'User' (Required)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">amount</span>
                <span className="text-primary font-mono font-semibold">Number</span>
                <span className="text-muted-foreground">Value &gt; 0 (Required)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">category</span>
                <span className="text-primary font-mono font-semibold">ObjectId</span>
                <span className="text-muted-foreground">Reference: 'Category' (Required)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">description</span>
                <span className="text-primary font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Details / Merchant label</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">date</span>
                <span className="text-primary font-mono font-semibold">Date</span>
                <span className="text-muted-foreground">Defaults to Date.now()</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">paymentMode</span>
                <span className="text-primary font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Default: 'CASH' (Required)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5">
                <span className="font-bold text-foreground">subPaymentMode</span>
                <span className="text-primary font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Optional detailed reference</span>
              </div>
            </div>
          </div>

          {/* Schema 2: Category Model */}
          <div className={`p-6 bg-card border border-border \${cardRoundness} space-y-4 shadow-sm`}>
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2.5 bg-accent/40 rounded-xl text-indigo-400"><Database className="w-5 h-5" /></div>
              <div>
                <h3 className="font-heading font-black text-sm text-foreground">Category Schema</h3>
                <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Mongoose Document Structure</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">name</span>
                <span className="text-indigo-400 font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Category label (Required, Unique)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">icon</span>
                <span className="text-indigo-400 font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Material Icon Identifier</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">color</span>
                <span className="text-indigo-400 font-mono font-semibold">String</span>
                <span className="text-muted-foreground">Hex color mapping code</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">type</span>
                <span className="text-indigo-400 font-mono font-semibold">String</span>
                <span className="text-muted-foreground">'expense' | 'income' (Required)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border/30">
                <span className="font-bold text-foreground">isSystem</span>
                <span className="text-indigo-400 font-mono font-semibold">Boolean</span>
                <span className="text-muted-foreground">Locked config template (Default: false)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5">
                <span className="font-bold text-foreground">subcategories</span>
                <span className="text-indigo-400 font-mono font-semibold">Array</span>
                <span className="text-muted-foreground">List of Subcategory Subdocuments</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
