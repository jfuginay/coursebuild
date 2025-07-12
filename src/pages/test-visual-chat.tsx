import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VisualChatMessage } from '@/components/VisualChatMessage';

export default function TestVisualChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [testCase, setTestCase] = useState('');

  const testCases = [
    {
      id: 'process',
      message: 'How does the process of photosynthesis work?',
      description: 'Should generate a flowchart'
    },
    {
      id: 'comparison',
      message: 'What is the difference between TCP and UDP protocols?',
      description: 'Should generate a comparison chart'
    },
    {
      id: 'timeline',
      message: 'Can you show me the timeline of major events in World War II?',
      description: 'Should generate a timeline'
    },
    {
      id: 'concepts',
      message: 'How do the concepts of machine learning relate to each other?',
      description: 'Should generate a mind map'
    },
    {
      id: 'sequence',
      message: 'Explain the interaction sequence between a client and server in HTTP',
      description: 'Should generate a sequence diagram'
    }
  ];

  const sendTestMessage = async (message: string) => {
    setIsLoading(true);
    setTestCase(message);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: [],
          courseId: 'test-course',
          currentVideoTime: 60
        })
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Test failed:', error);
      setResponse({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI Chat Visual Generation Test</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Cases</CardTitle>
            <CardDescription>Click a test case to see visual generation in action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {testCases.map((test) => (
              <div key={test.id} className="space-y-1">
                <Button
                  onClick={() => sendTestMessage(test.message)}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {test.message}
                </Button>
                <p className="text-xs text-muted-foreground pl-2">{test.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>
              {isLoading ? 'Generating response...' : testCase || 'Select a test case'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response && (
              <div className="space-y-4">
                {/* Use VisualChatMessage component to properly render the response with visuals */}
                <VisualChatMessage
                  message={{
                    id: Date.now().toString(),
                    text: response.response,
                    isUser: false,
                    timestamp: new Date(),
                    visuals: response.visuals
                  }}
                  onVisualInteraction={(visual, action) => {
                    console.log('Visual interaction:', action, visual);
                  }}
                />

                {response.visualContext && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2 text-sm">Debug Info - Visual Context:</h3>
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {JSON.stringify(response.visualContext, null, 2)}
                    </pre>
                  </div>
                )}

                {response.error && (
                  <div className="text-red-500 mt-4">
                    <h3 className="font-semibold mb-2">Error:</h3>
                    <p className="text-sm">{response.error}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>User asks a question that would benefit from a visual explanation</li>
            <li>AI chat assistant detects the need for a visual (pattern matching + LLM analysis)</li>
            <li>Visual generator creates appropriate Mermaid diagram based on context</li>
            <li>Frontend renders both text response and interactive diagram</li>
            <li>User can interact with diagram (expand, copy, download, save to notes)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
} 