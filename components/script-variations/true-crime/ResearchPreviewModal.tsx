'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Brain, Lightbulb, Target } from "lucide-react"

interface ResearchPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  researchContext: string
  appliedResearchCount: number
}

export function ResearchPreviewModal({
  isOpen,
  onClose,
  researchContext,
  appliedResearchCount
}: ResearchPreviewModalProps) {
  // Parse the research context to make it more visually appealing
  const parseResearchSections = (context: string) => {
    if (!context) return []
    
    const sections = context.split('---').map(section => section.trim()).filter(Boolean)
    
    return sections.map((section, index) => {
      const lines = section.split('\n').filter(line => line.trim())
      const title = lines[0]?.replace(/Analysis \d+:\s*/, '') || `Research ${index + 1}`
      
      const content = {
        title,
        theme: '',
        insights: [] as string[],
        characterInsights: [] as string[],
        conflicts: [] as string[],
        storyIdeas: [] as string[],
        creativePrompt: ''
      }
      
      let currentSection = ''
      
      lines.forEach(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('Overall Theme:')) {
          content.theme = trimmed.replace('Overall Theme:', '').trim()
        } else if (trimmed === 'Key Insights:') {
          currentSection = 'insights'
        } else if (trimmed === 'Character Insights:') {
          currentSection = 'characterInsights'
        } else if (trimmed === 'Dramatic Conflicts:') {
          currentSection = 'conflicts'
        } else if (trimmed === 'Story Ideas:') {
          currentSection = 'storyIdeas'
        } else if (trimmed.startsWith('Creative Prompt:')) {
          content.creativePrompt = trimmed.replace('Creative Prompt:', '').trim()
        } else if (trimmed.match(/^\d+\.\s+/)) {
          const text = trimmed.replace(/^\d+\.\s+/, '')
          if (currentSection && content[currentSection as keyof typeof content]) {
            (content[currentSection as keyof typeof content] as string[]).push(text)
          }
        }
      })
      
      return content
    })
  }

  const researchSections = parseResearchSections(researchContext)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Research Context Preview
          </DialogTitle>
          <DialogDescription>
            This is exactly what research context will be provided to the AI when generating your script.
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="h-3 w-3 mr-1" />
                {appliedResearchCount} Research Item{appliedResearchCount !== 1 ? 's' : ''} Applied
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {researchContext.length} Characters
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {!researchContext ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No Research Applied</p>
              <p className="text-sm">Apply research from the YouTube Research Assistant to see the context here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">🧠 AI Context Information</h3>
                <p className="text-sm text-blue-700">
                  This research data will be automatically included when generating your script to ensure it's backed by insights and analysis.
                </p>
              </div>

              {/* Research Sections */}
              {researchSections.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-2">
                    📚 YOUTUBE VIDEO ANALYSIS
                  </h4>
                  
                  {researchSections.map((section, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                          Analysis {index + 1}
                        </span>
                        {section.title}
                      </h5>
                      
                      {section.theme && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 mb-1">Overall Theme:</div>
                          <div className="text-gray-600 bg-gray-50 p-2 rounded text-sm">{section.theme}</div>
                        </div>
                      )}
                      
                      {section.insights.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Key Insights:
                          </div>
                          <ul className="space-y-1">
                            {section.insights.map((insight, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-blue-500 font-bold text-xs mt-1">{i + 1}.</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.characterInsights.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <span className="text-purple-500">👥</span>
                            Character Insights:
                          </div>
                          <ul className="space-y-1">
                            {section.characterInsights.map((insight, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-purple-500 font-bold text-xs mt-1">{i + 1}.</span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.conflicts.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <span className="text-red-500">⚡</span>
                            Dramatic Conflicts:
                          </div>
                          <ul className="space-y-1">
                            {section.conflicts.map((conflict, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-red-500 font-bold text-xs mt-1">{i + 1}.</span>
                                <span>{conflict}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.storyIdeas.length > 0 && (
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                            <Target className="h-4 w-4 text-green-500" />
                            Story Ideas:
                          </div>
                          <ul className="space-y-1">
                            {section.storyIdeas.map((idea, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-green-500 font-bold text-xs mt-1">{i + 1}.</span>
                                <span>{idea}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.creativePrompt && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded border border-purple-200">
                          <div className="font-medium text-purple-700 mb-1 flex items-center gap-1">
                            <span className="text-purple-500">✨</span>
                            Creative Prompt:
                          </div>
                          <div className="text-sm text-purple-600">{section.creativePrompt}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-gray-700 mb-2">Raw Research Context:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-white p-3 rounded border overflow-auto max-h-40">
                    {researchContext}
                  </pre>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 