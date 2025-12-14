import { Company, Strategy, ApiConfig } from '../types';

const DUMMY_STRATEGIES: Strategy[] = [
  {
    strategy_asset_type: 'Global Equity - Equity',
    strategy: 'LTGG',
    strategy_code: 'LTGG',
    main_representative_portfolio_icon_code: 'DPERS',
    portfolios: [],
  },
  {
    strategy_asset_type: 'US Equity - Equity',
    strategy: 'US Growth',
    strategy_code: 'USEQUITY',
    main_representative_portfolio_icon_code: 'VANGUS',
    portfolios: [],
  },
  {
    strategy_asset_type: 'Global Equity - Equity',
    strategy: 'Global Alpha',
    strategy_code: 'GLOBALALPHA',
    main_representative_portfolio_icon_code: 'VANGLOB',
    portfolios: [],
  },
  {
    strategy_asset_type: 'Japan - Equity',
    strategy: 'Japan Growth',
    strategy_code: 'JAPANGROWTH',
    main_representative_portfolio_icon_code: 'WFJAP',
    portfolios: [],
  },
  {
    strategy_asset_type: 'Global Equity - Equity',
    strategy: 'Positive Change',
    strategy_code: 'Positive Change',
    main_representative_portfolio_icon_code: 'OCPOSITIVE',
    portfolios: [],
  },
  {
    strategy_asset_type: 'Global Equity - Equity',
    strategy: 'High Growth SaaS',
    strategy_code: 'HIGHGROWTHSAAS',
    main_representative_portfolio_icon_code: 'SAAS',
    portfolios: [],
  },
];

const DUMMY_COMPANIES: Company[] = [
  { sedol: '2046251', company_name: 'Apple Inc.', short_name: 'Apple', sector: 'Information Technology', industry: 'Technology Hardware, Storage & Peripherals', region: 'American', country: 'United States' },
  { sedol: '2588173', company_name: 'Microsoft Corporation', short_name: 'Microsoft', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'United States' },
  { sedol: 'BYVY8G0', company_name: 'Alphabet Inc.', short_name: 'Alphabet', sector: 'Communication Services', industry: 'Interactive Media & Services', region: 'American', country: 'United States' },
  { sedol: 'B4TZHH9', company_name: 'Amazon.com Inc.', short_name: 'Amazon', sector: 'Consumer Discretionary', industry: 'Broadline Retail', region: 'American', country: 'United States' },
  { sedol: '2000019', company_name: 'NVIDIA Corporation', short_name: 'NVIDIA', sector: 'Information Technology', industry: 'Semiconductors', region: 'American', country: 'United States' },
  { sedol: 'BN4Q0L8', company_name: 'Meta Platforms Inc.', short_name: 'Meta', sector: 'Communication Services', industry: 'Interactive Media & Services', region: 'American', country: 'United States' },
  { sedol: '2831811', company_name: 'Tesla Inc.', short_name: 'Tesla', sector: 'Consumer Discretionary', industry: 'Automobiles', region: 'American', country: 'United States' },
  { sedol: 'BYQ7HV5', company_name: 'Berkshire Hathaway Inc.', short_name: 'Berkshire', sector: 'Financials', industry: 'Financial Services', region: 'American', country: 'United States' },
  { sedol: '2005973', company_name: 'JPMorgan Chase & Co.', short_name: 'JPMorgan', sector: 'Financials', industry: 'Banks', region: 'American', country: 'United States' },
  { sedol: '2310967', company_name: 'Johnson & Johnson', short_name: 'J&J', sector: 'Health Care', industry: 'Pharmaceuticals', region: 'American', country: 'United States' },
  { sedol: 'BLDBN41', company_name: 'Atlas Copco A', short_name: 'Atlas Copco', sector: 'Industrials', industry: 'Machinery', region: 'European', country: 'Sweden' },
  { sedol: 'BNKCF01', company_name: 'Lumine Group Inc', short_name: 'Lumine', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'Canada' },
  { sedol: 'BZ01RF1', company_name: 'Demant A/S', short_name: 'Demant', sector: 'Health Care', industry: 'Health Care Equipment & Supplies', region: 'European', country: 'Denmark' },
];

