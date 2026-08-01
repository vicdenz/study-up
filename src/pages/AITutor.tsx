import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpenCheck, Brain, Save, Send, Sparkles, Trash2, UserRound } from "lucide-react";
import Navigation from "@/components/Navigation";
import SaveChatDialog from "@/components/SaveChatDialog";
import TypewriterText from "@/components/TypewriterText";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAllAssignments } from "@/hooks/useAssignments";
import { useAssignmentMaterials } from "@/hooks/useAssignmentMaterials";
import { useCourseMaterials } from "@/hooks/useCourseMaterials";
import { type AiChat, useGeminiChat } from "@/hooks/useGeminiChat";
import { useLocation, useNavigate } from "@/lib/router";

interface AITutorLocationState {
  courseId?: string;
  courseName?: string;
  assignmentId?: string;
  assignmentDetails?: { title: string; description: string };
  chatToLoad?: AiChat;
}

const AITutor = () => {
  const [inputMessage, setInputMessage] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const { messages, isLoading, sendMessage, clearMessages, saveChat, isSaving, loadChat } = useGeminiChat();
  const location = useLocation<AITutorLocationState>();
  const navigate = useNavigate();
  const { assignments } = useAllAssignments();
  const locationState = location.state;
  const previousMessagesLength = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { materials: courseMaterials } = useCourseMaterials(locationState?.courseId ?? "");
  const { materials: assignmentMaterials } = useAssignmentMaterials(locationState?.assignmentId);

  useEffect(() => {
    const chatToLoad = location.state?.chatToLoad;
    if (chatToLoad) {
      loadChat(chatToLoad);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [loadChat, location.pathname, location.state, navigate]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (messages.length > previousMessagesLength.current && latestMessage?.role === "assistant") {
      setAnimatedMessageId(latestMessage.id);
    }
    previousMessagesLength.current = messages.length;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveChat = (data: { title: string; assignment_id?: string }) => {
    saveChat({ ...data, assignment_id: locationState?.assignmentId ?? data.assignment_id });
  };

  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isLoading) return;

    let context = "You are an AI tutor helping students with their academic questions. Be helpful, encouraging, and provide clear explanations.";
    if (locationState?.courseName) {
      context += ` The student is currently working on the course: "${locationState.courseName}". Tailor your responses to be relevant to this course when appropriate.`;
    }
    if (locationState?.assignmentDetails) {
      context += `\n\nThe student is specifically focused on the assignment: "${locationState.assignmentDetails.title}".`;
      if (locationState.assignmentDetails.description) context += `\nAssignment Description: ${locationState.assignmentDetails.description}`;
    }

    const allMaterials = [...(courseMaterials || []), ...(assignmentMaterials || [])];
    const imageMaterials = allMaterials.filter((material) => material.type.startsWith("image/") && material.url);
    const textMaterials = allMaterials.filter((material) => !material.type.startsWith("image/"));
    const imageUrls = imageMaterials.map((material) => material.url!);

    if (textMaterials.length > 0) {
      const materialInfo = textMaterials.map((material) => material.content
        ? `Material Title: "${material.title}"\nType: ${material.type}\nContent:\n${material.content}`
        : `Material Title: "${material.title}"\nType: ${material.type}\n(Content not available for this file type)`
      ).join("\n\n---\n\n");
      context += `\n\nHere are some text-based materials for reference. Use their content to answer questions when relevant.\n\n${materialInfo}`;
    }
    if (imageMaterials.length > 0) {
      context += `\n\nAdditionally, ${imageMaterials.length} image(s) have been provided with the following titles: ${imageMaterials.map((material) => `"${material.title}"`).join(", ")}. When asked about an image, use the corresponding image data provided alongside this prompt.`;
    }

    setInputMessage("");
    await sendMessage(message, context, imageUrls);
  };

  const hasContext = Boolean(courseMaterials?.length || assignmentMaterials?.length || locationState?.assignmentDetails);
  const placeholder = locationState?.assignmentDetails
    ? `Ask about “${locationState.assignmentDetails.title}”…`
    : locationState?.courseName
      ? `Ask about ${locationState.courseName}…`
      : "Ask your AI tutor anything…";

  return (
    <div className="app-background flex min-h-screen">
      <Navigation />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-violet-100/80 bg-white/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-600" /><h1 className="text-xl font-semibold text-slate-900">AI Tutor</h1></div>
              <p className="mt-1 text-sm text-muted-foreground">Thoughtful help grounded in your StudyUp materials.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button aria-label="Save chat" variant="outline" size="sm" onClick={() => setShowSaveDialog(true)} disabled={!messages.length || isSaving}><Save /><span className="hidden xl:inline">Save</span></Button>
              <Button aria-label="Clear chat" variant="ghost" size="sm" onClick={clearMessages} disabled={!messages.length}><Trash2 /><span className="hidden xl:inline">Clear</span></Button>
              <UserMenu />
            </div>
          </div>
        </header>

        <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col p-4 md:p-6">
          <div className="flex min-h-[680px] flex-1 flex-col overflow-hidden rounded-3xl border border-violet-200/80 bg-white shadow-xl shadow-violet-900/5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-blue-50/80 via-violet-50/80 to-fuchsia-50/80 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-violet-600 to-fuchsia-600 text-white shadow-md"><Brain /></div>
                <div><h2 className="font-semibold text-slate-900">StudyUp Tutor</h2><p className="text-xs text-slate-500">Powered by Gemini</p></div>
              </div>
              {locationState?.courseName && <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">{locationState.courseName}{locationState.assignmentDetails ? ` · ${locationState.assignmentDetails.title}` : ""}</span>}
            </div>

            {hasContext && (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
                <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div><p className="font-semibold">Course context is connected</p><p className="mt-0.5 text-xs text-blue-700">The tutor can reference {courseMaterials?.length ?? 0} course and {assignmentMaterials?.length ?? 0} assignment material(s){locationState?.assignmentDetails ? ` for “${locationState.assignmentDetails.title}”` : ""}.</p></div>
              </div>
            )}

            <ScrollArea className="min-h-0 flex-1 px-5">
              <div className="mx-auto max-w-3xl space-y-6 py-6">
                {messages.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 via-violet-100 to-fuchsia-100 text-violet-700"><Sparkles className="h-7 w-7" /></div>
                    <h3 className="text-xl font-semibold text-slate-900">What can we work through?</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Ask for an explanation, a study plan, practice questions, or help connecting ideas from your materials.</p>
                  </div>
                ) : messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${message.role === "user" ? "bg-slate-800 text-white" : "bg-violet-100 text-violet-700"}`}>
                      {message.role === "user" ? <UserRound className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div className={`min-w-0 max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.role === "user" ? "rounded-tr-sm bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-600 text-white" : "rounded-tl-sm border border-violet-100 bg-white text-slate-800"}`}>
                      {message.role === "assistant" ? (
                        <TypewriterText text={message.content} animate={message.id === animatedMessageId}>
                          {(visibleText) => <div className="prose prose-sm max-w-none break-words prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-900"><ReactMarkdown>{visibleText}</ReactMarkdown></div>}
                        </TypewriterText>
                      ) : <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
                      <p className={`mt-2 text-[11px] ${message.role === "user" ? "text-white/65" : "text-slate-400"}`}>{message.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="h-4 w-4" /></div><div className="flex gap-1 rounded-2xl rounded-tl-sm border border-violet-100 bg-white px-4 py-4" role="status" aria-label="AI is thinking"><span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-500 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-500 [animation-delay:240ms]" /></div></div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-violet-100 bg-white/80 p-4">
              <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-violet-200 bg-white p-2 shadow-lg shadow-violet-900/5 focus-within:ring-2 focus-within:ring-violet-300/40">
                <Textarea value={inputMessage} onChange={(event) => setInputMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void handleSendMessage(); } }} placeholder={placeholder} disabled={isLoading} rows={1} className="max-h-36 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
                <Button size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label="Send message" onClick={() => void handleSendMessage()} disabled={isLoading || !inputMessage.trim()}><Send /></Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400">AI can make mistakes. Check important course information.</p>
            </div>
          </div>
        </section>
      </main>

      <SaveChatDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} assignments={assignments} onSave={handleSaveChat} isSaving={isSaving} />
    </div>
  );
};

export default AITutor;
