"use client"

export function LoopbrainDiagram() {
  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="relative">
        {/* User Interaction Layer */}
        <div className="mb-8 md:mb-12 text-center">
          <div className="inline-block p-4 md:p-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg border-2 border-blue-500/40 shadow-lg shadow-blue-500/20">
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">User Interaction Layer</h3>
            <p className="text-slate-300 text-xs md:text-sm">User issues a question, request, or command inside Loopwell</p>
          </div>
        </div>

        {/* Arrow down from User */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative w-1 h-12 md:h-16">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/60 to-purple-500/60"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-purple-500/60"></div>
          </div>
        </div>

        {/* Loopbrain Core */}
        <div className="mb-8 md:mb-12 text-center">
          <div className="inline-block p-6 md:p-8 bg-gradient-to-br from-purple-500/30 via-indigo-500/30 to-blue-500/30 rounded-xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/30">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-purple-400 rounded-full animate-pulse"></div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Loopbrain</h2>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-purple-400 rounded-full animate-pulse"></div>
            </div>
            <p className="text-slate-300 text-xs md:text-sm max-w-md mx-auto">
              Parses intent, retrieves context, synthesizes output
            </p>
          </div>
        </div>

        {/* Context Providers - Grid Layout */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
          {/* Spaces AI Layer */}
          <div className="p-4 md:p-6 bg-green-500/10 rounded-lg border-2 border-green-500/30 relative">
            <div className="absolute -top-2 md:-top-3 left-4 md:left-6 bg-green-500 px-2 md:px-3 py-1 rounded-full text-xs font-semibold text-white">
              Context Provider
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-2 md:mb-3 mt-3 md:mt-2">Spaces AI Layer</h3>
            <ul className="text-xs md:text-sm text-slate-300 space-y-1 mb-2 md:mb-3">
              <li>• Pages, docs, tasks</li>
              <li>• Epics, project status</li>
            </ul>
            <p className="text-xs text-green-400 font-semibold">Operational context</p>
          </div>

          {/* Org AI Layer */}
          <div className="p-4 md:p-6 bg-blue-500/10 rounded-lg border-2 border-blue-500/30 relative">
            <div className="absolute -top-2 md:-top-3 left-4 md:left-6 bg-blue-500 px-2 md:px-3 py-1 rounded-full text-xs font-semibold text-white">
              Context Provider
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-2 md:mb-3 mt-3 md:mt-2">Org AI Layer</h3>
            <ul className="text-xs md:text-sm text-slate-300 space-y-1 mb-2 md:mb-3">
              <li>• Org chart, role cards</li>
              <li>• Positions, reporting lines</li>
            </ul>
            <p className="text-xs text-blue-400 font-semibold">People context</p>
          </div>

          {/* Dashboard AI Layer */}
          <div className="p-4 md:p-6 bg-orange-500/10 rounded-lg border-2 border-orange-500/30 relative">
            <div className="absolute -top-2 md:-top-3 left-4 md:left-6 bg-orange-500 px-2 md:px-3 py-1 rounded-full text-xs font-semibold text-white">
              Context Provider
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-2 md:mb-3 mt-3 md:mt-2">Dashboard AI Layer</h3>
            <ul className="text-xs md:text-sm text-slate-300 space-y-1 mb-2 md:mb-3">
              <li>• Calendar events, meetings</li>
              <li>• Slack/Google integrations</li>
            </ul>
            <p className="text-xs text-orange-400 font-semibold">Real-time workflow context</p>
          </div>

          {/* System Activity Layer */}
          <div className="p-4 md:p-6 bg-pink-500/10 rounded-lg border-2 border-pink-500/30 relative">
            <div className="absolute -top-2 md:-top-3 left-4 md:left-6 bg-pink-500 px-2 md:px-3 py-1 rounded-full text-xs font-semibold text-white">
              Context Provider
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-2 md:mb-3 mt-3 md:mt-2">System Activity Layer</h3>
            <ul className="text-xs md:text-sm text-slate-300 space-y-1 mb-2 md:mb-3">
              <li>• User actions, updates</li>
              <li>• Priorities, behavior</li>
            </ul>
            <p className="text-xs text-pink-400 font-semibold">Behavioral context</p>
          </div>
        </div>

        {/* Connecting SVG arrows from context providers to Loopbrain */}
        <div className="hidden md:block absolute top-24 left-0 right-0 h-80 pointer-events-none">
          <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="rgba(34, 197, 94, 0.6)" />
              </marker>
              <marker id="arrowhead-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="rgba(59, 130, 246, 0.6)" />
              </marker>
              <marker id="arrowhead-orange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="rgba(249, 115, 22, 0.6)" />
              </marker>
              <marker id="arrowhead-pink" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="rgba(236, 72, 153, 0.6)" />
              </marker>
            </defs>
            {/* Lines from context providers to center Loopbrain */}
            <line x1="12.5%" y1="95%" x2="50%" y2="15%" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="2" markerEnd="url(#arrowhead-green)" />
            <line x1="37.5%" y1="95%" x2="50%" y2="15%" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="2" markerEnd="url(#arrowhead-blue)" />
            <line x1="62.5%" y1="95%" x2="50%" y2="15%" stroke="rgba(249, 115, 22, 0.5)" strokeWidth="2" markerEnd="url(#arrowhead-orange)" />
            <line x1="87.5%" y1="95%" x2="50%" y2="15%" stroke="rgba(236, 72, 153, 0.5)" strokeWidth="2" markerEnd="url(#arrowhead-pink)" />
          </svg>
        </div>

        {/* Arrow down from Context Providers to Pipeline */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative w-1 h-12 md:h-16">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 to-indigo-500/60"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-indigo-500/60"></div>
          </div>
        </div>

        {/* AI Processing Pipeline */}
        <div className="mb-8 md:mb-12">
          <h3 className="text-lg md:text-xl font-bold text-white text-center mb-4 md:mb-6">AI Processing Pipeline</h3>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <div className="p-3 md:p-4 bg-purple-500/10 rounded-lg border-2 border-purple-500/30">
              <p className="text-xs md:text-sm font-semibold text-white">Intent Detection</p>
            </div>
            <div className="w-6 md:w-8 h-0.5 bg-purple-500/60 flex items-center">
              <div className="w-0 h-0 border-l-4 border-l-purple-500/60 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto"></div>
            </div>
            <div className="p-3 md:p-4 bg-blue-500/10 rounded-lg border-2 border-blue-500/30">
              <p className="text-xs md:text-sm font-semibold text-white">Context Retrieval</p>
            </div>
            <div className="w-6 md:w-8 h-0.5 bg-blue-500/60 flex items-center">
              <div className="w-0 h-0 border-l-4 border-l-blue-500/60 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto"></div>
            </div>
            <div className="p-3 md:p-4 bg-indigo-500/10 rounded-lg border-2 border-indigo-500/30">
              <p className="text-xs md:text-sm font-semibold text-white">Cross-feature Synthesis</p>
            </div>
            <div className="w-6 md:w-8 h-0.5 bg-indigo-500/60 flex items-center">
              <div className="w-0 h-0 border-l-4 border-l-indigo-500/60 border-t-2 border-t-transparent border-b-2 border-b-transparent ml-auto"></div>
            </div>
            <div className="p-3 md:p-4 bg-pink-500/10 rounded-lg border-2 border-pink-500/30">
              <p className="text-xs md:text-sm font-semibold text-white">Output Generation</p>
            </div>
          </div>
        </div>

        {/* Arrow down from Pipeline */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative w-1 h-12 md:h-16">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 to-indigo-500/60"></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-indigo-500/60"></div>
          </div>
        </div>

        {/* Output Layer */}
        <div>
          <h3 className="text-lg md:text-xl font-bold text-white text-center mb-4 md:mb-6">Output Layer</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {[
              "Project Summary",
              "Status Update",
              "Policy Draft",
              "Insights",
              "Recommendations",
              "Action Items"
            ].map((output, idx) => (
              <div key={idx} className="p-3 md:p-4 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg border border-indigo-500/30 text-center">
                <p className="text-xs md:text-sm font-semibold text-white">{output}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

