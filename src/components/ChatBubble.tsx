import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageCircle, X, Send, Minus, HelpCircle, Video, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VisualChatMessage } from './VisualChatMessage';
import { useAuth } from '@/contexts/AuthContext';

// Fallback BackgroundGradient component if the original doesn't exist
const BackgroundGradient = ({ 
  children, 
  className = '', 
  containerClassName = '',
  animate = false 
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}) => {
  return (
    <div className={containerClassName}>
      <div className={`relative ${className} ${animate ? 'animate-pulse' : ''}`}>
        {children}
        {/* Subtle gradient effect as fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-[22px] pointer-events-none" />
      </div>
    </div>
  );
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
  factCheckResult?: any; // For fact check messages
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
    // Additional properties for different question types
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
  isAnswerIncorrect?: boolean; // Track if user just answered incorrectly
  userAnswer?: string; // The user's answer
  hasJustAnswered?: boolean; // Track if user just answered (right or wrong)
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
  const [isHovered, setIsHovered] = useState(false);
  const [useModernStyle, setUseModernStyle] = useState(true); // Toggle between styles
  const [hasEntered, setHasEntered] = useState(false); // Track entrance animation
  const [showCurio, setShowCurio] = useState(false); // Control visibility
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: courseId 
        ? "Hi! I'm Curio, your personal learning assistant. I can answer questions about the content you've watched so far. How can I assist you today?"
        : "Hi! I'm here to help you with your course. How can I assist you today?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Track action changes for button animation
  const previousActionRef = useRef<'explain' | 'help' | 'fact-check'>('explain');
  const [shouldBlink, setShouldBlink] = useState(false);
  const [isActionButtonHovered, setIsActionButtonHovered] = useState(false);
  const [isTransitioningToDefault, setIsTransitioningToDefault] = useState(false);

  // Use optimized settings permanently for better performance
  const chatBlurClass = '';
  const inputBlurClass = 'bg-background/95';
  const messagesBgClass = 'bg-background/95';

  const scrollToBottom = () => {
    // Use faster, non-smooth scrolling for better performance
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Trigger entrance animation after component mounts
  useEffect(() => {
    // Only play entrance animation on course pages
    if (courseId) {
      const entranceTimer = setTimeout(() => {
        setShowCurio(true);
        
        // Play entrance sound effect (optional)
        try {
          const audio = new Audio('/sounds/curio-hello.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignore audio play errors (autoplay policies)
          });
        } catch (e) {
          // Ignore if sound file doesn't exist
        }
        
        // Mark as entered after animation completes
        setTimeout(() => {
          setHasEntered(true);
        }, 1200); // Animation duration
      }, 600); // Initial delay before entrance

      return () => clearTimeout(entranceTimer);
    } else {
      // Show immediately if not on course page
      setShowCurio(true);
      setHasEntered(true);
    }
  }, [courseId]);
  
  // Determine current action type
  const getCurrentAction = (): 'explain' | 'help' | 'fact-check' => {
    if (hasJustAnswered && activeQuestion) {
      return 'fact-check';
    } else if (activeQuestion) {
      return 'help';
    } else {
      return 'explain';
    }
  };
  
  // Get current action
  const currentAction = getCurrentAction();
  
  // Detect action changes and trigger animations
  useEffect(() => {
    if (currentAction !== previousActionRef.current) {
      const wasExplain = previousActionRef.current === 'explain';
      const isExplain = currentAction === 'explain';
      
      // Update the ref
      previousActionRef.current = currentAction;
      
      // Trigger animations based on the transition
      if (!isExplain) {
        // Changing TO help/fact-check - trigger blink only on initial change
        if (wasExplain) {
          setShouldBlink(true);
          const timer = setTimeout(() => {
            setShouldBlink(false);
          }, 600);
          return () => clearTimeout(timer);
        }
      } else if (isExplain && !wasExplain) {
        // Changing back TO explain - minimal animation
        setIsTransitioningToDefault(true);
        const timer = setTimeout(() => {
          setIsTransitioningToDefault(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentAction]);
  
  // Apply hover animation when action changes from default (explain/video)
  const shouldShowHoverAnimation = isActionButtonHovered || (currentAction !== 'explain' && !isTransitioningToDefault);

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
      
      // Add authorization header if user is authenticated
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
        visuals: data.visuals // Include any generated visuals
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

    // Open chat if it's not already open
    if (!isOpen) {
      setIsOpen(true);
    }
    
    // Unminimize if minimized
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
      
      // Add authorization header if user is authenticated
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
        visuals: data.visuals // Include any generated visuals
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
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userDisplayMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Open chat if it's not already open
    if (!isOpen) {
      setIsOpen(true);
    }
    
    // Unminimize if minimized
    if (isMinimized) {
      setIsMinimized(false);
    }
    
    try {
      // Extract the correct answer based on question type
      let correctAnswerText = '';
      
      switch (activeQuestion.type) {
        case 'true-false':
        case 'true_false':
          // For true/false, correct_answer is 0 (True) or 1 (False)
          // Handle both string and number values
          const tfAnswer = typeof activeQuestion.correct_answer === 'number' 
            ? activeQuestion.correct_answer 
            : parseInt(String(activeQuestion.correct_answer), 10);
            
          correctAnswerText = tfAnswer === 0 ? 'True' : 'False';
          break;
          
        case 'multiple-choice':
        case 'multiple_choice':
          // For multiple choice, correct_answer is an index into options array
          // Handle both string and number values for correct_answer
          const correctIndex = typeof activeQuestion.correct_answer === 'number' 
            ? activeQuestion.correct_answer 
            : parseInt(String(activeQuestion.correct_answer), 10);
            
          if (Array.isArray(activeQuestion.options) && !isNaN(correctIndex) && correctIndex >= 0 && correctIndex < activeQuestion.options.length) {
            correctAnswerText = activeQuestion.options[correctIndex];
          } else {
            // Fallback if index is invalid
            correctAnswerText = `Option ${correctIndex + 1}`;
          }
          break;
          
        case 'sequencing':
        case 'sequence':
          // For sequencing, the correct answer is the entire sequence in order
          if (activeQuestion.sequence_items && Array.isArray(activeQuestion.sequence_items)) {
            correctAnswerText = activeQuestion.sequence_items.join(' → ');
          } else if (Array.isArray(activeQuestion.options)) {
            // Fallback if sequence_items isn't available
            correctAnswerText = activeQuestion.options.join(' → ');
          } else {
            correctAnswerText = 'Correct sequence not available';
          }
          break;
          
        case 'matching':
          // For matching, show all correct pairs
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
          // For hotspot, identify the correct clickable areas
          if (activeQuestion.bounding_boxes && Array.isArray(activeQuestion.bounding_boxes)) {
            const correctBoxes = activeQuestion.bounding_boxes
              .filter((box: any) => box.isCorrectAnswer)
              .map((box: any) => box.label || 'Correct area');
            correctAnswerText = correctBoxes.length > 0 
              ? `Click on: ${correctBoxes.join(', ')}`
              : 'Correct hotspot area';
          } else if (activeQuestion.target_objects && Array.isArray(activeQuestion.target_objects)) {
            // Fallback to target_objects if available
            correctAnswerText = `Click on: ${activeQuestion.target_objects.join(', ')}`;
          } else {
            correctAnswerText = 'Correct hotspot area';
          }
          break;
          
        default:
          // Fallback for unknown types
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
      
      // The API returns the fact check result directly
      if (data) {
        // Add fact check result as a special message
        const factCheckMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: '', // Empty text since we'll use a custom component
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render the chat window based on style preference
  const renderChatWindow = () => {
    if (useModernStyle) {
      return (
        <Card 
          className={`w-[500px] shadow-xl transition-all duration-300 bg-card/90 ${chatBlurClass} border border-[#02cced]/20 rounded-[22px] ${
            isMinimized ? 'h-14' : 'h-[700px]'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
            {/* Geometric pattern overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute top-4 right-4 w-20 h-20 border-2 border-[#02cced]/20 rounded-full" />
              <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-[#fdd686]/20 rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-12 h-12 border border-[#02cced]/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            </div>

            <CardHeader 
              className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3 bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/95 hover:to-[#02cced] text-white rounded-t-[22px] relative z-10 cursor-pointer select-none transition-all duration-200"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Maximize chat" : "Minimize chat"}
            >
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6 ring-2 ring-white/20">
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    <Bot className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold">Curio AI</h3>
                  <p className="text-xs opacity-90">Personal Learning Assistant</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(!isMinimized);
                  }}
                  className="h-6 w-6 p-0 hover:bg-white/20 text-white transition-all duration-200"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="h-6 w-6 p-0 hover:bg-white/20 text-white transition-all duration-200"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            
            {!isMinimized && (
              <CardContent className="p-0 flex flex-col h-[620px] relative z-10">
                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${messagesBgClass}`}>
                  {messages.map((message) => (
                    <VisualChatMessage
                      key={message.id}
                      message={message}
                      onVisualInteraction={handleVisualInteraction}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#02cced]/10 border border-[#02cced]/20 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-[#02cced] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[#02cced] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-[#02cced] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`p-4 border-t border-[#02cced]/20 ${inputBlurClass} rounded-b-[22px]`}>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 group">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything... I can create diagrams too!"
                        className={`border-[#02cced]/20 focus:border-[#02cced]/60 ${inputBlurClass} transition-all placeholder:text-muted-foreground/70 rounded-lg focus:ring-2 focus:ring-[#02cced]/20`}
                        disabled={isLoading}
                      />
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#02cced]/0 via-[#02cced]/10 to-[#fdd686]/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      size="sm"
                      className="px-3 bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/90 hover:to-[#02cced] text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-[#02cced] rounded-full animate-pulse" />
                    Try asking "How does X work?" or "Compare A and B" for visual explanations
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
      );
    }

    // Classic style (fallback/alternative)
  return (
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
              onClick={() => setUseModernStyle(!useModernStyle)}
              className="h-6 w-6 p-0 hover:bg-primary-foreground/20"
              title="Toggle Style"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
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
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                  placeholder="Ask me anything..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
    );
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Integrated Chat and Curio Container */}
      <div className="relative">
        {/* Chat Window - positioned based on minimized state */}
        {isOpen && (
          <div className={`absolute right-0 transition-all duration-300 ${isMinimized ? 'bottom-0' : 'bottom-48 animate-slide-up'}`}>
            {/* Matching glow effect for chat - only when not minimized */}
            {!isMinimized && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#02cced]/10 via-[#02cced]/5 to-[#02cced]/10 blur-2xl scale-110 -z-10" />
            )}
            
            {renderChatWindow()}
            
            {/* Speech bubble tail pointing down to Curio - only when not minimized */}
            {!isMinimized && (
              <>
                <div className="absolute -bottom-[8px] right-[72px] overflow-hidden z-10">
                  <div className="w-8 h-8 bg-card/90 transform rotate-45 border-r-2 border-b-2 border-[#02cced]/20" />
                </div>
                
                {/* Connecting dots animation */}
                <div className="absolute -bottom-14 right-[76px] flex flex-col gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-[#02cced]/40 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-[#02cced]/30 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1.5 h-1.5 bg-[#02cced]/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </>
            )}
          </div>
        )}

                {/* Action Buttons - positioned to the left of Curio */}
        {hasEntered && (
          <div className="absolute top-1/2 -left-16 -translate-y-1/2">
            <div className="relative">
            {/* Hover glow effect */}
            {(shouldShowHoverAnimation || isTransitioningToDefault) && (
              <div className={`absolute inset-0 rounded-full blur-xl scale-150 pointer-events-none transition-all duration-300 ${
                hasJustAnswered && activeQuestion
                  ? 'bg-[#7b61ff]'
                  : activeQuestion
                  ? 'bg-[#fdd686]'
                  : 'bg-[#02cced]'
              } ${isActionButtonHovered ? 'opacity-40' : isTransitioningToDefault ? 'opacity-10' : 'opacity-25'}`} />
         )}

            {/* Single Context-Aware Action Button */}
         <Button
          onClick={() => {
            // Determine which action to take based on context
            if (hasJustAnswered && activeQuestion) {
              // User has answered a question (right or wrong) - show fact check
              handleFactCheck();
            } else if (activeQuestion) {
              // Question is shown but not answered - show help
              handleHelpWithQuestion();
            } else {
              // Just watching video - show video explanation
              handleExplainVideo();
            }
          }}
          onMouseEnter={() => setIsActionButtonHovered(true)}
          onMouseLeave={() => setIsActionButtonHovered(false)}
           disabled={isLoading}
                      className={`rounded-full w-12 h-12 shadow-lg transition-all duration-300 border-0 group/action ${
              shouldShowHoverAnimation ? 'shadow-xl' : ''
            } ${
            hasJustAnswered && activeQuestion
              ? 'bg-gradient-to-r from-[#7b61ff] to-[#7b61ff]/90 hover:from-[#7b61ff]/90 hover:to-[#7b61ff]'
              : activeQuestion
              ? 'bg-gradient-to-r from-[#fdd686] to-[#fdd686]/90 hover:from-[#fdd686]/90 hover:to-[#fdd686]'
              : 'bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/90 hover:to-[#02cced]'
          } text-white ${shouldBlink ? 'animate-blink-once' : ''} ${shouldShowHoverAnimation ? 'animate-hover-bounce' : ''} ${isTransitioningToDefault ? 'animate-fade-in' : ''}`}
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
            <Search className={`h-5 w-5 transition-transform duration-300 ${isActionButtonHovered ? 'scale-125 rotate-12' : 'scale-110 rotate-6'}`} />
          ) : activeQuestion ? (
            <HelpCircle className={`h-5 w-5 transition-transform duration-300 ${isActionButtonHovered ? 'scale-125 rotate-12' : 'scale-110 rotate-6'}`} />
          ) : (
            <Video className={`h-5 w-5 transition-all ${isTransitioningToDefault ? 'opacity-80 scale-95 duration-300' : 'transition-transform duration-300 group-hover/action:scale-125 group-hover/action:rotate-12'}`} />
          )}
         </Button>
      </div>
        </div>
        )}

      {/* Main Chat Bubble Button */}
      {showCurio && (
        <div className={`relative ${!hasEntered ? 'animate-curio-entrance' : ''}`}>
          {/* Active chat indicator ring */}
          {isOpen && !isMinimized && (
            <div className="absolute inset-0 rounded-full ring-4 ring-[#02cced] ring-opacity-50 animate-pulse" />
          )}
          
      <Button
            onClick={() => {
              if (!isOpen) {
                // If chat is closed, open it
                setIsOpen(true);
                setIsMinimized(false);
              } else {
                // If chat is open, toggle minimize/maximize
                setIsMinimized(!isMinimized);
              }
            }}
            className={`curio-main-button rounded-full w-40 h-40 shadow-xl hover:shadow-2xl transition-all duration-300 bg-transparent hover:bg-transparent p-0 border-0 overflow-hidden group ${isOpen && !isMinimized ? 'ring-2 ring-[#02cced]' : ''}`}
        size="lg"
            title={!isOpen ? "Open chat" : (isMinimized ? "Maximize chat" : "Minimize chat")}
          >
          <div className="relative w-full h-full">
            {/* Glow effect behind image - enhanced when chat is open */}
            <div className={`absolute inset-0 bg-gradient-to-r from-[#02cced]/20 via-[#02cced]/10 to-[#02cced]/20 blur-xl scale-110 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
            
          <img 
            src="/Curio.gif" 
              alt="Curio" 
              className={`w-full h-full object-cover rounded-full relative z-10 transition-transform duration-300 ${isOpen ? 'scale-105' : 'group-hover:scale-105'}`}
            />
            
            {/* Floating elements around the button */}
            <div className="absolute top-4 -right-1 w-3 h-3 bg-[#02cced] rounded-full animate-pulse opacity-80" />
            <div className="absolute bottom-8 -left-1 w-2 h-2 bg-[#fdd686] rounded-full animate-pulse opacity-80" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/3 -left-2 w-2 h-2 bg-[#02cced] rounded-full animate-pulse opacity-60" style={{ animationDelay: '1s' }} />
            
            {/* Small indicator dot when chat is open */}
            {isOpen && (
              <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-lg z-20 transition-all duration-300 ${
                isMinimized ? 'bg-[#fdd686]' : 'bg-[#02cced]'
              }`} />
        )}
          </div>
      </Button>
      </div>
      )}
      </div>
    </div>
  );
} 