const DUMMY_WATCHLIST: Company[] = [
  { sedol: 'B29NF31', company_name: 'Franco-Nevada Corp', short_name: 'Franco-Nevada', sector: 'Materials', industry: 'Metals & Mining', region: 'American', country: 'Canada' },
  { sedol: 'B01C1P6', company_name: 'Bank Central Asia', short_name: 'BCA', sector: 'Financials', industry: 'Banks', region: 'Asian', country: 'Indonesia' },
  { sedol: '2046251', company_name: 'Apple Inc.', short_name: 'Apple', sector: 'Information Technology', industry: 'Technology Hardware, Storage & Peripherals', region: 'American', country: 'United States' },
];

const DUMMY_STRATEGY_HOLDINGS: Record<string, Company[]> = {
  'LTGG': [
    { sedol: '2046251', company_name: 'Apple Inc.', short_name: 'Apple', sector: 'Information Technology', industry: 'Technology Hardware, Storage & Peripherals', region: 'American', country: 'United States' },
    { sedol: '2588173', company_name: 'Microsoft Corporation', short_name: 'Microsoft', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'United States' },
    { sedol: 'BYVY8G0', company_name: 'Alphabet Inc.', short_name: 'Alphabet', sector: 'Communication Services', industry: 'Interactive Media & Services', region: 'American', country: 'United States' },
  ],
  'USEQUITY': [
    { sedol: 'B4TZHH9', company_name: 'Amazon.com Inc.', short_name: 'Amazon', sector: 'Consumer Discretionary', industry: 'Broadline Retail', region: 'American', country: 'United States' },
    { sedol: '2000019', company_name: 'NVIDIA Corporation', short_name: 'NVIDIA', sector: 'Information Technology', industry: 'Semiconductors', region: 'American', country: 'United States' },
    { sedol: 'BN4Q0L8', company_name: 'Meta Platforms Inc.', short_name: 'Meta', sector: 'Communication Services', industry: 'Interactive Media & Services', region: 'American', country: 'United States' },
  ],
  'GLOBALALPHA': [
    { sedol: 'BLDBN41', company_name: 'Atlas Copco A', short_name: 'Atlas Copco', sector: 'Industrials', industry: 'Machinery', region: 'European', country: 'Sweden' },
    { sedol: 'BNKCF01', company_name: 'Lumine Group Inc', short_name: 'Lumine', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'Canada' },
    { sedol: 'BZ01RF1', company_name: 'Demant A/S', short_name: 'Demant', sector: 'Health Care', industry: 'Health Care Equipment & Supplies', region: 'European', country: 'Denmark' },
  ],
  'HIGHGROWTHSAAS': [
    { sedol: '2588173', company_name: 'Microsoft Corporation', short_name: 'Microsoft', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'United States' },
    { sedol: 'BNKCF01', company_name: 'Lumine Group Inc', short_name: 'Lumine', sector: 'Information Technology', industry: 'Software', region: 'American', country: 'Canada' },
  ],
};

class ApiService {
  private config: ApiConfig = {};
  private strategiesCache: Strategy[] | null = null;

  setConfig(config: ApiConfig) {
    this.config = config;
  }

