import { 
  SportTip, 
  LiveMatchTip, 
  StakeSportFixture, 
  StakeMarketsResponse, 
  SportAnalysisResponse, 
  LiveSportsResponse,
  StakeApiCredentials 
} from '../types';

export class ClientStakeSportsService {
  /**
   * Check connection status to Stake API & Sportsbook feeds
   */
  public async getStatus(credentials?: StakeApiCredentials) {
    const headers: Record<string, string> = {};
    if (credentials?.apiKey) {
      headers['x-stake-api-token'] = credentials.apiKey;
    }
    if (credentials?.domain) {
      headers['x-stake-domain'] = credentials.domain;
    }

    const response = await fetch('/api/stake/status', {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur statut Stake (${response.status})`);
    }

    return response.json();
  }

  /**
   * Fetch active & upcoming markets directly from Stake Sportsbook
   */
  public async getMarkets(sport: string = 'all', credentials?: StakeApiCredentials): Promise<StakeMarketsResponse> {
    const headers: Record<string, string> = {};
    if (credentials?.apiKey) {
      headers['x-stake-api-token'] = credentials.apiKey;
    }
    if (credentials?.domain) {
      headers['x-stake-domain'] = credentials.domain;
    }

    const response = await fetch(`/api/stake/markets?sport=${encodeURIComponent(sport)}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des marchés Stake (${response.status})`);
    }

    return response.json();
  }

  /**
   * Perform AI & Quantitative EV+ Sports Analysis on genuine Stake fixtures
   */
  public async analyzeSports(params: {
    sport?: string;
    marketType?: string;
    userBankroll?: number;
    currency?: string;
    customLeague?: string;
    credentials?: StakeApiCredentials;
  }): Promise<SportAnalysisResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (params.credentials?.apiKey) {
      headers['x-stake-api-token'] = params.credentials.apiKey;
    }
    if (params.credentials?.domain) {
      headers['x-stake-domain'] = params.credentials.domain;
    }

    const response = await fetch('/api/gemini/analyze-sports', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sport: params.sport || 'all',
        marketType: params.marketType || 'value_bets',
        userBankroll: params.userBankroll || 100,
        currency: params.currency || 'USDT',
        customLeague: params.customLeague || '',
        requestTimestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur analyse sportive (${response.status})`);
    }

    return response.json();
  }

  /**
   * Fetch live in-play sports analysis from Stake.com
   */
  public async getLiveAnalysis(params: {
    sport?: string;
    customLeague?: string;
    userBankroll?: number;
    currency?: string;
    credentials?: StakeApiCredentials;
  }): Promise<LiveSportsResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (params.credentials?.apiKey) {
      headers['x-stake-api-token'] = params.credentials.apiKey;
    }
    if (params.credentials?.domain) {
      headers['x-stake-domain'] = params.credentials.domain;
    }

    const response = await fetch('/api/gemini/live-sports-analysis', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sport: params.sport || 'all',
        customLeague: params.customLeague || undefined,
        userBankroll: params.userBankroll || 100,
        currency: params.currency || 'USDT',
        requestTimestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur direct live in-play (${response.status})`);
    }

    return response.json();
  }
}

export const clientStakeSportsService = new ClientStakeSportsService();
