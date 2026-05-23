export type SessionType = 'regular' | 'dnd'
export type PaymentStatus = 'unpaid' | 'pending' | 'confirmed'

export interface Member {
  id: string
  phone: string
  name: string
  is_admin: boolean
  created_at: string
}

export interface Session {
  id: string
  member_id: string
  table_number: number
  date: string
  start_time: string
  end_time: string
  type: SessionType
  drinks_amount: number
  carpark_amount: number
  table_fee: number
  total_amount: number
  payment_status: PaymentStatus
  payment_method: 'paynow' | 'cash' | null
  partner: string | null
  created_at: string
  member?: Pick<Member, 'id' | 'name' | 'phone'>
}

export type Database = {
  public: {
    Tables: {
      members: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at'>
        Update: Partial<Omit<Member, 'id' | 'created_at'>>
        Relationships: []
      }
      sessions: {
        Row: Session
        Insert: Omit<Session, 'id' | 'created_at' | 'member'>
        Update: Partial<Omit<Session, 'id' | 'created_at' | 'member'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