  private get useDummy(): boolean {
    return !this.config.baseUrl || !this.config.apiKey;
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const headers: Record<string, string> = {
      'accept': 'application/json',
      'accept-version': '1',
    };
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }
    return fetch(url, { headers });
  }

  async getStrategies(): Promise<Strategy[]> {
    if (this.strategiesCache) {
      return this.strategiesCache;
    }

    if (this.useDummy) {
      await new Promise(resolve => setTimeout(resolve, 300));
      this.strategiesCache = DUMMY_STRATEGIES;
      return DUMMY_STRATEGIES;
    }

    try {
      const response = await this.fetchWithAuth(`${this.config.baseUrl}/strategies`);
      const data = await response.json();
      this.strategiesCache = data.message || [];
      return this.strategiesCache || [];
    } catch (error) {
      console.error('Failed to fetch strategies, using dummy data:', error);
      this.strategiesCache = DUMMY_STRATEGIES;
      return DUMMY_STRATEGIES;
    }
  }

  async searchCompanies(query: string, limit: number = 6): Promise<Company[]> {
    if (this.useDummy) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const lowerQuery = query.toLowerCase();
      return DUMMY_COMPANIES.filter(c => 
        c.company_name.toLowerCase().includes(lowerQuery) ||
        c.short_name?.toLowerCase().includes(lowerQuery) ||
        c.sedol.toLowerCase().includes(lowerQuery)
      ).slice(0, limit);
    }

    try {
      const response = await this.fetchWithAuth(
        `${this.config.baseUrl}/stocks/universe?limit=${limit}&search=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return (data.message?.results || []).map((c: Company) => ({
        ...c,
        short_name: c.company_name.split(' ')[0],
      }));
    } catch (error) {
      console.error('Failed to search companies, using dummy data:', error);
      const lowerQuery = query.toLowerCase();
      return DUMMY_COMPANIES.filter(c => 
        c.company_name.toLowerCase().includes(lowerQuery) ||
        c.short_name?.toLowerCase().includes(lowerQuery)
      ).slice(0, limit);
    }
  }

  async getStrategyHoldings(strategyCode: string): Promise<Company[]> {
    if (this.useDummy) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return (DUMMY_STRATEGY_HOLDINGS[strategyCode] || []).map(c => ({
        ...c,
        source: 'strategy' as const,
        sourceId: strategyCode,
      }));
    }

    try {
      const response = await this.fetchWithAuth(
        `${this.config.baseUrl}/investment-intelligence/portfolios/holdings?portfolio_identifier=${strategyCode}&portfolio_identifier_type=strategy_code`
      );
      const data = await response.json();
      return (data.holdings?.instrument_holdings || []).map((c: Company) => ({
        ...c,
        short_name: c.company_name.split(' ')[0],
        source: 'strategy' as const,
        sourceId: strategyCode,
      }));
    } catch (error) {
      console.error('Failed to fetch strategy holdings, using dummy data:', error);
      return (DUMMY_STRATEGY_HOLDINGS[strategyCode] || []).map(c => ({
        ...c,
        source: 'strategy' as const,
        sourceId: strategyCode,
      }));
    }
  }

  async getWatchlistHoldings(): Promise<Company[]> {
    if (this.useDummy) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return DUMMY_WATCHLIST.map(c => ({
        ...c,
        source: 'watchlist' as const,
        sourceId: 'watchlist',
      }));
    }

    try {
      const response = await this.fetchWithAuth(
        `${this.config.baseUrl}/investors/watchlist?watchlist_name=watchlist`
      );
      const data = await response.json();
      return (data || []).map((c: Company) => ({
        ...c,
        short_name: c.company_name.split(' ')[0],
        source: 'watchlist' as const,
        sourceId: 'watchlist',
      }));
    } catch (error) {
      console.error('Failed to fetch watchlist, using dummy data:', error);
      return DUMMY_WATCHLIST.map(c => ({
        ...c,
        source: 'watchlist' as const,
        sourceId: 'watchlist',
      }));
    }
  }

  searchStrategiesLocal(query: string, limit: number = 4): Strategy[] {
    if (!this.strategiesCache) return [];
    const lowerQuery = query.toLowerCase();
    return this.strategiesCache.filter(s =>
      s.strategy.toLowerCase().includes(lowerQuery) ||
      s.strategy_code.toLowerCase().includes(lowerQuery)
    ).slice(0, limit);
  }

  clearCache() {
    this.strategiesCache = null;
  }
}

export const apiService = new ApiService();
export default apiService;
