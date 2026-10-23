package api

import (
	"sync"
	"time"
)

// sessionCacheTTL is how long a verified session is trusted without asking the database again.
// Logging out through this server forgets it at once; a session that expires or is deleted
// elsewhere stops working at most this much later.
const sessionCacheTTL = time.Minute

// sessionCacheMax bounds the cache; past it, the cache starts over.
const sessionCacheMax = 1024

// sessionCache remembers which address a session token hash belongs to, so an authed request
// doesn't cost a database round trip before it does any work.
type sessionCache struct {
	mu      sync.Mutex
	entries map[string]cachedSession
}

type cachedSession struct {
	address string
	until   time.Time
}

func (c *sessionCache) get(hash string, now time.Time) (string, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[hash]
	if !ok || !now.Before(e.until) {
		return "", false
	}
	return e.address, true
}

func (c *sessionCache) put(hash, address string, now time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.entries == nil || len(c.entries) >= sessionCacheMax {
		c.entries = make(map[string]cachedSession)
	}
	c.entries[hash] = cachedSession{address, now.Add(sessionCacheTTL)}
}

func (c *sessionCache) forget(hash string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.entries, hash)
}
