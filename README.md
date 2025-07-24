# Lead Generation Automation System

A miniature lead generation automation system that finds potential business clients and generates personalized outreach messages.

## 🎯 Overview

This system helps hardware computer stores (or any B2B business) find potential clients by:
1. **Finding leads** via Apollo API (or mock data)
2. **Scraping company websites** for unique insights
3. **Generating personalized outreach messages** using AI
4. **Exporting results** to CSV and JSON formats

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (optional - fallback messages provided)
- Apollo API key (optional - mock data provided)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables (optional):**
   ```bash
   # Create .env file
   echo "OPENAI_API_KEY=your-openai-api-key-here" > .env
   echo "APOLLO_API_KEY=your-apollo-api-key-here" >> .env
   ```

3. **Run the system:**
   ```bash
   npm start
   ```

## 📋 Configuration

Edit `config.json` to customize:
- Search criteria (company size, industry, location)
- Business context (your company details)
- AI settings (model, temperature)
- Output preferences

## 🔧 API Setup (Required for Real Data)

### 1. Apollo API Setup
1. Go to [Apollo.io](https://apollo.io/api)
2. Sign up for a free account
3. Navigate to Settings → API
4. Generate your API key
5. Add it to your `.env` file

### 2. OpenAI API Setup  
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up for an account
3. Add billing information (required for API access)
4. Generate an API key
5. Add it to your `.env` file

### 3. Environment Configuration
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your real API keys:
APOLLO_API_KEY=your-real-apollo-key-here
OPENAI_API_KEY=your-real-openai-key-here
```

**Note**: The system will fall back to mock data if API keys are not configured, but real APIs provide much better results.

### ✅ Implemented Features
- **Mock Apollo Integration** - Simulates lead generation API
- **Website Insights Generation** - Creates realistic company insights
- **AI-Powered Message Generation** - Uses OpenAI to create personalized outreach
- **Multiple Output Formats** - CSV and JSON export
- **Error Handling** - Graceful fallbacks when APIs fail
- **Lead Scoring** - Based on company size and industry signals
- **Configuration Management** - Easy customization via config file

### 🎯 Bonus Features Included
- **Smart lead scoring** based on website signals
- **Lead deduplication logic** (prevents duplicate entries)
- **Error handling and retry mechanisms**
- **Configuration file** for easy customization
- **Clean, well-structured code** with documentation

## 📊 Sample Output

The system generates leads like this:

```
📊 LEAD #1
Company: TechFlow Solutions
Industry: Software Development
Size: 75 employees
Location: San Francisco, CA
Website: https://techflow.com

🔍 Key Insights:
   • Uses cloud-based development infrastructure
   • Recently expanded their engineering team
   • Focuses on SaaS solutions for enterprise clients

✉️ Personalized Message:
Hi TechFlow Solutions team,

I noticed your rapid growth in the San Francisco software development market, particularly your focus on SaaS solutions and recent engineering team expansion. With 75 employees, you're likely experiencing growing infrastructure demands.

At TechHardware Pro, we specialize in enterprise-grade servers and high-performance workstations that scale with fast-growing tech companies like yours. Our cloud-ready hardware solutions could support your development infrastructure while ensuring reliability for your enterprise clients.

Would you be open to a brief conversation about optimizing your hardware infrastructure?

Best regards,
Sales Team - TechHardware Pro
```

## 📁 Output Files

After running, you'll get:
- `lead_generation_results.csv` - Spreadsheet format
- `lead_generation_results.json` - Structured data format

## 🔑 API Integration Notes

### Real Apollo Integration
To use real Apollo API, replace the mock function with:
```javascript
const response = await axios.post('https://api.apollo.io/v1/mixed_people/search', {
  api_key: config.apollo.apiKey,
  q_organization_size_max: searchCriteria.companySizeMax,
  q_organization_size_min: searchCriteria.companySizeMin,
  q_organization_keywords: searchCriteria.industry
});
```

### Real Website Scraping
To enable actual website scraping, uncomment the axios call in `scrapeCompanyWebsite()`:
```javascript
const response = await axios.get(company.website);
const $ = cheerio.load(response.data);
// Extract insights from HTML content
```

## 🛠 Troubleshooting

**No OpenAI API key?** The system provides fallback messages.
**Apollo API not working?** The system uses realistic mock data.
**Website scraping fails?** Graceful fallbacks with limited information messages.

## 📈 Business Use Case

Perfect for:
- Hardware computer stores finding B2B clients
- Any B2B business needing lead generation
- Sales teams wanting personalized outreach at scale
- Agencies offering lead generation services

## 🎬 Demo Instructions

1. Run `npm start`
2. Watch console output for real-time progress
3. Check generated CSV/JSON files for results
4. Customize `config.json` for different scenarios

---

**Built for the AI Engineer Test - Lead Generation & Personalized Outreach**
# scrapper-and-automater
