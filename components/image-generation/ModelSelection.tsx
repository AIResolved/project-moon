'use client'

import { Badge } from '../ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Cpu, Info, Clock, Search } from 'lucide-react'
import { ImageProvider } from '@/types/image-generation'
import { MODEL_INFO } from '@/data/image'

interface ModelSelectionProps {
  selectedModel: ImageProvider
  onModelChange: (model: ImageProvider) => void
  selectedScenes: number[]
}

export function ModelSelection({ selectedModel, onModelChange, selectedScenes }: ModelSelectionProps) {
  const currentModel = MODEL_INFO[selectedModel]
  const estimatedBatches = selectedScenes.length > 0 ? Math.ceil(selectedScenes.length / currentModel.batchSize) : 0

  return (
    <Card className="bg-gray-900 border border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-purple-400" />
          Image Source Selection
        </CardTitle>
        <CardDescription className="text-gray-300">
          Choose your preferred source for images: AI generation models or stock photo search. Each option processes images in optimized batches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.entries(MODEL_INFO).map(([key, info]) => (
            <div
              key={key}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedModel === key
                  ? (key === 'search' ? 'border-blue-500 bg-blue-900/20' : 'border-purple-500 bg-purple-900/20')
                  : (key === 'search' ? 'border-blue-700/50 hover:border-blue-600 bg-gray-800' : 'border-gray-700 hover:border-gray-600 bg-gray-800')
              }`}
              onClick={() => onModelChange(key as ImageProvider)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {key === 'search' && <Search className="h-4 w-4 text-blue-400" />}
                    <h3 className="font-semibold">{info.name}</h3>
                  </div>
                  {selectedModel === key && (
                    <Badge className={key === 'search' ? 'bg-blue-600' : 'bg-purple-600'}>Selected</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-300">{info.description}</p>
                <div className="flex flex-wrap gap-1">
                  {info.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs text-gray-200 border-gray-500">
                      {feature}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-300" />
                    Batch size: {info.batchSize}
                  </span>
                  {info.rateLimit && (
                    <span>{info.rateLimit}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Batch Processing Info */}
        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-200">Batch Processing</p>
              <p className="text-sm text-blue-200">
                {currentModel.name} processes images in batches of {currentModel.batchSize}. 
                {selectedScenes.length > 0 && (
                  <span className="font-medium">
                    {' '}Your {selectedScenes.length} selected scenes will be processed in {estimatedBatches} batch{estimatedBatches !== 1 ? 'es' : ''}.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 