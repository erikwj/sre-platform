import { useState } from 'react';
import { Bot, Sparkles, X, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Postmortem } from './types';

export function AIChatbot({
  postmortem,
  incidentId
}: {
  postmortem: Postmortem;
  incidentId: string
}) {
  const [showChatbot, setShowChatbot] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  const sendMessage = async () => {
    if (!currentMessage.trim() || !postmortem || aiLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: currentMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setAiLoading(true);

    try {
      const response = await fetch(`/api/incidents/${incidentId}/postmortem/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          question: userMessage.content,
          postmortem,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');
      const data = await response.json();
      
      const aiMessage = {
        role: 'assistant' as const,
        content: data.answer,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error asking AI:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Failed to get AI response. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      {/* Floating AI Assistant Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-accent-purple text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 flex items-center justify-center z-40"
          aria-label="Open AI Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chatbot Popup */}
      {showChatbot && (
        <div
          className={`fixed bottom-6 right-6 bg-white border border-border rounded-lg shadow-2xl flex flex-col z-50 transition-all duration-300 ${
            isExpanded ? 'w-[800px] h-[80vh]' : 'w-[600px] h-[700px]'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-accent-purple text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="hover:bg-purple-700 rounded p-1 transition-colors"
                aria-label={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowChatbot(false)}
                className="hover:bg-purple-700 rounded p-1 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-text-secondary text-sm py-8">
                <Bot className="w-12 h-12 mx-auto mb-3 text-accent-purple opacity-50" />
                <p className="mb-2">Hi! I'm your AI assistant.</p>
                <p>Ask me anything about this postmortem.</p>
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-accent-purple" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-accent-purple text-white'
                        : 'bg-background text-text-primary border border-border'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="text-sm prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-strong:font-semibold prose-strong:text-text-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-purple-200' : 'text-text-secondary'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-status-info/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-status-info">You</span>
                    </div>
                  )}
                </div>
              ))
            )}
            {aiLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-accent-purple" />
                </div>
                <div className="bg-background text-text-primary border border-border rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-purple" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask about the postmortem..."
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple"
                disabled={aiLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || aiLoading}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
