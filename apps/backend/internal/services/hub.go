package services

import (
	"encoding/json"
	"sync"
)

// EventHub fans out ingested telemetry events to SSE subscribers, keyed by
// project ID. Slow consumers are dropped rather than back-pressured.
type EventHub struct {
	mu   sync.Mutex
	subs map[string]map[chan []byte]struct{}
}

func NewEventHub() *EventHub {
	return &EventHub{subs: map[string]map[chan []byte]struct{}{}}
}

func (h *EventHub) Subscribe(projectID string) chan []byte {
	ch := make(chan []byte, 64)
	h.mu.Lock()
	if h.subs[projectID] == nil {
		h.subs[projectID] = map[chan []byte]struct{}{}
	}
	h.subs[projectID][ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *EventHub) Unsubscribe(projectID string, ch chan []byte) {
	h.mu.Lock()
	delete(h.subs[projectID], ch)
	h.mu.Unlock()
	close(ch)
}

func (h *EventHub) Broadcast(projectID string, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	h.mu.Lock()
	for ch := range h.subs[projectID] {
		select {
		case ch <- data:
		default:
		}
	}
	h.mu.Unlock()
}
