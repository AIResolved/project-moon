'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, Youtube, Sparkles, TrendingUp, Eye, ThumbsUp, Copy, ExternalLink } from 'lucide-react'

interface ChannelVideo {
  id: string
  title: string
  views: number
  likes: number
  publishedAt: string
  thumbnail: string
  url: string
  score: number // Calculated ranking score
}

interface AnalysisResult {
  channelName: string
  totalVideos: number
  topVideos: ChannelVideo[]
  suggestedTitles: string[]
  insights: {
    commonKeywords: string[]
    averageViews: number
    topPerformingCategories: string[]
    titlePatterns: string[]
  }
}

export function ChannelAnalyzer() {
  const [channelUrl, setChannelUrl] = useState('')
  const [query, setQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!channelUrl.trim()) {
      setError('Please enter a channel URL')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      console.log('🔍 Starting channel analysis...')
      
      const response = await fetch('/api/youtube/analyze-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channelUrl: channelUrl.trim(),
          query: query.trim() || 'general analysis'
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysisResult(data)
      console.log('✅ Channel analysis completed')
      
    } catch (error: any) {
      console.error('❌ Channel analysis error:', error)
      setError(error.message || 'Failed to analyze channel')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 bg-green-900/20 border-green-600'
    if (score >= 6) return 'text-yellow-400 bg-yellow-900/20 border-yellow-600'
    return 'text-red-400 bg-red-900/20 border-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Analysis Form */}
      <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Youtube className="h-5 w-5 text-red-500" />
            AI Channel Analyzer
          </CardTitle>
          <CardDescription className="text-gray-300">
            Analyze a YouTube channel to get the best performing videos and AI-generated title suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-url" className="text-sm font-medium text-white">
              Channel URL
            </Label>
            <Input
              id="channel-url"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              placeholder="https://www.youtube.com/@channelname or https://www.youtube.com/c/channelname"
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              disabled={isAnalyzing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="query" className="text-sm font-medium text-white">
              Analysis Query (Optional)
            </Label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'tech reviews', 'gaming content', 'educational videos'"
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              disabled={isAnalyzing}
            />
            <p className="text-xs text-gray-400">
              Specify the type of content you're interested in for more targeted title suggestions
            </p>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !channelUrl.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Channel...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Channel & Generate Titles
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Channel Overview */}
          <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Channel Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{analysisResult.channelName}</div>
                  <div className="text-sm text-gray-300">Channel Name</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{analysisResult.totalVideos}</div>
                  <div className="text-sm text-gray-300">Total Videos Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {formatNumber(analysisResult.insights.averageViews)}
                  </div>
                  <div className="text-sm text-gray-300">Average Views</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Videos */}
          <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="h-5 w-5" />
                Top Performing Videos
              </CardTitle>
              <CardDescription className="text-gray-300">
                Based on views, likes, and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.topVideos.map((video, index) => (
                  <div key={video.id} className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                    <div className="flex-shrink-0">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-24 h-16 object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-white line-clamp-2">{video.title}</h3>
                        <Badge className={`${getScoreColor(video.score)} flex-shrink-0`}>
                          Score: {video.score.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {formatNumber(video.views)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4" />
                          {formatNumber(video.likes)}
                        </span>
                        <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(video.url, '_blank')}
                      className="text-gray-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI-Generated Title Suggestions */}
          <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI-Generated Title Suggestions
              </CardTitle>
              <CardDescription className="text-gray-300">
                Similar titles based on the channel's top-performing content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult.suggestedTitles.map((title, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
                    <span className="text-purple-200 flex-1">{title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(title)}
                      className="text-purple-400 hover:text-purple-300 ml-2"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-gray-900/50 shadow-lg border border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Channel Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">Common Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.insights.commonKeywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="border-blue-600 text-blue-300">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div>
                <h4 className="font-medium text-white mb-2">Title Patterns</h4>
                <div className="space-y-2">
                  {analysisResult.insights.titlePatterns.map((pattern, index) => (
                    <div key={index} className="text-sm text-gray-300 bg-gray-800/50 p-2 rounded">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-700" />

              <div>
                <h4 className="font-medium text-white mb-2">Top Performing Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.insights.topPerformingCategories.map((category, index) => (
                    <Badge key={index} variant="outline" className="border-green-600 text-green-300">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
