import { useState, useEffect } from 'react'
import { Check, X, RefreshCw, Link as LinkIcon } from 'lucide-react'

interface NavidromeStatus {
  connected: boolean
  url?: string
  username?: string
  source?: 'manual' | 'auto' | 'none'
  last_verified?: string
}

export function NavidromeSetup() {
  const [status, setStatus] = useState<NavidromeStatus>({ connected: false, source: 'none' })
  const [showSetup, setShowSetup] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [url, setUrl] = useState('http://192.168.0.161:4533')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/navidrome/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch Navidrome status', error)
    }
  }

  const handleConnect = async () => {
    setTestStatus('testing')
    setErrorMessage('')
    
    try {
      const response = await fetch('/api/navidrome/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, username, password })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestStatus('success')
        setShowSetup(false)
        fetchStatus()
      } else {
        setTestStatus('error')
        setErrorMessage(data.error || 'Connection failed')
      }
    } catch (error) {
      setTestStatus('error')
      setErrorMessage('Network error')
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect from Navidrome? Genres will no longer be fetched from ID3 tags.')) {
      return
    }
    
    setLoading(true)
    try {
      await fetch('/api/navidrome/disconnect', { method: 'DELETE' })
      fetchStatus()
    } finally {
      setLoading(false)
    }
  }

  if (status.connected) {
    return (
      <div className="card-dense">
        <div className="card-header-dense">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <h3 className="card-title-dense">Navidrome Connected</h3>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-viking-bg-elevated rounded-lg p-4 border border-viking-border-default">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-viking-text-tertiary uppercase">URL</span>
                  <span className="text-sm font-mono text-viking-text-primary">{status.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-viking-text-tertiary uppercase">User</span>
                  <span className="text-sm font-mono text-viking-text-primary">{status.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-viking-text-tertiary uppercase">Source</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {status.source === 'auto' ? '🤖 Auto-Discovered' : '✋ Manually Configured'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors"
              >
                {loading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
          
          <div className="text-xs text-viking-text-tertiary">
            ✅ Genres are automatically fetched from your ID3 tags
          </div>
        </div>
      </div>
    )
  }

  if (!showSetup) {
    return (
      <div className="card-dense">
        <div className="card-header-dense">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-viking-text-tertiary" />
            <h3 className="card-title-dense">Connect Navidrome</h3>
          </div>
          <span className="text-xs text-viking-text-tertiary">Optional - Enables ID3 genre tagging</span>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-viking-text-secondary mb-4">
            Connect your Navidrome instance to automatically fetch genres from your music library's ID3 tags.
          </p>
          
          <button
            onClick={() => setShowSetup(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-viking-purple/20"
          >
            Setup Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-dense">
      <div className="card-header-dense">
        <h3 className="card-title-dense">Connect Navidrome</h3>
        <button
          onClick={() => setShowSetup(false)}
          className="text-viking-text-tertiary hover:text-viking-text-primary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Navidrome URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-2 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-viking-text-primary focus:border-viking-purple focus:outline-none"
            placeholder="http://192.168.0.161:4533"
          />
          <p className="text-xs text-viking-text-tertiary mt-1">
            The URL where your Navidrome instance is running
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-viking-text-primary focus:border-viking-purple focus:outline-none"
            placeholder="your_username"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-viking-bg-tertiary border border-viking-border-default rounded-lg text-viking-text-primary focus:border-viking-purple focus:outline-none"
            placeholder="••••••••"
          />
          <p className="text-xs text-viking-text-tertiary mt-1">
            🔒 Password is encrypted and stored securely
          </p>
        </div>
        
        <button
          onClick={handleConnect}
          disabled={testStatus === 'testing' || !url || !username || !password}
          className="w-full px-6 py-3 bg-gradient-to-r from-viking-purple to-viking-purple-dark hover:from-viking-purple-dark hover:to-viking-purple text-white rounded-lg font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin" />}
          {testStatus === 'testing' ? 'Testing Connection...' : 'Connect'}
        </button>
        
        {testStatus === 'success' && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 rounded-lg p-3">
            <Check className="w-5 h-5" />
            <span>✅ Connected! Genres will now be fetched from your ID3 tags.</span>
          </div>
        )}
        
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
            <X className="w-5 h-5" />
            <span>❌ {errorMessage || 'Connection failed. Check URL and credentials.'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
