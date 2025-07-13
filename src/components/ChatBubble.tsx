import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageCircle, X, Send, Minus, HelpCircle, Video, Search } from 'lucide-react';

// Fallback UI components in case shadcn/ui imports fail
const Button = ({ children, onClick, disabled, className = '', size = 'default', variant = 'default', title, ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
      variant === 'ghost' 
        ? 'hover:bg-accent hover:text-accent-foreground' 
        : 'bg-primary text-primary-foreground hover:bg-primary/90'
    } ${
      size === 'sm' ? 'h-9 px-3 rounded-md' : 
      size === 'lg' ? 'h-11 px-8 rounded-md' : 
      'h-10 py-2 px-4'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

const Card = ({ children, className = '', ...props }: any) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`} {...props}>
    {children}
  </div>
);

const CardContent = ({ children, className = '', ...props }: any) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '', ...props }: any) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);

const Avatar = ({ children, className = '', ...props }: any) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
);

const AvatarFallback = ({ children, className = '', ...props }: any) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`} {...props}>
    {children}
  </div>
);

// Import the VisualChatMessage component (you'll need to ensure this exists)
// If it doesn't exist, create a simple fallback:
const VisualChatMessage = ({ message, onVisualInteraction }: any) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
        message.isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted'
      }`}>
        {message.factCheckResult ? (
          <div className="space-y-2">
            <div className="font-semibold text-purple-600">🔍 Fact Check Result</div>
            <div><strong>Question:</strong> {message.factCheckResult.question}</div>
            <div><strong>Your Answer:</strong> {message.factCheckResult.userAnswer}</div>
            <div><strong>Correct Answer:</strong> {message.factCheckResult.supposedAnswer}</div>
            {message.factCheckResult.explanation && (
              <div><strong>Explanation:</strong> {message.factCheckResult.explanation}</div>
            )}
          </div>
        ) : (
          <>
            <div>{message.text}</div>
            {message.visuals && message.visuals.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.visuals.map((visual: any, index: number) => (
                  <div key={index} className="p-2 bg-background rounded border">
                    <div className="text-xs font-semibold mb-1">{visual.title || `${visual.type} visualization`}</div>
                    <div className="text-xs text-muted-foreground">{visual.description}</div>
                    {visual.interactionHints && (
                      <div className="text-xs mt-1 opacity-75">
                        💡 {visual.interactionHints.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div className="text-xs opacity-75 mt-1">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
};

// Mock useAuth hook if it doesn't exist
const useAuth = () => {
  return {
    user: null,
    session: { access_token: null }
  };
};

interface VisualContent {
  type: 'mermaid' | 'chart' | 'table' | 'mindmap';
  code: string;
  title?: string;
  description?: string;
  interactionHints?: string[];
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  visuals?: VisualContent[];
  factCheckResult?: any;
}

interface ChatBubbleProps {
  className?: string;
  courseId?: string;
  currentVideoTime?: number;
  activeQuestion?: {
    question: string;
    type: string;
    options: string[];
    correct_answer: string | number;
    explanation: string;
    sequence_items?: string[];
    matching_pairs?: Array<{
      left?: string;
      left_item?: string;
      right?: string;
      right_item?: string;
    }>;
    bounding_boxes?: Array<{
      isCorrectAnswer: boolean;
      label?: string;
    }>;
    target_objects?: string[];
  } | null;
  isAnswerIncorrect?: boolean;
  userAnswer?: string;
  hasJustAnswered?: boolean;
}

export default function ChatBubble({ 
  className, 
  courseId, 
  currentVideoTime, 
  activeQuestion,
  isAnswerIncorrect,
  userAnswer,
  hasJustAnswered
}: ChatBubbleProps) {
  const { user, session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: courseId 
        ? "Hi! I'm here to help you with this course. I can answer questions about the content you've watched so far. How can I assist you today?"
        : "Hi! I'm here to help you with your course. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleVisualInteraction = (visual: VisualContent, action: string) => {
    console.log('Visual interaction:', action, visual);
    // Could track analytics here
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('💬 Sending chat request:', {
        courseId,
        currentVideoTime,
        message: inputMessage.substring(0, 50) + '...',
        conversationHistoryLength: messages.length,
        hasAuth: !!session?.access_token
      });
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: inputMessage,
          conversationHistory: messages,
          courseId: courseId,
          currentVideoTime: currentVideoTime
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      console.log('📊 Received response with visuals:', {
        hasVisuals: !!data.visuals,
        visualsCount: data.visuals?.length || 0,
        visualContext: data.visualContext
      });
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        visuals: data.visuals
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePredefinedMessage = async (message: string, displayMessage?: string) => {
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: displayMessage || message,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    if (!isOpen) {
      setIsOpen(true);
    }
    
    if (isMinimized) {
      setIsMinimized(false);
    }

    try {
      console.log('💬 Sending predefined chat request:', {
        courseId,
        currentVideoTime,
        message: message.substring(0, 50) + '...',
        conversationHistoryLength: messages.length,
        hasAuth: !!session?.access_token
      });
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message,
          conversationHistory: messages,
          courseId: courseId,
          currentVideoTime: currentVideoTime
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      console.log('📊 Received response with visuals:', {
        hasVisuals: !!data.visuals,
        visualsCount: data.visuals?.length || 0,
        visualContext: data.visualContext
      });
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        visuals: data.visuals
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending predefined message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainVideo = () => {
    const apiMessage = "Explain what has happened in the video so far, succintly and focus on someone who wants to learn the concepts not random background or video specific details";
    const userDisplayMessage = "Summarize the video so far for me";
    
    handlePredefinedMessage(apiMessage, userDisplayMessage);
  };

  const handleHelpWithQuestion = () => {
    if (!activeQuestion) return;
    
    const apiMessage = `Help me with this question: Provide a hint for the question content without solving the question. 

