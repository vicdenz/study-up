
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from '@/lib/router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, Trash2, FileText, Save } from 'lucide-react';
import Navigation from '@/components/Navigation';
import UserMenu from '@/components/UserMenu';
import { useGeminiChat } from '@/hooks/useGeminiChat';
import type { AiChat } from '@/hooks/useGeminiChat';
import ReactMarkdown from 'react-markdown';
import { useCourseMaterials } from '@/hooks/useCourseMaterials';
import { useAssignmentMaterials } from '@/hooks/useAssignmentMaterials';
import { useAllAssignments } from '@/hooks/useAssignments';
import SaveChatDialog from '@/components/SaveChatDialog';

// Custom CSS animation for highlighting new assistant responses
const highlightStyle = `
@keyframes ai-highlight {
  0% { background: #fffbe7; }
  100% { background: transparent; }
}
.ai-highlight {
  animation: ai-highlight 1.2s ease;
}
`;

interface AITutorLocationState {
  courseId?: string;
  courseName?: string;
  assignmentId?: string;
  assignmentDetails?: { title: string; description: string };
  chatToLoad?: AiChat;
}

const AITutor = () => {
  const [inputMessage, setInputMessage] = useState('');
  const { messages, isLoading, sendMessage, clearMessages, saveChat, isSaving, loadChat } = useGeminiChat();
  const location = useLocation<AITutorLocationState>();
  const navigate = useNavigate();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { assignments } = useAllAssignments();

  const locationState = location.state;

  // For highlighting the latest assistant message
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevMessagesLength = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch materials for both course and assignment contexts
  const { materials: courseMaterials } = useCourseMaterials(locationState?.courseId ?? '');
  const { materials: assignmentMaterials } = useAssignmentMaterials(locationState?.assignmentId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const chatToLoad = location.state?.chatToLoad;
    if (chatToLoad) {
      loadChat(chatToLoad);
      // Clear the state from location to prevent reloading on page refresh or navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, loadChat, navigate, location.pathname]);

  useEffect(() => {
    // Detect if a new assistant message arrived
    if (
      messages.length > prevMessagesLength.current &&
      messages[messages.length - 1]?.role === 'assistant'
    ) {
      const newAssistantId = messages[messages.length - 1].id;
      setHighlightId(newAssistantId);
      // Remove highlight after 1.1s (less than animation duration)
      setTimeout(() => setHighlightId(null), 1100);
    }
    prevMessagesLength.current = messages.length;
    scrollToBottom();
  }, [messages]);

  const handleSaveChat = (data: { title: string; assignment_id?: string }) => {
    const finalData = { ...data };
    if (locationState?.assignmentId) {
      finalData.assignment_id = locationState.assignmentId;
    }
    saveChat(finalData);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    let context = "You are an AI tutor helping students with their academic questions. Be helpful, encouraging, and provide clear explanations.";

    // Add course-specific context if available
    if (locationState?.courseName) {
      context += ` The student is currently working on the course: "${locationState.courseName}". Tailor your responses to be relevant to this course when appropriate.`;
    }

    // Add assignment-specific context
    if (locationState?.assignmentDetails) {
        context += `\n\nThe student is specifically focused on the assignment: "${locationState.assignmentDetails.title}".`;
        if (locationState.assignmentDetails.description) {
            context += `\nAssignment Description: ${locationState.assignmentDetails.description}`;
        }
    }

    const allMaterials = [...(courseMaterials || []), ...(assignmentMaterials || [])];
    const imageMaterials = allMaterials.filter(m => m.type.startsWith('image/') && m.url);
    const textMaterials = allMaterials.filter(m => !m.type.startsWith('image/'));
    const imageUrls = imageMaterials.map(m => m.url!);

    // Add text materials to the context
    if (textMaterials.length > 0) {
        const materialInfo = textMaterials.map(m => {
            if (m.content) {
                return `Material Title: "${m.title}"\nType: ${m.type}\nContent:\n${m.content}`;
            }
            return `Material Title: "${m.title}"\nType: ${m.type}\n(Content not available for this file type)`;
        }).join('\n\n---\n\n');
        
        context += `\n\nHere are some text-based materials for reference. Use their content to answer questions when relevant.\n\n${materialInfo}`;
    }

    if (imageMaterials.length > 0) {
        context += `\n\nAdditionally, ${imageMaterials.length} image(s) have been provided with the following titles: ${imageMaterials.map(m => `"${m.title}"`).join(', ')}. When asked about an image, use the corresponding image data provided alongside this prompt.`;
    }

    await sendMessage(inputMessage, context, imageUrls);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasCourseMats = courseMaterials && courseMaterials.length > 0;
  const hasAssignmentContext = locationState?.assignmentDetails;
  const hasAssignmentMats = assignmentMaterials && assignmentMaterials.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Inject animation CSS style */}
      <style>{highlightStyle}</style>
      <Navigation />

      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">StudyUp</h1>
                <span className="text-sm text-gray-500">AI Tutor</span>
                {locationState?.courseName && (
                  <p className="text-sm text-gray-500">Currently helping with: {locationState.courseName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setShowSaveDialog(true)} disabled={messages.length === 0 || isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Chat
              </Button>
              <Button variant="outline" onClick={clearMessages} disabled={messages.length === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Chat
              </Button>
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Learning Assistant</h2>
              <p className="text-gray-600">
                Ask questions about your studies and get intelligent, personalized help.
                {locationState?.courseName && ` Currently focused on ${locationState.courseName}.`}
                {locationState?.assignmentDetails && ` Specifically, the assignment "${locationState.assignmentDetails.title}".`}
              </p>
            </div>

            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center flex-wrap">
                  <Brain className="h-5 w-5 mr-2" />
                  Chat with AI Tutor (Powered by Gemini)
                  {locationState?.courseName && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      - {locationState.courseName}
                      {locationState?.assignmentDetails && ` / ${locationState.assignmentDetails.title}`}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col overflow-hidden">
                {/* Context indicators */}
                {(hasCourseMats || hasAssignmentContext || hasAssignmentMats) && (
                  <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
                    <div className="flex items-start space-x-2">
                      <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">This chat has extra context:</span>
                        <ul className="list-disc list-inside mt-1">
                          {hasAssignmentContext && <li>Assignment: "{locationState?.assignmentDetails?.title}"</li>}
                          {hasCourseMats && <li>{courseMaterials.length} course material(s)</li>}
                          {hasAssignmentMats && <li>{assignmentMaterials.length} assignment material(s)</li>}
                        </ul>
                        <p className="mt-1">The AI will use this information to better answer your questions.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Chat messages scrollable container */}
                <ScrollArea className="flex-1 mb-4 pr-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>
                          {locationState?.courseName
                            ? `Ready to help you with ${locationState.courseName}!`
                            : "Start a conversation with your AI tutor!"
                          }
                          {locationState?.assignmentDetails && ` We can focus on your assignment: "${locationState.assignmentDetails.title}".`}
                        </p>
                        <p className="text-sm mt-2">Ask questions about any subject, request explanations, or get study tips.</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] md:max-w-[65%] w-full p-3 rounded-lg transition-colors
                              ${message.role === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }
                              ${message.role === 'assistant' && message.id === highlightId ? 'ai-highlight' : ''}
                            `}
                            style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              overflow: 'hidden',
                              whiteSpace: 'pre-wrap',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                              minWidth: 0,
                            }}
                          >
                            {message.role === 'assistant' ? (
                              <div
                                className="prose prose-sm break-words whitespace-pre-wrap max-w-full overflow-x-auto"
                                style={{
                                  maxWidth: '100%',
                                  minWidth: 0,
                                  overflowX: 'auto', // So code/markdown blocks can scroll horizontally!
                                  wordBreak: 'break-word',
                                }}
                              >
                                <ReactMarkdown
                                  components={{
                                    // Clamp super long words and enable horizontal scroll for code/tables within markdown!
                                    code: ({node, ...props}) => (
                                      <code
                                        style={{ wordBreak: 'break-all', overflowX: 'auto', maxWidth: '100%' }}
                                        className="inline-block max-w-full break-all overflow-x-auto"
                                        {...props}
                                      />
                                    ),
                                    pre: ({node, ...props}) => (
                                      <pre
                                        style={{ overflowX: 'auto', maxWidth: '100%' }}
                                        className="max-w-full overflow-x-auto"
                                        {...props}
                                      />
                                    ),
                                    table: ({node, ...props}) => (
                                      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                        <table className="max-w-full" {...props} />
                                      </div>
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      locationState?.assignmentDetails
                        ? `Ask about "${locationState.assignmentDetails.title}"...`
                        : locationState?.courseName
                        ? `Ask about ${locationState.courseName}...`
                        : "Ask your AI tutor anything..."
                    }
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    aria-label="Send message"
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <SaveChatDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        assignments={assignments}
        onSave={handleSaveChat}
        isSaving={isSaving}
      />
    </div>
  );
};

export default AITutor;
