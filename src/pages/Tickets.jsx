import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ticket as TicketIcon, Search, MessageSquare, Clock, CheckCircle } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { extractError, timeAgo } from '../lib/utils'

const fetchTickets = async () => {
  const { data } = await api.get('/tickets')
  return data.data || []
}

export default function Tickets() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')

  const { data: tickets = [], isLoading } = useQuery({ 
    queryKey: ['tickets'], 
    queryFn: fetchTickets,
    refetchInterval: 10000 // auto-refresh
  })

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.user?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tickets/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Ticket status updated')
    },
    onError: (err) => toast.error(extractError(err))
  })

  const sendReply = useMutation({
    mutationFn: ({ id, message }) => api.post(`/tickets/${id}/responses`, { message }),
    onSuccess: (data) => {
      setReplyMessage('')
      if (selectedTicket) {
        setSelectedTicket(data.data.data) // Update local selected ticket state with new response
      }
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Reply sent')
    },
    onError: (err) => toast.error(extractError(err))
  })

  if (isLoading) return <div className="loading-spinner"><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 100px)' }}>
      {/* Left List */}
      <div style={{ width: 350, display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid var(--border)', paddingRight: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           <h1 className="page-title" style={{ fontSize: 24 }}>Support Tickets</h1>
           <div className="search-bar" style={{ width: '100%' }}>
             <Search size={16} />
             <input className="form-input" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} />
           </div>
        </div>
        
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTickets.map(t => (
            <div 
              key={t._id} 
              className={`card ${selectedTicket?._id === t._id ? 'active' : ''}`}
              style={{ 
                padding: 16, cursor: 'pointer', 
                border: selectedTicket?._id === t._id ? '1px solid var(--brand)' : '1px solid var(--border)',
                background: selectedTicket?._id === t._id ? 'var(--bg-hover)' : 'var(--bg-base)'
              }}
              onClick={() => setSelectedTicket(t)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                 <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.user?.name || 'Unknown User'}</span>
                 <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(t.createdAt)}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>{t.subject}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={`badge ${t.status === 'Open' ? 'badge-danger' : t.status === 'Resolved' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                <span className="badge badge-default">{t.category}</span>
                <span className={`badge ${t.priority === 'Urgent' ? 'badge-danger' : 'badge-default'}`}>{t.priority}</span>
              </div>
            </div>
          ))}
          {filteredTickets.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No tickets found</div>}
        </div>
      </div>

      {/* Right Detail View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedTicket ? (
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{selectedTicket.subject}</h2>
                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                       <span>From: {selectedTicket.user?.email}</span>
                       <span>ID: {selectedTicket._id}</span>
                    </div>
                 </div>
                 <select 
                   className="form-select" 
                   style={{ width: 140 }}
                   value={selectedTicket.status} 
                   onChange={(e) => updateStatus.mutate({ id: selectedTicket._id, status: e.target.value })}
                 >
                   <option value="Open">Open</option>
                   <option value="In Progress">In Progress</option>
                   <option value="Resolved">Resolved</option>
                   <option value="Closed">Closed</option>
                 </select>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--bg-hover)' }}>
               {/* Original Message */}
               <div style={{ display: 'flex', gap: 16 }}>
                 <div className="avatar-placeholder" style={{ width: 40, height: 40, flexShrink: 0 }}>{selectedTicket.user?.name?.[0]}</div>
                 <div style={{ flex: 1, background: 'var(--bg-base)', padding: 16, borderRadius: '0 12px 12px 12px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                     <span style={{ fontWeight: 600 }}>{selectedTicket.user?.name}</span>
                     <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(selectedTicket.createdAt)}</span>
                   </div>
                   <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--text-secondary)' }}>
                     {selectedTicket.description}
                   </div>
                 </div>
               </div>

               {/* Responses */}
               {(selectedTicket.responses || []).map((resp, i) => {
                 const isAdmin = resp.sender !== selectedTicket.user?._id
                 return (
                   <div key={i} style={{ display: 'flex', gap: 16, flexDirection: isAdmin ? 'row-reverse' : 'row' }}>
                     <div className="avatar-placeholder" style={{ width: 40, height: 40, flexShrink: 0, background: isAdmin ? 'var(--brand)' : 'var(--bg-highlight)' }}>
                       {isAdmin ? 'A' : selectedTicket.user?.name?.[0]}
                     </div>
                     <div style={{ flex: 1, maxWidth: '80%', background: isAdmin ? 'rgba(99,102,241,0.1)' : 'var(--bg-base)', padding: 16, borderRadius: isAdmin ? '12px 0 12px 12px' : '0 12px 12px 12px', border: '1px solid var(--border)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                         <span style={{ fontWeight: 600 }}>{isAdmin ? 'Admin' : selectedTicket.user?.name}</span>
                         <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(resp.createdAt)}</span>
                       </div>
                       <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--text-secondary)' }}>
                         {resp.message}
                       </div>
                     </div>
                   </div>
                 )
               })}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}>
               <form onSubmit={e => { e.preventDefault(); sendReply.mutate({ id: selectedTicket._id, message: replyMessage }) }}>
                 <div style={{ display: 'flex', gap: 10 }}>
                   <textarea 
                     className="form-textarea" 
                     style={{ flex: 1, minHeight: 80 }} 
                     placeholder="Type your reply here..." 
                     value={replyMessage} 
                     onChange={e => setReplyMessage(e.target.value)} 
                     required 
                   />
                   <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={sendReply.isPending}>
                     {sendReply.isPending ? 'Sending...' : 'Send Reply'}
                   </button>
                 </div>
               </form>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>Select a ticket from the list to view details</h3>
          </div>
        )}
      </div>
    </div>
  )
}
