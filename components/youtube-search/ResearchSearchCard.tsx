'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Globe, Brain, ExternalLink, Zap } from 'lucide-react'
import { addYouTubeResearchSummary } from '@/lib/features/youtube/youtubeSlice'

interface ResearchSearchCardProps {
  researchSummaries: any
  dispatch: any
}

export function ResearchSearchCard({
  researchSummaries,
  dispatch
}: ResearchSearchCardProps) {
  const [researchQuery, setResearchQuery] = useState('')
  const [researchContext, setResearchContext] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const [filteringStats, setFilteringStats] = useState<any>(null)
  const [availableLinks, setAvailableLinks] = useState<any[]>([])
  const [scrapingLinks, setScrapingLinks] = useState<Set<string>>(new Set())

  const handlePerplexityResearch = async () => {
    if (!researchQuery.trim()) return

    setIsResearching(true)
    setFilteringStats(null)
    setAvailableLinks([])
    
    try {
      console.log('🔍 Starting Perplexity research...')
      
      const response = await fetch('/api/research/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: researchQuery,
          context: researchContext,
          maxResults: 20,
          region: 'us',
          language: 'en'
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to perform Perplexity research')
      }

      console.log('✅ Perplexity research completed')

      // Store filtering stats and available links
      if (data.filteringStats) {
        setFilteringStats(data.filteringStats)
      }
      if (data.availableLinks) {
        setAvailableLinks(data.availableLinks)
      }

      // Show success notification - Perplexity only provides links, no research card created
      alert(`✅ Perplexity research completed! Found ${data.availableLinks?.length || 0} scrapeable links. Click "Scrape Content" on any link to create research cards.`)

      // Clear form after successful research
      setResearchQuery('')
      setResearchContext('')
      
    } catch (error) {
      console.error('Perplexity research error:', error)
      alert(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsResearching(false)
    }
  }

  const handleScrapeLink = async (url: string) => {
    if (scrapingLinks.has(url)) return

    setScrapingLinks(prev => new Set([...prev, url]))
    
    try {
      console.log(`🔥 Starting Firecrawl scraping for: ${url}`)
      
      const response = await fetch('/api/research/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to scrape link')
      }

      console.log('✅ Firecrawl scraping completed')

             // Process the scraped content to extract meaningful insights with quotes
       const processContent = (content: string, title: string) => {
         if (!content) return null
         
         const cleanTitle = title.replace(' - Wikipedia', '').replace(/\s+/g, ' ').trim()
         
         // Extract sentences and clean them
         const sentences = content.split(/[.!?]+/)
           .map(s => s.trim())
           .filter(s => s.length > 30 && s.length < 300)
           .filter(s => !s.match(/^(See also|References|External links|Categories?:|File:|Image:)/i))
         
         // Extract meaningful quotes (sentences with specific patterns)
         const importantQuotes = sentences.filter(sentence => {
           const s = sentence.toLowerCase()
           return (
             s.includes('founded') || s.includes('established') || s.includes('created') ||
             s.includes('million') || s.includes('billion') || s.includes('record') ||
             s.includes('first') || s.includes('largest') || s.includes('most') ||
             s.includes('won') || s.includes('achieved') || s.includes('success') ||
             s.includes('known for') || s.includes('famous for') || s.includes('recognized')
           )
         }).slice(0, 5)
         
         // Extract key insights with more context
         const detailedInsights: string[] = []
         
         // Add founding/creation info
         const foundingInfo = sentences.find(s => 
           s.toLowerCase().includes('founded') || 
           s.toLowerCase().includes('established') || 
           s.toLowerCase().includes('created')
         )
         if (foundingInfo) detailedInsights.push(`📅 Origin: ${foundingInfo}`)
         
         // Add achievement info
         const achievements = sentences.filter(s => {
           const lower = s.toLowerCase()
           return lower.includes('won') || lower.includes('record') || lower.includes('championship') || 
                  lower.includes('title') || lower.includes('award') || lower.includes('success')
         }).slice(0, 2)
         achievements.forEach(achievement => detailedInsights.push(`🏆 Achievement: ${achievement}`))
         
         // Add significant facts with numbers
         const factualInfo = sentences.filter(s => {
           return /\d/.test(s) && (
             s.toLowerCase().includes('million') || 
             s.toLowerCase().includes('billion') || 
             s.toLowerCase().includes('year') ||
             s.toLowerCase().includes('member') ||
             s.toLowerCase().includes('player')
           )
         }).slice(0, 2)
         factualInfo.forEach(fact => detailedInsights.push(`📊 Key Fact: ${fact}`))
         
         // Add general important insights
         const otherInsights = sentences
           .filter(s => !detailedInsights.some(insight => insight.includes(s)))
           .filter(s => s.length > 50)
           .slice(0, 3)
         otherInsights.forEach(insight => detailedInsights.push(`💡 Insight: ${insight}`))
         
         // Extract character/entity mentions with context
         const entityPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
         const entities = content.match(entityPattern) || []
         const entityCounts: Record<string, number> = {}
         const entityContexts: Record<string, string[]> = {}
         
         entities.forEach(entity => {
           if (entity.length > 2 && !['The', 'This', 'That', 'With', 'From', 'When', 'Where', 'What', 'Who', 'How', 'Why'].includes(entity)) {
             entityCounts[entity] = (entityCounts[entity] || 0) + 1
             
             // Find sentences mentioning this entity
             const contextSentences = sentences.filter(s => s.includes(entity)).slice(0, 1)
             if (contextSentences.length > 0 && !entityContexts[entity]) {
               entityContexts[entity] = contextSentences
             }
           }
         })
         
         const keyCharacters = Object.entries(entityCounts)
           .filter(([name, count]) => count >= 2 && name !== cleanTitle)
           .sort(([_, a], [__, b]) => b - a)
           .slice(0, 6)
           .map(([name, count]) => {
             const context = entityContexts[name]?.[0] || ''
             const shortContext = context.length > 100 ? context.substring(0, 100) + '...' : context
             return `👤 ${name}: ${shortContext || `Mentioned ${count} times throughout the article`}`
           })
         
         // Extract conflicts/challenges with context
         const conflictKeywords = ['challenge', 'problem', 'issue', 'struggle', 'difficulty', 'obstacle', 'conflict', 'controversy', 'debate', 'criticism', 'failure', 'setback', 'crisis', 'dispute', 'rivalry', 'competition', 'opposition', 'scandal', 'lawsuit', 'investigation']
         
         const conflicts = sentences.filter(sentence => 
           conflictKeywords.some(keyword => 
             sentence.toLowerCase().includes(keyword)
           )
         ).slice(0, 4).map(conflict => `⚡ ${conflict}`)
         
         // Generate detailed story ideas based on actual content
         const contentBasedStoryIdeas = []
         
         if (foundingInfo) {
           contentBasedStoryIdeas.push(`🎬 "From Humble Beginnings": The founding story and early challenges`)
         }
         
         if (achievements.length > 0) {
           contentBasedStoryIdeas.push(`🏅 "Rise to Glory": Key achievements and breakthrough moments`)
         }
         
         if (conflicts.length > 0) {
           contentBasedStoryIdeas.push(`🌪️ "Overcoming Adversity": Major challenges and how they were handled`)
         }
         
         contentBasedStoryIdeas.push(`🔍 "Behind the Scenes": Lesser-known facts and insider perspectives`)
         contentBasedStoryIdeas.push(`🚀 "Future Vision": Current developments and what's next`)
         contentBasedStoryIdeas.push(`👥 "Human Stories": Personal narratives of key figures involved`)
         
         // Extract themes from content
         const words = content.toLowerCase().split(/\s+/)
         const themeKeywords = ['story', 'history', 'background', 'founded', 'created', 'developed', 'evolution', 'journey', 'transformation', 'legacy', 'tradition', 'culture', 'values', 'mission', 'vision', 'success', 'achievement', 'innovation', 'breakthrough', 'impact', 'influence']
         const foundThemes = themeKeywords.filter(keyword => words.includes(keyword))
         
         // Generate comprehensive creative prompt
         const creativePrompt = `Create compelling narrative content about ${cleanTitle} that weaves together ${foundThemes.slice(0, 3).join(', ') || 'key themes'} with human interest elements. ${importantQuotes.length > 0 ? `Highlight key facts like: "${importantQuotes[0]?.substring(0, 100)}..."` : ''} Focus on storytelling that makes ${cleanTitle} relatable and engaging to a broad audience, emphasizing the journey, challenges overcome, and lasting impact.`
         
         // Detailed actionable items based on content analysis
         const actionableItems = [
           `📝 Script Hook: Use founding story or key achievement as opening`,
           `🎯 Focus Areas: ${foundThemes.slice(0, 3).join(', ') || 'key themes identified'}`,
           `💬 Quote Integration: Incorporate ${importantQuotes.length} verified facts and quotes`,
           `🎭 Character Development: Feature ${keyCharacters.length} key figures with context`,
           `📈 Visual Opportunities: ${factualInfo.length} data points available for graphics`,
           `🔥 Conflict/Drama: ${conflicts.length} tension points identified for narrative arc`
         ]
         
         return {
           overallTheme: `${cleanTitle}: ${sentences.find(s => s.length > 50 && s.length < 150)?.substring(0, 120) || 'Comprehensive analysis of key aspects, achievements, and significance'}...`,
           keyInsights: detailedInsights.length > 0 ? detailedInsights : [`📖 Comprehensive analysis of ${cleanTitle} with ${sentences.length} key facts extracted`],
           actionableItems: actionableItems,
           characterInsights: keyCharacters.length > 0 ? keyCharacters : [`👥 Key figures and entities related to ${cleanTitle} identified for character development`],
           conflictElements: conflicts.length > 0 ? conflicts : [`⚡ Challenges and developments in ${cleanTitle}'s story explored for dramatic tension`],
           storyIdeas: contentBasedStoryIdeas,
           creativePrompt: creativePrompt
         }
       }

      const processedSummary = processContent(data.content || '', data.title)
      
      // Create scraped content summary with real insights
      const scrapedResearch = {
        id: `scraped-${Date.now()}`,
        query: `Article Analysis: ${data.title}`,
        videosSummary: processedSummary || {
          overallTheme: `${data.title.replace(' - Wikipedia', '')}: Basic content analysis completed`,
          keyInsights: ['📖 Article content extracted and processed via Firecrawl for detailed analysis'],
          actionableItems: ['📝 Review extracted content for script development', '🎯 Identify key narrative elements'],
          characterInsights: ['👥 Key figures and entities identified in article content'],
          conflictElements: ['⚡ Challenges and developments explored in article'],
          storyIdeas: [
            '🎬 "From Humble Beginnings": Origin story and early development',
            '🏅 "Rise to Glory": Key achievements and milestones',
            '🔍 "Behind the Scenes": Lesser-known facts and insights'
          ],
          creativePrompt: `Create compelling narrative content about ${data.title.replace(' - Wikipedia', '')} focusing on its unique story, key achievements, and lasting impact. Emphasize human elements and what makes this subject fascinating to audiences.`
        },
        timestamp: new Date().toISOString(),
        usingMock: false,
        appliedToScript: false,
        analysisType: 'firecrawl-scraping' as any,
        rawContent: data.content || '' // Raw markdown content from Firecrawl
      }

      // Add to research summaries using proper action creator
      dispatch(addYouTubeResearchSummary(scrapedResearch))

      // Show success notification
      alert(`✅ Article scraped successfully! "${data.title}" saved to Current Research tab.`)

      // Remove the link from available links
      setAvailableLinks(prev => prev.filter(link => link.url !== url))
      
    } catch (error) {
      console.error('Link scraping error:', error)
      alert(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setScrapingLinks(prev => {
        const newSet = new Set(prev)
        newSet.delete(url)
        return newSet
      })
    }
  }

  const handleResearch = () => {
    handlePerplexityResearch()
  }

  const toggleResultExpansion = (resultId: string) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId)
    } else {
      newExpanded.add(resultId)
    }
    setExpandedResults(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Research Input Section */}
      <div className="bg-gray-900 text-white p-6 rounded-lg border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="h-6 w-6" />
          AI Research Assistant
        </h3>
        
        <div className="space-y-4">
          {/* Research Method */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <div>
                <div className="font-medium text-purple-300">Perplexity AI Research</div>
                <div className="text-xs text-purple-400">Intelligent web search with automatic link scraping</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">
              Research Query
            </label>
            <input
              type="text"
              value={researchQuery}
              onChange={(e) => setResearchQuery(e.target.value)}
              placeholder="What would you like to research? (e.g., 'AI in healthcare', 'climate change solutions')"
              className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">
              Research Context (Optional)
            </label>
            <textarea
              value={researchContext}
              onChange={(e) => setResearchContext(e.target.value)}
              placeholder="Provide additional context for your research (e.g., 'Focus on recent developments', 'Looking for business applications', etc.)"
              rows={3}
              className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button
            onClick={handleResearch}
            disabled={!researchQuery.trim() || isResearching}
            className="w-full font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white"
          >
            {isResearching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Researching with Perplexity AI...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Start Perplexity AI Research
              </>
            )}
          </button>

          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-300">
                <p className="font-medium">Perplexity AI Research</p>
                <p className="mt-1">
                  Uses advanced AI to search the web, filter out social media links, and provide scraping capabilities for deep content analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtering Stats Notice */}
      {filteringStats && filteringStats.filteredOut > 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-300">
              <p className="font-medium">Links Filtered for Scraping</p>
              <p className="mt-1">
                Found {filteringStats.totalFound} links, {filteringStats.availableForScraping} available for scraping. 
                Filtered out {filteringStats.filteredOut} social media links ({filteringStats.filteredDomains.join(', ')}) 
                - {filteringStats.reason}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Available Links for Scraping */}
      {availableLinks.length > 0 && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <h4 className="text-lg font-bold text-green-200 mb-3 flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Available Links for Deep Analysis ({availableLinks.length})
          </h4>
          <p className="text-sm text-green-300 mb-4">
            These links can be scraped for detailed content analysis. Click "Scrape Content" to extract full article text.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableLinks.map((link: any, index: number) => (
              <div key={index} className="bg-gray-800 border border-green-600 rounded p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-green-200 truncate">
                      {link.title}
                    </h5>
                    <p className="text-xs text-green-400 truncate">
                      {link.source} • {link.date}
                    </p>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 underline truncate block mt-1"
                    >
                      {link.url}
                    </a>
                  </div>
                  <button
                    onClick={() => handleScrapeLink(link.url)}
                    disabled={scrapingLinks.has(link.url)}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs font-medium py-2 px-3 rounded transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    {scrapingLinks.has(link.url) ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Scraping...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3" />
                        Scrape Content
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 