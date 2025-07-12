import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Minus, Send, Bot, HelpCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { VisualChatMessage } from './VisualChatMessage';

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
}

interface ChatBubbleProps {
  className?: string;
  courseId?: string;
  currentVideoTime?: number;
  activeQuestion?: {
    question: string;
    type: string;
    options: string[];
  } | null;
}

export default function ChatBubble({ className, courseId, currentVideoTime, activeQuestion }: ChatBubbleProps) {
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
        conversationHistoryLength: messages.length
      });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        conversationHistoryLength: messages.length
      });
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                <h3 className="text-sm font-semibold">CourseForge AI</h3>
                <p className="text-xs opacity-90">Visual Learning Assistant</p>
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
                 {/* Help with Question Button - Only visible when there's an active question */}
         {activeQuestion && (
           <Button
             onClick={handleHelpWithQuestion}
             disabled={isLoading}
             className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 bg-orange-500 hover:bg-orange-600 text-white"
             size="lg"
             title="Help me with this question"
           >
             <HelpCircle className="h-5 w-5" />
           </Button>
         )}

         {/* Explain Video Button */}
         <Button
           onClick={handleExplainVideo}
           disabled={isLoading}
           className="rounded-full w-12 h-12 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
           size="lg"
           title="Explain what's happened in the video"
         >
           <Video className="h-5 w-5" />
         </Button>
      </div>

      {/* Main Chat Bubble Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
        size="lg"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
} 