Question: ${activeQuestion.question}
Type: ${activeQuestion.type}
Options: ${activeQuestion.options.join(', ')}`;
    
    const userDisplayMessage = "Help me with this question";
    
    handlePredefinedMessage(apiMessage, userDisplayMessage);
  };

  const handleFactCheck = async () => {
    if (!activeQuestion || !courseId) return;

    const userDisplayMessage = "🔍 Fact check the answer";
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userDisplayMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    if (!isOpen) {
      setIsOpen(true);
    }
    
    if (isMinimized) {
      setIsMinimized(false);
    }
    
    try {
      let correctAnswerText = '';
      
      switch (activeQuestion.type) {
        case 'true-false':
        case 'true_false':
          const tfAnswer = typeof activeQuestion.correct_answer === 'number' 
            ? activeQuestion.correct_answer 
            : parseInt(String(activeQuestion.correct_answer), 10);
            
          correctAnswerText = tfAnswer === 0 ? 'True' : 'False';
          break;
          
        case 'multiple-choice':
        case 'multiple_choice':
          const correctIndex = typeof activeQuestion.correct_answer === 'number' 
            ? activeQuestion.correct_answer 
            : parseInt(String(activeQuestion.correct_answer), 10);
            
          if (Array.isArray(activeQuestion.options) && !isNaN(correctIndex) && correctIndex >= 0 && correctIndex < activeQuestion.options.length) {
            correctAnswerText = activeQuestion.options[correctIndex];
          } else {
            correctAnswerText = `Option ${correctIndex + 1}`;
          }
          break;
          
        case 'sequencing':
        case 'sequence':
          if (activeQuestion.sequence_items && Array.isArray(activeQuestion.sequence_items)) {
            correctAnswerText = activeQuestion.sequence_items.join(' → ');
          } else if (Array.isArray(activeQuestion.options)) {
            correctAnswerText = activeQuestion.options.join(' → ');
          } else {
            correctAnswerText = 'Correct sequence not available';
          }
          break;
          
        case 'matching':
          if (activeQuestion.matching_pairs && Array.isArray(activeQuestion.matching_pairs)) {
            const pairs = activeQuestion.matching_pairs.map((pair: any) => 
              `${pair.left || pair.left_item || 'Item'} ↔ ${pair.right || pair.right_item || 'Match'}`
            );
            correctAnswerText = pairs.join('; ');
          } else {
            correctAnswerText = 'Correct matches not available';
          }
          break;
          
        case 'hotspot':
          if (activeQuestion.bounding_boxes && Array.isArray(activeQuestion.bounding_boxes)) {
            const correctBoxes = activeQuestion.bounding_boxes
              .filter((box: any) => box.isCorrectAnswer)
              .map((box: any) => box.label || 'Correct area');
            correctAnswerText = correctBoxes.length > 0 
              ? `Click on: ${correctBoxes.join(', ')}`
              : 'Correct hotspot area';
          } else if (activeQuestion.target_objects && Array.isArray(activeQuestion.target_objects)) {
            correctAnswerText = `Click on: ${activeQuestion.target_objects.join(', ')}`;
          } else {
            correctAnswerText = 'Correct hotspot area';
          }
          break;
          
        default:
          correctAnswerText = String(activeQuestion.correct_answer);
      }

      console.log('📋 Fact checking:', {
        questionType: activeQuestion.type,
        correctAnswer: correctAnswerText
      });

      const response = await fetch('/api/fact-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: activeQuestion.question,
          userAnswer: userAnswer || 'N/A',
          correctAnswer: correctAnswerText,
          explanation: activeQuestion.explanation,
          courseId: courseId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fact check');
      }

      const data = await response.json();
      
      if (data) {
        const factCheckMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: '',
          isUser: false,
          timestamp: new Date(),
          factCheckResult: {
            ...data,
            question: activeQuestion.question,
            supposedAnswer: correctAnswerText,
            userAnswer: userAnswer || 'N/A'
          }
        };
        
        setMessages(prev => [...prev, factCheckMessage]);
      }
    } catch (error) {
      console.error('Error during fact check:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't perform the fact check right now. Please try again later.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Chat Window */}
      {isOpen && (
        <Card className={`mb-4 w-[500px] shadow-lg transition-all duration-300 ${
          isMinimized ? 'h-14' : 'h-[700px]'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3 bg-primary text-primary-foreground">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary-foreground text-primary text-xs">
                  <Bot className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-semibold">CourseBuild AI</h3>
                <p className="text-xs opacity-90">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[620px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <VisualChatMessage
                    key={message.id}
                    message={message}
                    onVisualInteraction={handleVisualInteraction}
                  />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex items-center space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything... I can create diagrams too!"
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Try asking "How does X work?" or "Compare A and B" for visual explanations
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col items-end space-y-2 mb-4">
        <Button
          onClick={() => {
            if (hasJustAnswered && activeQuestion) {
              handleFactCheck();
            } else if (activeQuestion) {
              handleHelpWithQuestion();
            } else {
              handleExplainVideo();
            }
          }}
          disabled={isLoading}
          className={`rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 ${
            hasJustAnswered && activeQuestion
              ? 'bg-purple-500 hover:bg-purple-600'
              : activeQuestion
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
          size="lg"
          title={
            hasJustAnswered && activeQuestion
              ? 'Fact check the answer'
              : activeQuestion
              ? 'Help me with this question'
              : "Explain what's happened in the video"
          }
        >
          {hasJustAnswered && activeQuestion ? (
            <Search className="h-5 w-5" />
          ) : activeQuestion ? (
            <HelpCircle className="h-5 w-5" />
          ) : (
            <Video className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Main Chat Bubble Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-40 h-40 shadow-lg hover:shadow-xl transition-all duration-300 bg-transparent hover:bg-transparent p-0 border-0 overflow-hidden"
        size="lg"
      >
        {isOpen ? (
          <div className="w-full h-full flex items-center justify-center bg-primary rounded-full">
            <X className="h-6 w-6 text-primary-foreground" />
          </div>
        ) : (
          <img 
            src="/Curio.gif" 
            alt="Curio AI Assistant" 
            className="w-full h-full object-cover rounded-full"
          />
        )}
      </Button>
    </div>
  );
}