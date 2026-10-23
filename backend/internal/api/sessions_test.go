package api

import (
	"fmt"
	"testing"
	"time"
)

func TestSessionCache(t *testing.T) {
	var c sessionCache
	now := time.Unix(1_000_000, 0)

	if _, ok := c.get("h", now); ok {
		t.Fatal("empty cache returned a session")
	}
	c.put("h", "0xabc", now)
	if a, ok := c.get("h", now.Add(sessionCacheTTL-time.Second)); !ok || a != "0xabc" {
		t.Fatalf("get within TTL = %q, %v", a, ok)
	}
	if _, ok := c.get("h", now.Add(sessionCacheTTL)); ok {
		t.Fatal("session trusted past its TTL")
	}

	c.put("h", "0xabc", now)
	c.forget("h")
	if _, ok := c.get("h", now); ok {
		t.Fatal("forgotten session still cached")
	}

	// Full: the cache starts over instead of growing without bound.
	for i := range sessionCacheMax {
		c.put(fmt.Sprint(i), "0xabc", now)
	}
	c.put("new", "0xabc", now)
	if _, ok := c.get("0", now); ok || len(c.entries) != 1 {
		t.Fatalf("cache not reset when full: %d entries", len(c.entries))
	}
}
