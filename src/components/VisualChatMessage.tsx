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
import { FactCheckMessage } from './FactCheckMessage';

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
  factCheckResult?: any; // For fact check messages
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
  const [isFullscreenLoading, setIsFullscreenLoading] = useState(false);
  const diagramRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const fullScreenDiagramRef = useRef<HTMLDivElement>(null);

  // Function to render a diagram
  const renderDiagram = async (visual: VisualContent, index: number, element: HTMLDivElement, isFullscreen = false) => {
    console.log(`🎨 Starting diagram render (${isFullscreen ? 'fullscreen' : 'normal'}) for index ${index}`);
    console.log('Element:', element);
    console.log('Visual code:', visual.code?.substring(0, 100) + '...');
    
    if (visual.type === 'mermaid' && visual.code) {
      try {
        // Show loading state for fullscreen
        if (isFullscreen) {
          setIsFullscreenLoading(true);
          element.innerHTML = `
            <div class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Rendering diagram...</p>
              </div>
            </div>
          `;
        }
        
        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clear previous content
        element.innerHTML = '';
        
        // Generate a unique ID for this render
        const graphId = `graph-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🔧 Rendering with ID:', graphId);
        
        // Render the diagram
        const { svg } = await mermaid.render(graphId, visual.code);
        console.log('✅ Mermaid render successful, SVG length:', svg.length);
        
        element.innerHTML = svg;
        
        // Make the SVG responsive
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          console.log('🎯 Found SVG element, applying styles...');
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
          
          // For fullscreen, ensure it fills the container properly
          if (isFullscreen) {
            svgElement.style.minHeight = '400px';
            svgElement.style.display = 'block';
            console.log('🖥️ Fullscreen SVG styled successfully');
          }
        } else {
          console.error('❌ No SVG element found in rendered content');
        }
        
        // Store the rendered SVG for download purposes only
        if (!isFullscreen) {
          const cacheIndex = index % 1000;
          setRenderedDiagrams(prev => new Map(prev).set(cacheIndex, svg));
        }
        
        console.log(`✅ Diagram rendered successfully (${isFullscreen ? 'fullscreen' : 'normal'})`);
        
        if (isFullscreen) {
          setIsFullscreenLoading(false);
        }
      } catch (error) {
        console.error('❌ Error rendering mermaid diagram:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        
        if (isFullscreen) {
          setIsFullscreenLoading(false);
        }
        
        element.innerHTML = `
          <div class="text-red-500 p-4 border border-red-300 rounded">
            <p class="font-semibold">Error rendering diagram</p>
            <p class="text-sm mt-1">${error instanceof Error ? error.message : 'Unknown error'}</p>
            <details class="mt-2">
              <summary class="cursor-pointer">Debug info</summary>
              <pre class="text-xs mt-1 bg-gray-100 p-2 rounded overflow-auto">
Code: ${visual.code}
Error: ${error instanceof Error ? error.stack : error}
              </pre>
            </details>
          </div>
        `;
      }
    } else {
      console.warn('⚠️ Invalid visual type or missing code:', visual.type, !!visual.code);
    }
  };

  useEffect(() => {
    // Render all mermaid diagrams in messages
    message.visuals?.forEach(async (visual, index) => {
      const element = diagramRefs.current.get(index);
      if (element) {
        console.log('Rendering diagram in message, index:', index);
        await renderDiagram(visual, index, element, false);
      }
    });
  }, [message.visuals, message.id]);

  // Render fullscreen diagram when modal opens
  useEffect(() => {
    console.log('🖥️ Fullscreen useEffect triggered:', {
      hasFullScreenVisual: !!fullScreenVisual,
      hasRef: !!fullScreenDiagramRef.current,
      fullScreenVisual: fullScreenVisual
    });
    
    if (fullScreenVisual) {
      // Keep trying until the ref is available
      const checkAndRender = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          console.log(`🔍 Attempt ${attempts + 1} to find fullscreen ref...`);
          
          if (fullScreenDiagramRef.current) {
            console.log('✅ Found fullscreen diagram ref!');
            console.log('🔄 Rendering fullscreen diagram for index:', fullScreenVisual.index);
            console.log('Diagram code preview:', fullScreenVisual.visual.code?.substring(0, 200) + '...');
            
            try {
              // Always re-render for fullscreen - this is more reliable
              await renderDiagram(fullScreenVisual.visual, fullScreenVisual.index, fullScreenDiagramRef.current, true);
              console.log('✅ Fullscreen render completed');
              return; // Success, exit the loop
            } catch (error) {
              console.error('❌ Failed to render fullscreen diagram:', error);
              return; // Error, exit the loop
            }
          }
          
          // Wait before next attempt
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        console.error('❌ Failed to find fullscreen diagram ref after', maxAttempts, 'attempts');
      };
      
      // Start checking with a small delay
      const timeoutId = setTimeout(checkAndRender, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [fullScreenVisual]);

  const toggleExpand = (index: number) => {
    const visual = message.visuals![index];
    console.log('Opening fullscreen for visual:', visual.title, 'index:', index);
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
    // Get the actual index for the cached SVG (use modulo for fullscreen)
    const cacheIndex = index % 1000;
    const svg = renderedDiagrams.get(cacheIndex);
    if (!svg) {
      console.error('No rendered SVG found for download');
      toast({
        title: "Download failed",
        description: "No diagram found to download",
        variant: "destructive",
      });
      return;
    }

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

  // Handle fact check messages
  if (message.factCheckResult) {
    return (
      <div className={`flex justify-start`}>
        <div className="max-w-[85%]">
          <FactCheckMessage 
            result={message.factCheckResult}
            question={message.factCheckResult.question}
            supposedAnswer={message.factCheckResult.supposedAnswer}
            userAnswer={message.factCheckResult.userAnswer}
          />
          <time className="text-xs text-muted-foreground mt-1 block">
            {new Date(message.timestamp).toLocaleTimeString()}
          </time>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`chat-message flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`message-content max-w-3xl ${message.isUser ? 'bg-primary text-primary-foreground' : 'bg-card dark:bg-card border border-border shadow-sm'} rounded-lg p-4`}>
          <div className={`message-text mb-2 whitespace-pre-wrap ${message.isUser ? 'text-primary-foreground' : 'text-foreground'}`}>{message.text}</div>
          
          {message.visuals && message.visuals.length > 0 && (
            <div className="visuals-container mt-4 space-y-4">
              {message.visuals.map((visual, index) => (
                <Card key={index} className="visual-card overflow-hidden bg-background dark:bg-background border border-border">
                  <div className="p-4">
                    {visual.title && (
                      <h4 className="text-lg font-semibold mb-2 text-foreground">{visual.title}</h4>
                    )}
                    
                    {visual.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {visual.description}
                      </p>
                    )}
                    
                    <div className="visual-content bg-background dark:bg-background rounded border border-border p-4 max-h-96 overflow-auto">
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
                      <div className="interaction-hints mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded">
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
          
          <div className={`message-time text-xs opacity-70 mt-2 ${message.isUser ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      <Dialog open={!!fullScreenVisual} onOpenChange={(open) => !open && closeFullScreen()}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>
              {fullScreenVisual?.visual.title || 'Diagram View'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 h-[calc(100%-80px)] overflow-auto bg-background dark:bg-background">
            {fullScreenVisual && (
              <>
                {fullScreenVisual.visual.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {fullScreenVisual.visual.description}
                  </p>
                )}
                
                {/* Loading state */}
                {isFullscreenLoading && (
                  <div className="flex items-center justify-center h-64 mb-4">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading diagram...</p>
                    </div>
                  </div>
                )}
                
                <div 
                  ref={fullScreenDiagramRef}
                                        className="mermaid-fullscreen-container flex justify-center items-center min-h-[400px] h-full w-full bg-background dark:bg-background border border-border rounded p-4"
                  style={{ minHeight: '400px' }}
                />
                
                {fullScreenVisual.visual.interactionHints && fullScreenVisual.visual.interactionHints.length > 0 && (
                  <div className="interaction-hints mt-4 text-sm text-muted-foreground text-center">
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