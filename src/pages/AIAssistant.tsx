import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, Send, Loader2, User, Trash2, Sparkles, FileQuestion,
  Tag, BarChart3, BookOpen, CheckCircle, AlertTriangle, Save,
  PlusCircle, Search
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─── Types ───
type IntentType = "generate_questions" | "classify_question" | "assign_topic" | "system_stats" | "explain_concept" | "general_academic";

interface Message {
  role: "user" | "assistant";
  content: string;
  structured?: boolean;
  data?: any;
  intent?: IntentType;
}

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  choices?: Record<string, string>;
  correct_answer: string;
  difficulty: string;
  bloom_level: string;
  topic: string;
  specialization?: string;
  ai_generated?: boolean;
}

// ─── Action definitions ───
const ACTIONS = [
  {
    id: "generate_questions" as IntentType,
    label: "Generate Questions",
    icon: PlusCircle,
    description: "AI generates structured assessment questions",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "classify_question" as IntentType,
    label: "Classify Question",
    icon: Tag,
    description: "Analyze Bloom's level, difficulty & knowledge dimension",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "assign_topic" as IntentType,
    label: "Assign Topic",
    icon: Search,
    description: "Identify topic, subject & specialization",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "system_stats" as IntentType,
    label: "View Statistics",
    icon: BarChart3,
    description: "Question bank counts, distributions & analytics",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    id: "explain_concept" as IntentType,
    label: "Explain Concept",
    icon: BookOpen,
    description: "Academic explanations & teaching strategies",
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
  },
];

const QUICK_PROMPTS: Record<IntentType, string[]> = {
  generate_questions: [
    "Generate 5 MCQ questions about Photosynthesis",
    "Create 3 True/False questions on Computer Networks",
    "Generate 4 essay questions about World War II",
    "Create 5 identification questions on Data Structures",
  ],
  classify_question: [
    "What is the primary function of the mitochondria in a cell?",
    "Compare and contrast TCP and UDP protocols, providing examples of when each is appropriate.",
    "Solve: If f(x) = 3x² + 2x - 5, find f'(x).",
  ],
  assign_topic: [
    "What are the key differences between SQL and NoSQL databases?",
    "Explain the process of cellular respiration.",
    "Describe the role of the Supreme Court in the government.",
  ],
  system_stats: [
    "How many questions are in the question bank?",
    "Show question distribution by Bloom's level",
    "What are the statistics by subject?",
  ],
  explain_concept: [
    "Explain Bloom's Taxonomy levels with examples",
    "What are effective assessment strategies?",
    "How to create a rubric for essay grading?",
    "Explain the difference between formative and summative assessment",
  ],
  general_academic: [],
};

