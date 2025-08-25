'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ScrollArea } from '../ui/scroll-area'
import { Loader2, Search, Edit3, CheckSquare, Square, Video, Download, Play } from 'lucide-react'
import { ExtractedVideoScene } from '@/types/text-image-video-generation'

interface VideoSearchResult {
  id: string
  url: string
  thumbnail: string
  source: 'pexels' | 'pixabay'
  photographer: string
  type: 'video'
  query: string
}

interface VideoSearchModalProps {
  isOpen: boolean
  onClose: () => void
  scenes: ExtractedVideoScene[]
  onSelectResults: (results: VideoSearchResult[]) => void
}

export function VideoSearchModal({ isOpen, onClose, scenes, onSelectResults }: VideoSearchModalProps) {
  const [searchQueries, setSearchQueries] = useState<string[]>([])
  const [selectedQueries, setSelectedQueries] = useState<Set<number>>(new Set())
  const [editingQuery, setEditingQuery] = useState<number | null>(null)
  const [editedQuery, setEditedQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([])
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [currentTab, setCurrentTab] = useState('queries')

  // Initialize search queries from scenes
  useEffect(() => {
    if (scenes.length > 0) {
      setSearchQueries(scenes.map(scene => scene.searchQuery))
      setSelectedQueries(new Set(scenes.map((_, index) => index)))
    }
  }, [scenes])

  const handleEditQuery = (index: number) => {
    setEditingQuery(index)
    setEditedQuery(searchQueries[index])
  }

  const handleSaveQuery = (index: number) => {
    const newQueries = [...searchQueries]
    newQueries[index] = editedQuery
    setSearchQueries(newQueries)
    setEditingQuery(null)
    setEditedQuery('')
  }

  const handleCancelEdit = () => {
    setEditingQuery(null)
    setEditedQuery('')
  }

  const handleToggleQuery = (index: number) => {
    const newSelected = new Set(selectedQueries)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedQueries(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedQueries.size === searchQueries.length) {
      setSelectedQueries(new Set())
    } else {
      setSelectedQueries(new Set(searchQueries.map((_, index) => index)))
    }
  }

  const handleSearch = async () => {
    if (selectedQueries.size === 0) return
    
    setIsSearching(true)
    setSearchResults([])
    
    try {
      const queriesToSearch = Array.from(selectedQueries).map(index => searchQueries[index])
      const allResults: VideoSearchResult[] = []
      
      for (const query of queriesToSearch) {
        // Search Pexels for videos
        try {
          const pexelsResponse = await fetch('/api/search-pexels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type: 'video' })
          })
          
          if (pexelsResponse.ok) {
            const pexelsData = await pexelsResponse.json()
            if (pexelsData.results) {
              allResults.push(...pexelsData.results.map((result: any) => ({
                ...result,
                query
              })))
            }
          }
        } catch (error) {
          console.error('Pexels video search error:', error)
        }
        
        // Search Pixabay for videos
        try {
          const pixabayResponse = await fetch('/api/search-pixabay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, type: 'video' })
          })
          
          if (pixabayResponse.ok) {
            const pixabayData = await pixabayResponse.json()
            if (pixabayData.results) {
              allResults.push(...pixabayData.results.map((result: any) => ({
                ...result,
                query
              })))
            }
          }
        } catch (error) {
          console.error('Pixabay video search error:', error)
        }
        
        // Small delay between searches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      setSearchResults(allResults)
      setCurrentTab('results')
    } catch (error) {
      console.error('Video search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleToggleResult = (resultId: string) => {
    const newSelected = new Set(selectedResults)
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId)
    } else {
      // Limit to 3 selections as requested
      if (newSelected.size < 3) {
        newSelected.add(resultId)
      }
    }
    setSelectedResults(newSelected)
  }

  const handleSelectTop3 = () => {
    // Group results by query and select top result from each
    const resultsByQuery = searchResults.reduce((acc, result) => {
      if (!acc[result.query]) acc[result.query] = []
      acc[result.query].push(result)
      return acc
    }, {} as Record<string, VideoSearchResult[]>)
    
    const top3Results = Object.values(resultsByQuery)
      .slice(0, 3)
      .map(queryResults => queryResults[0]?.id)
      .filter(Boolean)
    
    setSelectedResults(new Set(top3Results))
  }

  const handleConfirmSelection = () => {
    const selectedResultsArray = searchResults.filter(result => 
      selectedResults.has(result.id)
    )
    onSelectResults(selectedResultsArray)
    onClose()
  }

  const handleClose = () => {
    setSearchResults([])
    setSelectedResults(new Set())
    setCurrentTab('queries')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Search Stock Videos
          </DialogTitle>
        </DialogHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="queries">Search Queries ({searchQueries.length})</TabsTrigger>
            <TabsTrigger value="results">Results ({searchResults.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedQueries.size === searchQueries.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select All
                </Button>
                <Badge variant="secondary">
                  {selectedQueries.size} of {searchQueries.length} selected
                </Badge>
              </div>
              <Button
                onClick={handleSearch}
                disabled={selectedQueries.size === 0 || isSearching}
                className="flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search Selected
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {searchQueries.map((query, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-600">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedQueries.has(index)}
                          onCheckedChange={() => handleToggleQuery(index)}
                        />
                        
                        <div className="flex-1">
                          {editingQuery === index ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editedQuery}
                                onChange={(e) => setEditedQuery(e.target.value)}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveQuery(index)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{query}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditQuery(index)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="outline" className="text-xs">
                          Scene {index + 1}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="results" className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectTop3}
                >
                  Select Top 3
                </Button>
                <Badge variant="secondary">
                  {selectedResults.size} of 3 max selected
                </Badge>
              </div>
              <Button
                onClick={handleConfirmSelection}
                disabled={selectedResults.size === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Use Selected ({selectedResults.size})
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((result) => (
                  <Card 
                    key={result.id} 
                    className={`bg-gray-800 border-gray-600 cursor-pointer transition-all ${
                      selectedResults.has(result.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleToggleResult(result.id)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-video bg-gray-700 rounded mb-2 overflow-hidden relative">
                        <img
                          src={result.thumbnail}
                          alt={`Video from ${result.source}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="h-8 w-8 text-white opacity-80" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {result.source}
                          </Badge>
                          <Checkbox
                            checked={selectedResults.has(result.id)}
                            onCheckedChange={() => handleToggleResult(result.id)}
                          />
                        </div>
                        <p className="text-xs text-gray-400">{result.photographer}</p>
                        <p className="text-xs text-gray-500">Query: {result.query}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {searchResults.length === 0 && !isSearching && (
                <div className="text-center py-8 text-gray-400">
                  No results yet. Go to the Queries tab and search with your selected queries.
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



