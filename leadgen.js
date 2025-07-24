require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Configuration
const CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
  apolloApiKey: process.env.APOLLO_API_KEY || 'your-apollo-api-key-here',
  delays: {
    websiteScraping: 1000,
    apiCalls: 500
  },
  limits: {
    companiesPerPage: 10,
    maxTokens: 300,
    requestTimeout: 10000
  }
};

/**
 * Validates that required API keys are configured
 */
function validateApiKeys() {
  const warnings = [];
  
  if (CONFIG.apolloApiKey === 'your-apollo-api-key-here') {
    warnings.push({
      service: 'Apollo API',
      message: 'Set APOLLO_API_KEY environment variable.',
      url: 'https://apollo.io/api'
    });
  }
  
  if (CONFIG.openaiApiKey === 'your-openai-api-key-here') {
    warnings.push({
      service: 'OpenAI API',
      message: 'Set OPENAI_API_KEY environment variable.',
      url: 'https://platform.openai.com/api-keys'
    });
  }
  
  warnings.forEach(warning => {
    console.log(`⚠️  Warning: ${warning.service} key not configured. ${warning.message}`);
    console.log(`   Get your API key from: ${warning.url}`);
  });
}

/**
 * Creates Apollo API search payload
 */
function createApolloSearchPayload(searchCriteria) {
  return {
    q_organization_size_min: searchCriteria.companySizeMin,
    q_organization_size_max: searchCriteria.companySizeMax,
    q_keywords: searchCriteria.industry,
    page: 1,
    per_page: CONFIG.limits.companiesPerPage,
  };
}

/**
 * Creates Apollo API request headers
 */
function createApolloHeaders() {
  return {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    "X-Api-Key": CONFIG.apolloApiKey,
  };
}

/**
 * Transforms Apollo API response to company objects
 */
function transformApolloResponse(organizations) {
  return organizations.map(org => ({
    name: org.name,
    website: org.website_url,
    employeeCount: org.estimated_num_employees,
    industry: org.industry,
    location: `${org.city || ''}, ${org.state || ''} ${org.country || ''}`.trim()
  })).filter(company => company.name && company.website);
}

/**
 * Fetches leads from Apollo API
 */
async function fetchLeadsFromApollo(searchCriteria) {
  console.log('🔍 Fetching leads from Apollo API...');
  console.log('Search Criteria:', searchCriteria);
  
  try {
    const payload = createApolloSearchPayload(searchCriteria);
    const headers = createApolloHeaders();
    
    const response = await axios.post(
      "https://api.apollo.io/v1/organizations/search",
      payload,
      { headers }
    );

    if (!response.data?.organizations) {
      throw new Error('Invalid response format from Apollo API');
    }

    const companies = transformApolloResponse(response.data.organizations);
    console.log(`✅ Found ${companies.length} potential leads from Apollo`);
    return companies;
    
  } catch (error) {
    console.log(`❌ Apollo API Error: ${error.message}`);
    throw new Error('Failed to fetch leads from Apollo API');
  }
}

/**
 * Industry-specific insight templates
 */
const INDUSTRY_INSIGHTS = {
  Software: [
    'Uses cloud-based development infrastructure',
    'Recently expanded their engineering team',
    'Focuses on SaaS solutions for enterprise clients'
  ],
  Data: [
    'Processes large datasets for analytics',
    'Offers real-time data visualization tools',
    'Serves clients in finance and healthcare sectors'
  ],
  Cloud: [
    'Specializes in multi-cloud deployments',
    'Offers 24/7 infrastructure monitoring',
    'Recently achieved SOC 2 compliance'
  ],
  AI: [
    'Develops machine learning models',
    'Requires high-performance computing resources',
    'Focus on computer vision and NLP applications'
  ],
  Cyber: [
    'Provides enterprise security solutions',
    'Offers threat detection and response services',
    'Compliance with GDPR and HIPAA requirements'
  ]
};

/**
 * Generates company-size specific insights
 */
function getCompanySizeInsights(employeeCount) {
  return employeeCount > 100 
    ? 'Large team suggests significant IT infrastructure needs'
    : 'Growing company likely expanding their tech stack';
}

/**
 * Generates mock insights based on industry and company size
 */
function generateMockInsights(company) {
  const insights = [];
  
  // Find matching industry insights
  const industryKey = Object.keys(INDUSTRY_INSIGHTS).find(key => 
    company.industry.includes(key)
  );
  
  if (industryKey) {
    insights.push(...INDUSTRY_INSIGHTS[industryKey]);
  }
  
  // Add company size insight
  insights.push(getCompanySizeInsights(company.employeeCount));
  
  return insights.length > 0 ? insights : ['Limited industry information available'];
}

/**
 * Creates request headers for web scraping
 */
function createScrapingHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };
}

/**
 * Extracts insights from website metadata
 */
function extractMetadataInsights($) {
  const insights = [];
  
  const metaDescription = $('meta[name="description"]').attr('content');
  if (metaDescription) {
    insights.push(`Website focus: ${metaDescription.substring(0, 100)}...`);
  }
  
  const title = $('title').text();
  if (title) {
    insights.push(`Company positioning: ${title.substring(0, 80)}...`);
  }
  
  return insights;
}

