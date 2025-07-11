import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Download, Maximize2, Minimize2, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VisualContent {
  type: 'mermaid' | 'chart' | 'table' | 'mindmap';
  code: string;
  title?: string;
  description?: string;
  interactionHints?: string[];
}

interface EnhancedChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  visuals?: VisualContent[];
}

interface VisualChatMessageProps {
  message: EnhancedChatMessage;
  onVisualInteraction?: (visual: VisualContent, action: string) => void;
}

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  themeVariables: {
    primaryColor: '#ff6b6b',
    primaryTextColor: '#fff',
    primaryBorderColor: '#ff5252',
    lineColor: '#5c7cfa',
    secondaryColor: '#4ecdc4',
    tertiaryColor: '#ffe66d'
  }
});

export function VisualChatMessage({ 
  message, 
  onVisualInteraction 
}: VisualChatMessageProps) {
  const [expandedVisuals, setExpandedVisuals] = useState<Set<number>>(new Set());
  const [fullScreenVisual, setFullScreenVisual] = useState<{ index: number; visual: VisualContent } | null>(null);
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<number, string>>(new Map());
  const diagramRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const fullScreenDiagramRef = useRef<HTMLDivElement>(null);

  // Function to render a diagram
  const renderDiagram = async (visual: VisualContent, index: number, element: HTMLDivElement) => {
    if (visual.type === 'mermaid' && visual.code) {
      try {
        // Clear previous content
        element.innerHTML = '';
        
        // Generate a unique ID for this render
        const graphId = `graph-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(graphId, visual.code);
        element.innerHTML = svg;
        
        // Make the SVG responsive
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          // Remove fixed width/height attributes
          svgElement.removeAttribute('width');
          svgElement.removeAttribute('height');
          // Add viewBox if not present
          if (!svgElement.hasAttribute('viewBox')) {
            const bbox = svgElement.getBBox();
            svgElement.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
          }
          // Add responsive styling
          svgElement.style.width = '100%';
          svgElement.style.height = '100%';
          svgElement.style.maxWidth = '100%';
        }
        
        // Store the rendered SVG
        setRenderedDiagrams(prev => new Map(prev).set(index, svg));
      } catch (error) {
        console.error('Error rendering mermaid diagram:', error);
        element.innerHTML = `
          <div class="text-red-500 p-4 border border-red-300 rounded">
            <p class="font-semibold">Error rendering diagram</p>
            <p class="text-sm mt-1">${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        `;
      }
    }
  };

  useEffect(() => {
    // Render all mermaid diagrams in messages
    message.visuals?.forEach(async (visual, index) => {
      const element = diagramRefs.current.get(index);
      if (element) {
        await renderDiagram(visual, index, element);
      }
    });
  }, [message.visuals, message.id]);

  // Render fullscreen diagram when modal opens
  useEffect(() => {
    if (fullScreenVisual && fullScreenDiagramRef.current) {
      renderDiagram(fullScreenVisual.visual, fullScreenVisual.index, fullScreenDiagramRef.current);
    }
  }, [fullScreenVisual]);

  const toggleExpand = (index: number) => {
    const visual = message.visuals![index];
    setFullScreenVisual({ index, visual });
    onVisualInteraction?.(visual, 'fullscreen_expand');
  };

  const closeFullScreen = () => {
    if (fullScreenVisual) {
      onVisualInteraction?.(fullScreenVisual.visual, 'fullscreen_close');
    }
    setFullScreenVisual(null);
  };

  const copyDiagram = async (visual: VisualContent, index: number) => {
    try {
      await navigator.clipboard.writeText(visual.code);
      toast({
        title: "Copied!",
        description: "Diagram code copied to clipboard",
      });
      onVisualInteraction?.(visual, 'copy');
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadDiagram = (visual: VisualContent, index: number) => {
    const svg = renderedDiagrams.get(index);
    if (!svg) return;

    // Create a blob from the SVG
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `${visual.title?.replace(/\s+/g, '-') || 'diagram'}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onVisualInteraction?.(visual, 'download');
  };

  const saveToNotes = (visual: VisualContent) => {
    // This would integrate with a notes system
    console.log('Saving to notes:', visual);
    toast({
      title: "Saved to notes",
      description: "Diagram has been added to your study notes",
    });
    onVisualInteraction?.(visual, 'save_to_notes');
  };

  return (
    <>
      <div className={`chat-message flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`message-content max-w-3xl ${message.isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800'} rounded-lg p-4`}>
          <div className="message-text mb-2 whitespace-pre-wrap">{message.text}</div>
          
          {message.visuals && message.visuals.length > 0 && (
            <div className="visuals-container mt-4 space-y-4">
              {message.visuals.map((visual, index) => (
                <Card key={index} className="visual-card overflow-hidden">
                  <div className="p-4">
                    {visual.title && (
                      <h4 className="text-lg font-semibold mb-2">{visual.title}</h4>
                    )}
                    
                    {visual.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {visual.description}
                      </p>
                    )}
                    
                    <div className="visual-content bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-auto">
                      {visual.type === 'mermaid' && (
                        <div 
                          ref={(el) => {
                            if (el) diagramRefs.current.set(index, el);
                          }}
                          className="mermaid-container flex justify-center items-center min-h-[200px]"
                        />
                      )}
                    </div>
                    
                    {visual.interactionHints && visual.interactionHints.length > 0 && (
                      <div className="interaction-hints mt-3 text-sm text-gray-600 dark:text-gray-400">
                        {visual.interactionHints.map((hint, i) => (
                          <span key={i} className="block">💡 {hint}</span>
                        ))}
                      </div>
                    )}
                    
                    <div className="visual-actions mt-4 flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpand(index)}
                        className="flex items-center gap-1"
                      >
                        <Maximize2 className="w-4 h-4" />
                        Full Screen
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyDiagram(visual, index)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Code
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDiagram(visual, index)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveToNotes(visual)}
                      >
                        Save to Notes
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          <div className="message-time text-xs opacity-70 mt-2">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!fullScreenVisual} onOpenChange={(open) => !open && closeFullScreen()}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>
                {fullScreenVisual?.visual.title || 'Diagram View'}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeFullScreen}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 h-[calc(100%-80px)] overflow-auto bg-white dark:bg-gray-900">
            {fullScreenVisual && (
              <>
                {fullScreenVisual.visual.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {fullScreenVisual.visual.description}
                  </p>
                )}
                <div 
                  ref={fullScreenDiagramRef}
                  className="mermaid-fullscreen-container flex justify-center items-center min-h-[400px] h-full"
                />
                {fullScreenVisual.visual.interactionHints && fullScreenVisual.visual.interactionHints.length > 0 && (
                  <div className="interaction-hints mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    {fullScreenVisual.visual.interactionHints.map((hint, i) => (
                      <span key={i} className="block">💡 {hint}</span>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyDiagram(fullScreenVisual.visual, fullScreenVisual.index)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadDiagram(fullScreenVisual.visual, fullScreenVisual.index)}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download SVG
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 