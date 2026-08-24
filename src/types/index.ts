export interface Business {
  id: string
  name: string
  type: string
  slug: string
  currency: string
  taxRate: number
  receiptFooter?: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  buyingPrice: number
  sellingPrice: number
  quantity: number
  lowStock: number
  isService: boolean
  categoryId?: string
}

export interface Sale {
  id: string
  total: number
  cost: number
  profit: number
  paid: number
  change: number
  paymentMethod: string
  items: SaleItem[]
  createdAt: Date
}

export interface SaleItem {
  id: string
  name: string
  quantity: number
  price: number
  cost: number
}

export interface CartItem {
  id: string
  name: string
  qty: number
  price: number
  cost: number
  available: number
}
