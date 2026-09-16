// Package secrets encrypts credential payloads at rest with AES-256-GCM.
// Ciphertext layout: nonce || ciphertext.
package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
)

type Encryptor struct {
	aead cipher.AEAD
}

// NewEncryptor accepts a 32-byte key as hex or base64 (std or raw encoding).
func NewEncryptor(raw string) (*Encryptor, error) {
	key, err := decodeKey(raw)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("init cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("init gcm: %w", err)
	}
	return &Encryptor{aead: aead}, nil
}

func decodeKey(raw string) ([]byte, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, errors.New("encryption key is empty")
	}
	for _, decode := range []func(string) ([]byte, error){
		hex.DecodeString,
		base64.StdEncoding.DecodeString,
		base64.RawStdEncoding.DecodeString,
		base64.URLEncoding.DecodeString,
		base64.RawURLEncoding.DecodeString,
	} {
		key, err := decode(trimmed)
		if err == nil && len(key) == 32 {
			return key, nil
		}
	}
	return nil, errors.New("encryption key must decode to 32 bytes (hex or base64)")
}

func (e *Encryptor) Encrypt(plaintext []byte) ([]byte, error) {
	nonce := make([]byte, e.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("nonce: %w", err)
	}
	return e.aead.Seal(nonce, nonce, plaintext, nil), nil
}

func (e *Encryptor) Decrypt(ciphertext []byte) ([]byte, error) {
	if len(ciphertext) < e.aead.NonceSize() {
		return nil, errors.New("ciphertext too short")
	}
	nonce, body := ciphertext[:e.aead.NonceSize()], ciphertext[e.aead.NonceSize():]
	plain, err := e.aead.Open(nil, nonce, body, nil)
	if err != nil {
		return nil, fmt.Errorf("decrypt: %w", err)
	}
	return plain, nil
}
