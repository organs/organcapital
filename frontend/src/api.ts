const BASE = '/api'

export interface Custodian {
  custodian_id: number
  name: string
  type: string
  account_number: string
  currency: string
  contact_email: string
  city: string
}

export interface CashPosition {
  settlement_id: number
  date_id: string
  custodian_id: number
  custodian_name: string
  custodian_type: string
  opening_balance: number
  closing_balance: number
  inflows: number
  outflows: number
  currency: string
}

export interface CashSummary {
  as_of_date: string
  total_cash: number
  total_inflows: number
  total_outflows: number
  t1_net_need: number
  t2_net_need: number
  cash_coverage_ratio: number
  positions: CashPosition[]
}

export interface CashHistoryPoint {
  date: string
  custodian_id: number
  custodian_name: string
  closing_balance: number
}

export interface Asset {
  asset_id: number
  date_id: string
  asset_type: string
  ticker: string
  cusip: string
  issuer: string
  face_value: number
  market_value: number
  accrued_interest: number
  settlement_date: string
  counterparty: string
  currency: string
  sector: string
  rating: string
}

export interface AssetSummary {
  as_of_date: string
  total_market_value: number
  position_count: number
  by_type: Record<string, number>
}

export interface Need {
  need_id: number
  date_id: string
  need_type: string
  amount: number
  description: string
  status: string
  priority: string
  custodian_id: number | null
  custodian_name: string | null
  linked_asset_id: number | null
}

export interface ForecastDay {
  date: string
  net_amount: number
  inflows: number
  outflows: number
  breakdown: Record<string, number>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  getCashSummary: () => get<CashSummary>('/cash/summary'),
  getCashPositions: (date?: string) =>
    get<CashPosition[]>(`/cash/positions${date ? `?as_of_date=${date}` : ''}`),
  getCashHistory: (days = 30, custodianId?: number) =>
    get<CashHistoryPoint[]>(
      `/cash/history?days=${days}${custodianId ? `&custodian_id=${custodianId}` : ''}`,
    ),
  getAssets: (assetType?: string) =>
    get<Asset[]>(`/assets${assetType ? `?asset_type=${assetType}` : ''}`),
  getAssetSummary: () => get<AssetSummary>('/assets/summary'),
  getNeeds: (fromDate?: string, toDate?: string, status?: string) => {
    const params = new URLSearchParams()
    if (fromDate) params.set('from_date', fromDate)
    if (toDate) params.set('to_date', toDate)
    if (status) params.set('status', status)
    return get<Need[]>(`/needs?${params}`)
  },
  getNeedsForecast: (days = 7) => get<ForecastDay[]>(`/needs/forecast?days=${days}`),
  chat: (messages: ChatMessage[]) =>
    post<{ reply: string }>('/chat', { messages }),
}
