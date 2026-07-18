'use client';

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save, MapPin, Mic, MessageSquare, Sparkles, Cpu } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import AmountInput from "@/components/AmountInput";
import VoiceWaveform from "@/components/VoiceWaveform";
import api from "@/lib/api";
import { toLocalDateTimeLocal, fromLocalDateTimeLocal } from "@/lib/dateUtils";
import { Geolocation } from "@capacitor/geolocation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";

const TEMPLATES = {
  expense: [
    { label: "☕ Coffee", amount: 50, description: "Coffee", categoryKeyword: "Food" },
    { label: "🚇 Metro", amount: 30, description: "Metro travel", categoryKeyword: "Transport" },
    { label: "🛒 Groceries", amount: 500, description: "Groceries", categoryKeyword: "Groceries" },
    { label: "🍔 Food", amount: 200, description: "Lunch/Dinner", categoryKeyword: "Food" },
    { label: "🍿 Movie", amount: 350, description: "Movie ticket", categoryKeyword: "Entertainment" },
    { label: "⛽ Fuel", amount: 1000, description: "Fuel refuel", categoryKeyword: "Transport" }
  ],
  income: [
    { label: "💼 Salary", amount: 50000, description: "Monthly Salary", categoryKeyword: "Salary" },
    { label: "📈 Bonus", amount: 5000, description: "Performance Bonus", categoryKeyword: "Bonus" },
    { label: "🤝 Freelance", amount: 10000, description: "Freelance Work", categoryKeyword: "Freelance" },
    { label: "🎁 Gift", amount: 1000, description: "Gift money", categoryKeyword: "Gift" }
  ]
};

function AddTransactionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { radius } = useThemeStore();
  const pillRoundness = radius === 0 ? "rounded-none" : "rounded-full";

  // Selected State
  const initialType = (searchParams.get('type') as "expense" | "income") || "expense";
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toLocalDateTimeLocal(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [subPaymentMode, setSubPaymentMode] = useState("");
  const [locationObj, setLocationObj] = useState<{ lat: number, lng: number, address: string } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Voice AI & SMS Parsing States
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [journeyType, setJourneyType] = useState<"voice" | "message">("voice");
  const [smsPasteText, setSmsPasteText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const recognitionRef = useRef<any>(null);
  const templateAppliedRef = useRef(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = (msg: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const rawSms = searchParams.get('sms');
    if (rawSms) {
      handleParseText(rawSms, "message");
    }
    const voiceMode = searchParams.get('voice');
    if (voiceMode === 'true') {
      startVoiceRecognition();
    }
  }, [searchParams]);

  const handleApplyTemplate = (clip: { label: string; amount: number; description: string; categoryKeyword: string }) => {
    setAmount(clip.amount.toString());
    setDescription(clip.description);
    
    // Find matching category
    const match = (categories || []).find((c: any) => 
      c.name.toLowerCase().includes(clip.categoryKeyword.toLowerCase()) ||
      clip.categoryKeyword.toLowerCase().includes(c.name.toLowerCase())
    );
    
    if (match) {
      setCategoryId(match._id);
      if (match.subcategories && match.subcategories.length > 0) {
        setSubcategoryId(match.subcategories[0]._id);
      } else {
        setSubcategoryId("");
      }
    } else {
      setCategoryId("");
      setSubcategoryId("");
    }
    
    toast.success(`Applied template: ${clip.description} - ₹${clip.amount}`);
  };

  const handleParseText = async (text: string, source: "voice" | "message" = "message") => {
    try {
      setIsParsing(true);
      if (source === "message") {
        setJourneyType("message");
        setDebugLogs([]);
        addDebugLog("Message parsing triggered.");
      }
      addDebugLog(`Parsing Started. Spoken/SMS Text: "${text}"`);
      addDebugLog(`Querying Endpoint: ${api.defaults.baseURL || "/api"}/transactions/parse`);

      setDebugData((prev: any) => ({
        ...prev,
        status: "Querying API...",
        transcription: text,
        apiUrl: `${api.defaults.baseURL || "/api"}/transactions/parse`,
        parserUsed: undefined
      }));

      const res = await api.post('/transactions/parse', { text });
      const data = res.data;
      
      addDebugLog(`API Request Success! Parser Engine: ${data.parserUsed || "Unknown"}`);
      if (data.geminiError) {
        addDebugLog(`GEMINI API ERROR: "${data.geminiError}"`);
      }
      addDebugLog(`Parsed JSON payload: ${JSON.stringify(data)}`);

      setDebugData((prev: any) => ({
        ...prev,
        status: "Success",
        response: data,
        parserUsed: data.parserUsed || "Unknown",
        geminiError: data.geminiError
      }));

      if (data) {
        addDebugLog(`Applying parsed details to UI...`);
        if (data.type) setType(data.type);
        if (data.amount) setAmount(data.amount.toString());
        if (data.description) setDescription(data.description);
        if (data.category) setCategoryId(data.category);
        if (data.subcategory) setSubcategoryId(data.subcategory);
        if (data.paymentMode) setPaymentMode(data.paymentMode);
        if (data.subPaymentMode) setSubPaymentMode(data.subPaymentMode);
      }
    } catch (e: any) {
      console.error("NLP parsing failed", e);
      const errMsg = e.message || (e.response?.data?.message) || JSON.stringify(e);
      addDebugLog(`API Request Failed. Error: ${errMsg}`);
      
      setDebugData((prev: any) => ({
        ...prev,
        status: "Error",
        error: errMsg
      }));
    } finally {
      setIsParsing(false);
    }
  };

  const startVoiceRecognition = async () => {
    // Clear logs for fresh run
    setJourneyType("voice");
    setDebugLogs([]);
    addDebugLog("Voice logging triggered.");

    let retryCount = 0;
    const maxRetries = 2;

    const runRecognition = async () => {
      // 300ms safety delay to allow native Android SpeechRecognizer to fully close from any previous session
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Detect if running inside a Capacitor native app
      const isCapacitor = typeof window !== 'undefined' && 
        (window.location.origin.startsWith('capacitor://') || 
        (window.location.hostname === 'localhost' && !window.location.port));

      if (isCapacitor) {
        try {
          addDebugLog(`Starting native listener (Attempt ${retryCount + 1}/${maxRetries + 1})...`);
          
          addDebugLog("Loading @capacitor-community/speech-recognition dynamic import...");
          const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
          addDebugLog("SpeechRecognition plugin loaded successfully.");

          setDebugData({ status: "Requesting native device permissions..." });
          addDebugLog("Requesting native Android microphone & speech permissions...");
          
          const perm = await SpeechRecognition.requestPermissions();
          addDebugLog(`Permissions response payload: ${JSON.stringify(perm)}`);

          if (perm.speechRecognition !== 'granted') {
            toast.error("Speech Recognition permission denied.");
            setDebugData({ status: "Error", error: "Permission Denied: Speech recognition status is " + perm.speechRecognition });
            addDebugLog(`Permission denied. Aborting voice session.`);
            return;
          }

          addDebugLog("Permissions granted. Checking recognizer availability...");
          const { available } = await SpeechRecognition.available();
          addDebugLog(`Recognizer availability response: ${available}`);

          if (!available) {
            toast.error("Native Speech recognition is not available on this device.");
            setDebugData({ status: "Error", error: "Native SpeechRecognition.available() returned false" });
            addDebugLog("Speech recognizer is offline or not available. Aborting.");
            return;
          }

          setIsRecording(true);
          setDebugData({ status: "Listening... speak now." });
          addDebugLog("Invoking SpeechRecognition.start() on device...");

          // Setup clean listeners before starting
          await SpeechRecognition.removeAllListeners();
          addDebugLog("Cleaned up old speech listeners.");

          SpeechRecognition.addListener('listeningState', (status: any) => {
            addDebugLog(`Listener: listeningState event fired. Status: ${status.status}`);
            setDebugData((prev: any) => ({
              ...prev,
              status: `Listening status: ${status.status}`
            }));

            if (status.status === 'started') {
              // Subtle haptic buzz to notify the user the microphone is open and listening
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(80);
              }
            }

            if (status.status === 'stopped' || status.status === 'error') {
              setIsRecording(false);
            }
          });

          const result = await SpeechRecognition.start({
            language: 'en-IN',
            maxResults: 1,
            prompt: 'Speak your transaction...',
            partialResults: false,
            popup: false,
          });
          addDebugLog(`SpeechRecognition.start() resolved. Result payload: ${JSON.stringify(result)}`);

          if (result && result.matches && result.matches.length > 0) {
            const transcript = result.matches[0];
            setDebugData((prev: any) => ({
              ...prev,
              status: "Speech captured",
              transcription: transcript
            }));
            handleParseText(transcript, "voice");
          } else {
            throw new Error("No match");
          }

        } catch (err: any) {
          const errMsg = err.message || JSON.stringify(err) || "Unknown error";
          addDebugLog(`Recognition failed (Attempt ${retryCount + 1}): "${errMsg}"`);

          // 1. Differentiate user silence vs speech-not-understood (not critical code errors)
          if (errMsg.includes("No speech input")) {
            setIsRecording(false);
            toast.info("No speech detected. Tap the mic and speak your transaction.");
            setDebugData({ status: "Idle", error: "No speech detected" });
            addDebugLog("Speech recognition stopped: User remained silent (No speech input).");
            return;
          }

          if (errMsg.includes("No match")) {
            setIsRecording(false);
            toast.info("Couldn't understand your voice. Please speak clearly.");
            setDebugData({ status: "Idle", error: "Voice could not be matched" });
            addDebugLog("Speech recognition stopped: User spoke but voice couldn't be matched (No match).");
            return;
          }

          // 2. Retry ONLY on transient native engine locks (busy / collision)
          const isTransient = errMsg.includes("Didn't understand") || 
                              errMsg.includes("Client side error") ||
                              errMsg.includes("busy");

          if (isTransient && retryCount < maxRetries) {
            retryCount++;
            addDebugLog(`Transient lock detected. Auto-retrying in 400ms...`);
            await runRecognition();
          } else {
            setIsRecording(false);
            console.error("Capacitor Speech Recognition Error:", err);
            toast.error(`System error: ${errMsg}`);
            setDebugData({ status: "Error", error: errMsg });
            addDebugLog(`CRITICAL: SpeechRecognition aborted after ${retryCount + 1} attempts. error: "${errMsg}"`);
          }
        }
        return;
      }

      // Standard HTML5 browser fallback (webkitSpeechRecognition)
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        alert("Speech recognition is not supported on this browser.");
        return;
      }

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === "no-speech") {
          toast.info("No speech detected. Please speak clearly.");
        } else if (event.error === "not-allowed") {
          toast.error("Microphone access denied. Enable it in your browser settings.");
        } else if (event.error === "aborted") {
          // 'aborted' occurs when manually stopping the recognition or navigating away; ignore it.
          console.log("Speech recognition aborted.");
        } else {
          console.error("Speech recognition error:", event.error);
          toast.error(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleParseText(transcript);
      };

      recognition.start();
    };

    await runRecognition();
  };


  const stopVoiceRecognition = async () => {
    setIsRecording(false);
    const isCapacitor = typeof window !== 'undefined' && 
      (window.location.origin.startsWith('capacitor://') || 
      (window.location.hostname === 'localhost' && !window.location.port));

    if (isCapacitor) {
      try {
        const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
        await SpeechRecognition.stop();
      } catch (err) {
        console.error("Failed to stop native voice recognition", err);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  // Auto-fetch location on mount
  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      try {
        setIsFetchingLocation(true);
        // On mobile, this will trigger the system permission popup if not already granted
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });

        if (!mounted) return;
        const { latitude, longitude } = position.coords;
        
        try {
          // Optional: Reverse geocode to get a readable name (fallback to lat,lon)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const place = data.address?.city || data.address?.town || data.address?.village || data.address?.state || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationObj({ lat: latitude, lng: longitude, address: place });
        } catch (e) {
          setLocationObj({ lat: latitude, lng: longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
        }
      } catch (error: any) {
        if (!mounted) return;
        console.warn("Location error:", error.message || "Denied/Unavailable");
      } finally {
        if (mounted) setIsFetchingLocation(false);
      }
    };

    fetchLocation();
    return () => { mounted = false; };
  }, []);

  const { data: categories, isLoading: isLoadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    }
  });

  useEffect(() => {
    const templateName = searchParams.get('template');
    const templateAmountStr = searchParams.get('amount');
    if (templateName && templateAmountStr && categories && categories.length > 0 && !templateAppliedRef.current) {
      templateAppliedRef.current = true;
      const amt = Number(templateAmountStr) || 0;
      const tempClip = {
        label: templateName,
        amount: amt,
        description: templateName,
        categoryKeyword: templateName
      };
      handleApplyTemplate(tempClip);
    }
  }, [searchParams, categories]);

  const { data: paymentModes = [], isLoading: isLoadingPayModes } = useQuery<any[]>({
    queryKey: ['paymentModes'],
    queryFn: async () => {
      const response = await api.get('/payment-modes');
      return response.data || [];
    }
  });

  const filteredCategories = (categories || []).filter((c: any) => c.type === type);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/transactions', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      router.push('/dashboard');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || "Failed to add transaction");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = amount.split('+').reduce((sum, val) => sum + (Number(val) || 0), 0);
    if (!finalAmount || !categoryId) return alert("Please fill amount and category");

    mutation.mutate({
      type,
      amount: finalAmount,
      description,
      date: fromLocalDateTimeLocal(date).toISOString(),
      category: categoryId,
      subcategory: subcategoryId || undefined,
      location: locationObj || undefined,
      paymentMode,
      subPaymentMode: subPaymentMode || undefined,
    });
  };

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom duration-500">

      {/* Header Info */}
      <header className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className={`w-12 h-12 bg-card flex items-center justify-center border border-border/50 shadow-sm hover:bg-accent transition-colors shrink-0 ${pillRoundness}`}
        >
          <ArrowLeft className="text-foreground w-5 h-5" />
        </Link>

        {/* Type Toggle */}
        <div className={`flex p-1 bg-muted flex-1 ${pillRoundness} border border-border/20`}>
          <button
            type="button"
            onClick={() => { setType('expense'); setCategoryId(""); }}
            className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all duration-300 ${pillRoundness} ${type === 'expense' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => { setType('income'); setCategoryId(""); }}
            className={`flex-1 py-2.5 px-4 text-sm font-medium transition-all duration-300 ${pillRoundness} ${type === 'income' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Income
          </button>
        </div>
      </header>

      {/* Quick-Add Chips Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 -mx-6 px-6 no-scrollbar scroll-smooth">
         {(type === 'expense' ? TEMPLATES.expense : TEMPLATES.income).map((clip) => (
            <button
              key={clip.label}
              type="button"
              onClick={() => handleApplyTemplate(clip)}
              className={`bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-accent px-3.5 py-1.5 text-xs text-foreground font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 shadow-sm ${pillRoundness}`}
            >
              <span>{clip.label}</span>
              <span className="text-[10px] text-muted-foreground font-bold">₹{clip.amount}</span>
            </button>
         ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Amount with Voice AI Mic */}
        <div className="group relative flex flex-col items-center">
          <label className="block font-medium text-xs text-muted-foreground mb-1.5 uppercase text-center">
            Amount
          </label>
          <AmountInput 
            value={amount} 
            onChange={setAmount} 
            autoFocus={user?.settings?.autoOpenKeyboard ?? true} 
          />
          
          <button
            type="button"
            onClick={isRecording ? stopVoiceRecognition : startVoiceRecognition}
            className={`relative mt-1.5 h-12 flex items-center justify-center border transition-all duration-500 ease-in-out active:scale-95 ${pillRoundness} ${
              isRecording 
                ? "w-48 bg-destructive/10 border-destructive/30 text-destructive shadow-[0_0_25px_rgba(239,68,68,0.2)]" 
                : isParsing 
                  ? "w-12 bg-accent border-primary text-primary" 
                  : "w-12 bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary"
            }`}
            title="Start voice logging"
          >
            {isRecording ? (
              <VoiceWaveform />
            ) : isParsing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          
          {isRecording && (
            <span className="text-[10px] text-destructive font-black uppercase tracking-widest mt-2 animate-pulse">
              Listening...
            </span>
          )}
          {isParsing && !isRecording && (
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mt-2">
              Parsing details with AI...
            </p>
          )}
        </div>

        <div className="w-full rounded-3xl p-6 bg-card border border-border space-y-3 shadow-xl">

          {/* Category Selector */}
          <div className="group relative">
            <div className="flex items-center justify-between mb-3">
              <label className="block font-medium text-xs text-muted-foreground uppercase">
                Category
              </label>
              <Link href="/dashboard/categories" className="text-[10px] font-bold text-primary flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors uppercase tracking-wider">
                Manage
              </Link>
            </div>

            {isLoadingCats ? (
              <div className="h-14 flex items-center justify-center bg-accent rounded-xl"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const chunks = [];
                  const cats = filteredCategories || [];
                  for (let i = 0; i < cats.length; i += 4) {
                    chunks.push(cats.slice(i, i + 4));
                  }
                  
                  return chunks.map((chunk, chunkIdx) => {
                    const activeCat = chunk.find((c: any) => c._id === categoryId);
                    const activeCatIdx = chunk.findIndex((c: any) => c._id === categoryId);
                    const pointerLefts = ["left-[12.5%]", "left-[37.5%]", "left-[62.5%]", "left-[87.5%]"];
                    const leftClass = activeCatIdx !== -1 ? pointerLefts[activeCatIdx] : "";
                    
                    return (
                      <div key={chunkIdx} className="space-y-3.5">
                        <div className="grid grid-cols-4 gap-3">
                          {chunk.map((c: any) => (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => setCategoryId(c._id)}
                              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                                categoryId === c._id 
                                  ? 'bg-accent/40 shadow-sm' 
                                  : 'bg-card/30 border-border/80 hover:bg-card/50'
                              }`}
                              style={categoryId === c._id ? { borderColor: c.color, backgroundColor: `${c.color}15` } : {}}
                            >
                              <div 
                                className={`w-10 h-10 flex items-center justify-center mb-1.5 transition-all duration-300 ${pillRoundness}`}
                                style={{ 
                                  backgroundColor: categoryId === c._id ? `${c.color}22` : `${c.color}0d`,
                                }}
                              >
                                <span 
                                  className="material-symbols-outlined text-lg transition-colors duration-200" 
                                  style={{ color: c.color }}
                                >
                                  {c.icon}
                                </span>
                              </div>
                              <span className="text-[10px] truncate w-full text-center text-muted-foreground font-semibold">{c.name}</span>
                            </button>
                          ))}
                        </div>

                        {activeCat && activeCat.subcategories?.length > 0 && (
                          <div className="relative bg-muted border border-border rounded-[20px] p-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-2.5 mt-2">
                            {/* Triangle pointing to selected category */}
                            <div 
                              className={`absolute top-0 -translate-y-[6.5px] -translate-x-1/2 w-3 h-3 rotate-45 border-t border-l border-border bg-muted ${leftClass}`}
                            />
                            <label className="block font-medium text-[10px] text-muted-foreground uppercase tracking-widest">
                              Sub-Category
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {activeCat.subcategories.map((sub: any) => (
                                <button
                                  key={sub._id}
                                  type="button"
                                  onClick={() => setSubcategoryId(sub._id)}
                                  className={`px-3.5 py-1.5 text-xs font-bold transition-all border ${pillRoundness} ${
                                    subcategoryId === sub._id 
                                      ? 'bg-primary text-black border-primary' 
                                      : 'bg-background dark:bg-zinc-800/60 text-muted-foreground hover:text-foreground border-border/40'
                                  }`}
                                >
                                  {sub.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Description (Optional)
            </label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              placeholder="E.g., Dinner with friends"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="group relative">
            <label className="block font-medium text-xs text-muted-foreground mb-3  uppercase">
              Date
            </label>
            <input
              className="w-full h-14 px-6 bg-accent rounded-xl border-none ring-1 ring-border focus:ring-primary focus:bg-secondary outline-none transition-all duration-300 text-foreground placeholder-muted-foreground/50"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment Mode */}
          <div className="group relative space-y-3">
            <label className="block font-medium text-xs text-muted-foreground uppercase">
              Payment Mode
            </label>
            {isLoadingPayModes ? (
              <div className="h-10 flex items-center justify-center bg-card/50 rounded-xl"><Loader2 className="animate-spin text-muted-foreground w-4 h-4" /></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {paymentModes.map((mode: any) => (
                  <button
                    key={mode._id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(mode.name);
                      setSubPaymentMode("");
                    }}
                    className={`px-4 py-2 text-[11px] font-bold uppercase transition-all cursor-pointer ${pillRoundness} ${
                      paymentMode === mode.name 
                        ? 'bg-foreground text-background shadow-sm' 
                        : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {mode.name}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-Payment Mode Selector */}
            {paymentModes.find((m: any) => m.name === paymentMode)?.subPaymentModes?.length > 0 && (
              <div className="group relative pt-1 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block font-medium text-[10px] text-muted-foreground uppercase mb-2">
                  Sub Payment Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {paymentModes.find((m: any) => m.name === paymentMode)?.subPaymentModes.map((sub: any) => (
                    <button
                      key={sub._id}
                      type="button"
                      onClick={() => setSubPaymentMode(sub.name)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all cursor-pointer ${pillRoundness} ${
                        subPaymentMode === sub.name 
                          ? 'bg-primary text-black shadow-sm' 
                          : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="group relative pt-4 pb-2 border-t border-border mt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className={`p-2 ${pillRoundness} ${isFetchingLocation ? 'bg-primary/20 text-primary animate-pulse' : locationObj ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground'}`}>
                {isFetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-xs uppercase  flex items-center justify-between">
                  Device Location
                  {locationObj && <span className="text-[10px] text-muted-foreground font-mono bg-accent px-1.5 py-0.5 rounded opacity-50">{locationObj.lat.toFixed(2)}, {locationObj.lng.toFixed(2)}</span>}
                </p>
                <p className="text-[11px] truncate mt-0.5">
                  {isFetchingLocation ? "Acquiring GPS fix..." : locationObj ? locationObj.address : "Location access denied or unavailable"}
                </p>
              </div>
            </div>
          </div>

          {/* Web SMS Paste Fallback */}
          <div className="group relative pt-4 pb-2 border-t border-border mt-2">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="text-[10px] uppercase font-bold tracking-widest text-primary hover:underline bg-primary/5 px-3.5 py-2 rounded-xl flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" /> 
                {showPasteBox ? "Hide SMS Paste" : "Paste transaction SMS"}
              </button>
            </div>

            {showPasteBox && (
              <div className="bg-accent/40 rounded-2xl p-4 border border-border mt-3 space-y-3 animate-in slide-in-from-top-4 duration-300">
                <label className="block text-[9px] uppercase font-black text-muted-foreground tracking-widest">
                  Raw SMS text
                </label>
                <textarea
                  value={smsPasteText}
                  onChange={(e) => setSmsPasteText(e.target.value)}
                  placeholder="Paste HDFC/ICICI debit notification or GPay message details..."
                  rows={3}
                  className="w-full bg-card border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (smsPasteText) {
                      handleParseText(smsPasteText, "message");
                      setSmsPasteText("");
                      setShowPasteBox(false);
                    }
                  }}
                  disabled={isParsing || !smsPasteText}
                  className="w-full bg-primary text-black font-bold py-2.5 rounded-xl text-[10px] uppercase tracking-wider active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isParsing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Auto-Fill Details
                </button>
              </div>
            )}
          </div>

        </div>

        <button
          disabled={mutation.isPending || isParsing}
          className="w-full flex items-center justify-center gap-2 h-16 mt-8 bg-primary text-primary-foreground font-heading font-bold text-lg rounded-xl shadow-[0_12px_24px_-8px_var(--tw-shadow-color)] [--tw-shadow-color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:active:scale-100"
        >
          {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Record {type}
        </button>
      </form>

      {/* Dynamic Debug Console for Android testing */}
      {debugLogs.length > 0 && (
        <div className="w-full mt-8 p-5 rounded-3xl bg-[#131315] border border-border text-zinc-300 font-mono text-[11px] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-[#6bfe9c] font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              {journeyType === "voice" ? (
                <>
                  <Mic className="w-3.5 h-3.5" /> Voice Journey Timeline
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5" /> Message Journey Timeline
                </>
              )}
            </span>
            <button 
              type="button" 
              onClick={() => { setDebugLogs([]); setDebugData(null); }}
              className="text-zinc-500 hover:text-zinc-300 uppercase text-[9px] font-bold"
            >
              Clear Console
            </button>
          </div>
          
          {/* Scrollable Timeline */}
          <div className="bg-black/40 p-3 rounded-xl border border-border max-h-60 overflow-y-auto space-y-1.5">
            {debugLogs.map((log, index) => (
              <div 
                key={index} 
                className={`leading-relaxed break-all ${
                  log.includes("Failed") || log.includes("Error") || log.includes("CRITICAL") || log.includes("denied")
                    ? "text-destructive" 
                    : log.includes("Success") || log.includes("Success!")
                      ? "text-primary"
                      : "text-zinc-400"
                }`}
              >
                {log}
              </div>
            ))}
          </div>

          {debugData && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div>
                <span className="text-muted-foreground font-bold">Summary Status:</span>{" "}
                <span className={debugData.status === "Success" ? "text-primary" : debugData.status === "Error" ? "text-destructive" : "text-primary animate-pulse"}>
                  {debugData.status}
                </span>
              </div>
              {debugData.parserUsed && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-bold">Parser Engine:</span>{" "}
                    <span className="flex items-center gap-1 font-semibold text-zinc-200">
                      {debugData.parserUsed.includes("Gemini") ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                          <span className="text-cyan-400">{debugData.parserUsed}</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-amber-500">{debugData.parserUsed}</span>
                        </>
                      )}
                    </span>
                  </div>
                  {debugData.geminiError && (
                    <div className="text-rose-400 text-[10px] mt-1.5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 max-w-full break-all leading-normal font-sans">
                      <span className="font-bold">Gemini Rejection:</span> {debugData.geminiError}
                    </div>
                  )}
                </div>
              )}
              {debugData.transcription && (
                <div>
                  <span className="text-muted-foreground font-bold">Speech Text:</span>{" "}
                  <span className="text-foreground italic">"{debugData.transcription}"</span>
                </div>
              )}
              {debugData.response && (
                <div className="bg-black/30 p-3 rounded-xl border border-border mt-1.5">
                  <span className="text-muted-foreground font-bold block mb-1.5">Parsed JSON Payload:</span>
                  <pre className="text-[10px] text-[#6bfe9c] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(debugData.response, null, 2)}
                  </pre>
                </div>
              )}
              {debugData.error && (
                <div className="bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-destructive mt-1.5 break-all">
                  <span className="text-destructive font-bold block mb-1.5">Error:</span>
                  {debugData.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function AddTransactionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>}>
      <AddTransactionForm />
    </Suspense>
  );
}
