# 🔍 AI Research Integration

This project now includes comprehensive AI research capabilities with Perplexity AI and Firecrawl integration, alongside the existing Google research functionality.

## 🚀 Features

### ✨ **Perplexity AI Research**
- Advanced web search using Perplexity's AI-powered research
- Automatic social media link filtering 
- Rich structured data extraction with storytelling elements
- Content cleaning (removes all links and replaces with "LINK REMOVED")

### 🔥 **Firecrawl Web Scraping**
- Deep content extraction from web articles
- Automatic link removal from scraped content
- Social media platform detection and blocking
- Full article text analysis

### 🌐 **Enhanced Google Research**
- Existing Google search functionality preserved
- Unified research interface with multiple methods
- Comprehensive research summaries with LLM analysis

## 📋 Required API Keys

Add these to your `.env.local` file:

```env
# AI Research APIs (Required)
OPENAI_API_KEY=your_openai_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key  
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Existing APIs
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_SECRET=your_nextauth_secret
```

## 🛠️ Setup Instructions

1. **Install Dependencies** (Already completed)
   ```bash
   npm install @mendable/firecrawl-js
   ```

2. **API Key Setup**
   - **Perplexity AI**: Get your API key from [Perplexity AI](https://docs.perplexity.ai/)
   - **Firecrawl**: Get your API key from [Firecrawl](https://firecrawl.dev/)
   - **OpenAI**: Get your API key from [OpenAI](https://platform.openai.com/)

3. **Environment Variables**
   Create a `.env.local` file with the required API keys listed above.

## 📁 New API Endpoints

### `/api/research/web-search`
- **Method**: POST
- **Purpose**: Perplexity AI web search with social media filtering
- **Returns**: Research results, available links, filtering statistics

### `/api/research/scrape-link`
- **Method**: POST  
- **Purpose**: Firecrawl web scraping with link removal
- **Returns**: Cleaned article content and metadata

### `/api/research/generate-google-summary`
- **Method**: POST
- **Purpose**: LLM-powered research summary generation
- **Returns**: Structured insights and recommendations

## 🎯 How to Use

1. **Navigate to YouTube Research** section
2. **Click "AI Research" tab**
3. **Select Research Method**:
   - **Perplexity AI (Recommended)**: Advanced AI research with link scraping
   - **Google Search**: Traditional web search
4. **Enter your research query** and optional context
5. **Click "Start Research"**
6. **For Perplexity research**: Scrape individual links for deeper analysis

## 🔧 Key Features

### 🚫 **Social Media Filtering**
Automatically filters out social media platforms that can't be scraped:
- YouTube, Instagram, TikTok, Twitter/X, Facebook
- LinkedIn, Reddit, Discord, and more
- Shows filtering statistics and reasons

### 🧹 **Content Cleaning**
- Removes all links from content and replaces with "LINK REMOVED"
- Cleans markdown, HTML, and plain text links
- Maintains content readability

### 📊 **Rich Data Extraction**
- Storytelling elements and narrative themes
- Key insights and actionable recommendations  
- Visual and audio cues for content creation
- Audience engagement questions

### 🔄 **Unified Interface**
- Seamless integration with existing YouTube research
- Consistent UI across all research methods
- Easy switching between Google and Perplexity research

## 🎨 UI Components

The research functionality is integrated into the existing `YouTubeSearch` component with:
- **Research method selection** (Perplexity AI vs Google)
- **Filtering statistics display** when social media links are filtered
- **Available links panel** for scraping individual articles
- **Enhanced result display** with method-specific icons and labels

## ⚡ Performance Notes

- **Perplexity AI**: Fast, comprehensive research with structured insights
- **Firecrawl**: Individual link scraping (3-30 seconds per link)
- **Fallback support**: Mock data when API keys are missing
- **Error handling**: Graceful degradation with user-friendly messages

## 🔍 Example Usage

```typescript
// Perplexity research
const research = await fetch('/api/research/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'AI in healthcare 2024',
    context: 'Focus on recent developments',
    maxResults: 20
  })
})

// Link scraping  
const scraped = await fetch('/api/research/scrape-link', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article'
  })
})
```

## 🚀 Getting Started

The research integration is now ready to use! Simply:

1. Set up your API keys in `.env.local`
2. Start the development server: `npm run dev`
3. Navigate to YouTube Research → AI Research tab
4. Begin researching with advanced AI capabilities!

---

*Built with Next.js, Perplexity AI, Firecrawl, and OpenAI* 🤖 