const SUPABASE_URL = "https://lohmzywgbkntvpuygvfx.supabase.co";
const AI_CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeIntent, setActiveIntent] = useState<IntentType | null>(null);
  const [savingQuestions, setSavingQuestions] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // ─── Generate form state ───
  const [genTopic, setGenTopic] = useState("");
  const [genType, setGenType] = useState("mcq");
  const [genCount, setGenCount] = useState("5");
  const [genDifficulty, setGenDifficulty] = useState("average");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Send message ───
  const sendMessage = useCallback(async (text: string, intent?: IntentType) => {
    if (!text.trim() || isLoading) return;

    const resolvedIntent = intent || activeIntent || undefined;
    const userMsg: Message = { role: "user", content: text.trim(), intent: resolvedIntent || undefined };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          intent: resolvedIntent,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      const contentType = resp.headers.get("content-type") || "";

      // Handle structured JSON response (tool calling results)
      if (contentType.includes("application/json")) {
        const data = await resp.json();

        if (data.refusal) {
          setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
          return;
        }

        if (data.structured && data.data) {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: data.message,
            structured: true,
            data: data.data,
            intent: data.intent,
          }]);
          return;
        }

        if (data.message) {
          setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
          return;
        }

        if (data.error) throw new Error(data.error);
        return;
      }

      // Handle streaming SSE response
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantSoFar = "";
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, toast, activeIntent]);

  // ─── Save generated question to database ───
  const saveQuestion = async (question: GeneratedQuestion, index: number) => {
    if (!user) return;
    setSavingQuestions(prev => new Set(prev).add(index));

    try {
      const { error } = await supabase.from("questions").insert({
        question_text: question.question_text,
        question_type: question.question_type,
        choices: question.choices || null,
        correct_answer: question.correct_answer,
        difficulty: question.difficulty,
        bloom_level: question.bloom_level,
        cognitive_level: question.bloom_level,
        topic: question.topic,
        specialization: question.specialization || "",
        created_by: user.id,
        owner: user.id,
        approved: true,
        ai_confidence_score: 0.85,
        metadata: { ai_generated: true, source: "ai_assistant" },
      });

      if (error) throw error;
      toast({ title: "Saved!", description: `Question saved to Question Bank.` });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingQuestions(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const saveAllQuestions = async (questions: GeneratedQuestion[]) => {
    if (!user) return;
    const toSave = questions.map(q => ({
      question_text: q.question_text,
      question_type: q.question_type,
      choices: q.choices || null,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty,
      bloom_level: q.bloom_level,
      cognitive_level: q.bloom_level,
      topic: q.topic,
      specialization: q.specialization || "",
      created_by: user.id,
      owner: user.id,
      approved: true,
      ai_confidence_score: 0.85,
      metadata: { ai_generated: true, source: "ai_assistant" },
    }));

    try {
      const { error } = await supabase.from("questions").insert(toSave);
      if (error) throw error;
      toast({ title: "All Saved!", description: `${questions.length} questions saved to Question Bank.` });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    }
  };

  // ─── Handle generate form submit ───
  const handleGenerateSubmit = () => {
    if (!genTopic.trim()) {
      toast({ title: "Missing topic", description: "Please enter a topic.", variant: "destructive" });
      return;
    }
    const prompt = `Generate ${genCount} ${genType.replace("_", " ")} questions about "${genTopic}" at ${genDifficulty} difficulty level.`;
    sendMessage(prompt, "generate_questions");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Render structured question card ───
  const renderQuestionCard = (q: GeneratedQuestion, idx: number) => (
    <Card key={idx} className="border border-border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium flex-1">{idx + 1}. {q.question_text}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveQuestion(q, idx)}
            disabled={savingQuestions.has(idx)}
            className="shrink-0"
          >
            {savingQuestions.has(idx) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span className="ml-1 text-xs">Save</span>
          </Button>
        </div>

        {q.choices && Object.keys(q.choices).length > 0 && (
          <div className="pl-4 space-y-1">
            {Object.entries(q.choices).map(([key, val]) => (
              <p key={key} className={`text-xs ${key === q.correct_answer ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {key}. {val} {key === q.correct_answer && "✓"}
              </p>
            ))}
          </div>
        )}

        {(!q.choices || Object.keys(q.choices).length === 0) && q.correct_answer && (
          <p className="text-xs text-primary pl-4"><strong>Answer:</strong> {q.correct_answer}</p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-[10px]">{q.question_type}</Badge>
          <Badge variant="outline" className="text-[10px]">{q.bloom_level}</Badge>
          <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
          <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>
        </div>
      </CardContent>
    </Card>
  );

  // ─── Render structured data in messages ───
  const renderStructuredContent = (msg: Message) => {
    if (!msg.structured || !msg.data) return null;

    if (msg.intent === "generate_questions" && msg.data.questions) {
      return (
        <div className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{msg.data.questions.length} questions generated</p>
            {msg.data.questions.length > 1 && (
              <Button size="sm" variant="default" onClick={() => saveAllQuestions(msg.data.questions)} className="text-xs h-7">
                <Save className="w-3 h-3 mr-1" /> Save All to Bank
              </Button>
            )}
          </div>
          {msg.data.questions.map((q: GeneratedQuestion, i: number) => renderQuestionCard(q, i))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Academic & Educational AI Helper</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeIntent && (
            <Button variant="outline" size="sm" onClick={() => setActiveIntent(null)} className="text-xs">
              ← All Actions
            </Button>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setActiveIntent(null); }} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !activeIntent ? (
            // ─── Home: Action selector ───
            <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center space-y-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Select an action below or ask a question directly.
                </p>
              </div>

              {/* Action cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                {ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => setActiveIntent(action.id)}
                    className={`${action.bgColor} border border-border rounded-xl p-4 text-left hover:shadow-md transition-all group`}
                  >
                    <action.icon className={`w-5 h-5 ${action.color} mb-2`} />
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                  </button>
                ))}
              </div>

              {/* Free text input */}
              <div className="w-full max-w-2xl flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Or ask any academic question..."
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                  disabled={isLoading}
                />
                <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-[44px] w-[44px]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

          ) : messages.length === 0 && activeIntent ? (
            // ─── Intent-specific guided UI ───
            <div className="space-y-6 max-w-2xl mx-auto">
              {activeIntent === "generate_questions" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PlusCircle className="w-5 h-5 text-emerald-600" />
                      Generate Questions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Topic *</label>
                      <Input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="e.g., Photosynthesis, Data Structures, World War II" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select value={genType} onValueChange={setGenType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True/False</SelectItem>
                            <SelectItem value="identification">Identification</SelectItem>
                            <SelectItem value="essay">Essay</SelectItem>
                            <SelectItem value="fill_in_the_blank">Fill in the Blank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Count</label>
                        <Select value={genCount} onValueChange={setGenCount}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 10, 15, 20].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Difficulty</label>
                        <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="average">Average</SelectItem>
                            <SelectItem value="difficult">Difficult</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={handleGenerateSubmit} disabled={isLoading} className="w-full">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate Questions
                    </Button>
                  </CardContent>
                </Card>
              )}

              {activeIntent !== "generate_questions" && (
                <>
                  <div className="text-center space-y-2 pt-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                      {(() => {
                        const action = ACTIONS.find(a => a.id === activeIntent);
                        return action ? <action.icon className={`w-6 h-6 ${action.color}`} /> : <Brain className="w-6 h-6 text-primary" />;
                      })()}
                    </div>
                    <h3 className="text-lg font-semibold">
                      {ACTIONS.find(a => a.id === activeIntent)?.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {activeIntent === "classify_question" && "Paste a question below to classify its Bloom's level, difficulty, and knowledge dimension."}
                      {activeIntent === "assign_topic" && "Paste a question below to identify its topic, subject, and specialization."}
                      {activeIntent === "system_stats" && "Ask about question bank statistics and analytics."}
                      {activeIntent === "explain_concept" && "Ask about any academic or educational concept."}
                    </p>
                  </div>

                  {/* Quick prompts */}
                  {QUICK_PROMPTS[activeIntent]?.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {QUICK_PROMPTS[activeIntent].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt, activeIntent)}
                          className="px-3 py-2 rounded-lg border border-border bg-card text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-left max-w-xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex gap-2 max-w-2xl mx-auto">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeIntent === "classify_question" ? "Paste a question to classify..."
                        : activeIntent === "assign_topic" ? "Paste a question to assign topic..."
                        : activeIntent === "system_stats" ? "Ask about statistics..."
                        : "Ask your question..."
                      }
                      className="min-h-[44px] max-h-32 resize-none"
                      rows={2}
                      disabled={isLoading}
                    />
                    <Button onClick={() => sendMessage(input, activeIntent)} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-[44px] w-[44px]">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // ─── Conversation messages ───
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      <Brain className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {msg.role === "assistant" ? (
                    <div>
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {renderStructuredContent(msg)}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0 mt-1">
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  <Brain className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input - shown when conversation is active */}
      {messages.length > 0 && (
        <div className="border-t border-border p-4 bg-card shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Continue the conversation..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              disabled={isLoading}
            />
            <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-[44px] w-[44px]">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