/**
 * Extracts technology-related insights from website content
 */
function extractTechnologyInsights(pageText) {
  const techKeywords = ['cloud', 'ai', 'machine learning', 'saas', 'api', 'software', 'technology', 'digital', 'automation', 'analytics'];
  const foundKeywords = techKeywords.filter(keyword => pageText.includes(keyword));
  
  return foundKeywords.length > 0 
    ? [`Technology focus: ${foundKeywords.slice(0, 3).join(', ')}`]
    : [];
}

/**
 * Extracts business-related insights from website content
 */
function extractBusinessInsights(pageText) {
  const businessKeywords = ['enterprise', 'fortune', 'clients', 'customers', 'global', 'scale', 'growth'];
  const foundBusinessWords = businessKeywords.filter(keyword => pageText.includes(keyword));
  
  return foundBusinessWords.length > 0 
    ? [`Business indicators: ${foundBusinessWords.slice(0, 2).join(', ')}`]
    : [];
}

/**
 * Scrapes company website for insights
 */
async function scrapeCompanyWebsite(company) {
  console.log(`🌐 Scraping insights for ${company.name}...`);
  
  try {
    const response = await axios.get(company.website, {
      timeout: CONFIG.limits.requestTimeout,
      headers: createScrapingHeaders()
    });
    
    const $ = cheerio.load(response.data);
    const pageText = $('body').text().toLowerCase();
    
    const insights = [
      ...extractMetadataInsights($),
      ...extractTechnologyInsights(pageText),
      ...extractBusinessInsights(pageText),
      getCompanySizeInsights(company.employeeCount)
    ];
    
    return {
      ...company,
      insights: insights.length > 0 ? insights : ['Limited website information available'],
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.log(`❌ Failed to scrape ${company.name}: ${error.message}`);
    
    return {
      ...company,
      insights: generateMockInsights(company),
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Creates the prompt for AI message generation
 */
function createMessagePrompt(enrichedCompany) {
  return `You are a sales representative from "TechHardware Pro", a hardware computer store that specializes in business solutions.

Company Information:
- Name: ${enrichedCompany.name}
- Industry: ${enrichedCompany.industry}
- Employee Count: ${enrichedCompany.employeeCount}
- Location: ${enrichedCompany.location}
- Key Insights: ${enrichedCompany.insights.join(', ')}

Write a professional, personalized outreach email that:
1. References specific details about their company
2. Highlights relevant hardware solutions we can provide
3. Shows understanding of their business needs
4. Includes a clear call-to-action
5. Keeps it concise (under 150 words)

The tone should be professional but friendly, and focus on how our hardware solutions can solve their specific challenges.`;
}

/**
 * Creates OpenAI API request headers
 */
function createOpenAIHeaders() {
  return {
    'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Creates fallback message template
 */
function createFallbackMessage(enrichedCompany) {
  const insightText = enrichedCompany.insights[0] 
    ? `Given your ${enrichedCompany.insights[0].toLowerCase()}, our high-performance servers and workstations could significantly enhance your operations.`
    : 'Our hardware solutions could significantly enhance your operations.';

  return `Hi ${enrichedCompany.name} team,

I noticed your company in the ${enrichedCompany.industry} space with ${enrichedCompany.employeeCount} employees. Based on your growth and technical focus, I believe TechHardware Pro could help optimize your IT infrastructure with enterprise-grade hardware solutions.

${insightText}

Would you be open to a brief conversation about your current hardware needs?

Best regards,
Sales Team - TechHardware Pro`;
}

/**
 * Generates personalized outreach message using AI or fallback template
 */
async function generatePersonalizedMessage(enrichedCompany) {
  console.log(`✍️ Generating personalized message for ${enrichedCompany.name}...`);
  
  try {
    const prompt = createMessagePrompt(enrichedCompany);
    const headers = createOpenAIHeaders();
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert B2B sales copywriter specializing in hardware sales.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: CONFIG.limits.maxTokens,
      temperature: 0.7
    }, { headers });
    
    const aiMessage = response.data.choices[0].message.content.trim();
    
    return {
      ...enrichedCompany,
      personalizedMessage: aiMessage,
      messageGenerated: new Date().toISOString(),
      aiGenerated: true
    };
    
  } catch (error) {
    console.log(`❌ OpenAI API Error for ${enrichedCompany.name}: ${error.message}`);
    
    return {
      ...enrichedCompany,
      personalizedMessage: createFallbackMessage(enrichedCompany),
      messageGenerated: new Date().toISOString(),
      aiGenerated: false
    };
  }
}

/**
 * Defines CSV file structure
 */
function createCSVWriter() {
  return createCsvWriter({
    path: 'lead_generation_results.csv',
    header: [
      { id: 'name', title: 'Company Name' },
      { id: 'website', title: 'Website' },
      { id: 'employeeCount', title: 'Employee Count' },
      { id: 'industry', title: 'Industry' },
      { id: 'location', title: 'Location' },
      { id: 'insights', title: 'Key Insights' },
      { id: 'personalizedMessage', title: 'Personalized Message' },
      { id: 'messageGenerated', title: 'Message Generated' }
    ]
  });
}

/**
 * Transforms results for CSV format
 */
function transformResultsForCSV(results) {
  return results.map(result => ({
    ...result,
    insights: result.insights.join('; ')
  }));
}

/**
 * Saves results to CSV file
 */
async function saveResultsToCSV(results) {
  const csvWriter = createCSVWriter();
  const csvData = transformResultsForCSV(results);
  
  await csvWriter.writeRecords(csvData);
  console.log('📄 Results saved to lead_generation_results.csv');
}

/**
 * Saves results to JSON file
 */
async function saveResultsToJSON(results) {
  await fs.writeFile(
    'lead_generation_results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 Results saved to lead_generation_results.json');
}

/**
 * Displays a single lead result
 */
function displaySingleLead(result, index) {
  console.log(`\n📊 LEAD #${index + 1}`);
  console.log(`Company: ${result.name}`);
  console.log(`Industry: ${result.industry}`);
  console.log(`Size: ${result.employeeCount} employees`);
  console.log(`Location: ${result.location}`);
  console.log(`Website: ${result.website}`);
  console.log('\n🔍 Key Insights:');
  result.insights.forEach(insight => {
    console.log(`   • ${insight}`);
  });
  console.log('\n✉️ Personalized Message:');
  console.log(result.personalizedMessage);
  console.log('\n' + '-'.repeat(50));
}

/**
 * Displays all lead generation results
 */
function displayResults(results) {
  console.log('\n🎯 LEAD GENERATION RESULTS');
  console.log('='.repeat(50));
  
  results.forEach(displaySingleLead);
}

/**
 * Default search criteria
 */
const DEFAULT_SEARCH_CRITERIA = {
  companySizeMin: 50,
  companySizeMax: 200,
  industry: 'software',
  location: 'USA'
};

/**
 * Displays search criteria
 */
function displaySearchCriteria(searchCriteria) {
  console.log('📋 Search Criteria:');
  console.log(`   - Company Size: ${searchCriteria.companySizeMin}-${searchCriteria.companySizeMax} employees`);
  console.log(`   - Industry: ${searchCriteria.industry}`);
  console.log(`   - Location: ${searchCriteria.location}`);
  console.log('');
}

/**
 * Processes companies by enriching them with website insights
 */
async function enrichCompaniesWithInsights(companies) {
  console.log('🔍 Enriching leads with website insights...');
  const enrichedCompanies = [];
  
  for (const company of companies) {
    const enriched = await scrapeCompanyWebsite(company);
    enrichedCompanies.push(enriched);
    // Add delay to be respectful to websites
    await new Promise(resolve => setTimeout(resolve, CONFIG.delays.websiteScraping));
  }
  
  console.log('');
  return enrichedCompanies;
}

/**
 * Generates personalized messages for enriched companies
 */
async function generateMessagesForCompanies(enrichedCompanies) {
  console.log('🤖 Generating personalized outreach messages...');
  const finalResults = [];
  
  for (const company of enrichedCompanies) {
    const result = await generatePersonalizedMessage(company);
    finalResults.push(result);
    // Add delay between API calls
    await new Promise(resolve => setTimeout(resolve, CONFIG.delays.apiCalls));
  }
  
  console.log('');
  return finalResults;
}

/**
 * Displays final summary statistics
 */
function displaySummary(results) {
  const aiGenerated = results.filter(r => r.aiGenerated).length;
  
  console.log(`\n✅ Lead generation completed successfully!`);
  console.log(`📈 Generated ${results.length} personalized leads`);
  console.log(`💾 Results saved to CSV and JSON files`);
  console.log(`🤖 AI-generated messages: ${aiGenerated}/${results.length}`);
}

/**
 * Main lead generation workflow
 */
async function runLeadGeneration() {
  console.log('🚀 Starting Lead Generation Automation System (Node.js)');
  console.log('='.repeat(50));
  
  // Validate API keys first
  validateApiKeys();
  console.log('');
  
  try {
    // 1. Setup search criteria
    const searchCriteria = DEFAULT_SEARCH_CRITERIA;
    displaySearchCriteria(searchCriteria);
    
    // 2. Fetch companies from Apollo
    const companies = await fetchLeadsFromApollo(searchCriteria);
    console.log('');
    
    // 3. Enrich companies with website insights
    const enrichedCompanies = await enrichCompaniesWithInsights(companies);
    
    // 4. Generate personalized messages
    const finalResults = await generateMessagesForCompanies(enrichedCompanies);
    
    // 5. Display and save results
    displayResults(finalResults);
    await saveResultsToCSV(finalResults);
    await saveResultsToJSON(finalResults);
    
    // 6. Display summary
    displaySummary(finalResults);
    
  } catch (error) {
    console.error(`❌ Error in lead generation process: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  await runLeadGeneration();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}