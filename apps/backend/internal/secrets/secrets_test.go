package secrets

import (
	"encoding/base64"
	"encoding/hex"
	"testing"
)

const testKeyHex = "3031323334353637383961626364656630313233343536373839616263646566"

func TestRoundTrip(t *testing.T) {
	enc, err := NewEncryptor(testKeyHex)
	if err != nil {
		t.Fatalf("NewEncryptor: %v", err)
	}
	plain := []byte(`{"api_key":"ryb-secret-token"}`)
	ciphertext, err := enc.Encrypt(plain)
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if string(ciphertext) == string(plain) {
		t.Fatal("ciphertext contains plaintext")
	}
	got, err := enc.Decrypt(ciphertext)
	if err != nil {
		t.Fatalf("Decrypt: %v", err)
	}
	if string(got) != string(plain) {
		t.Fatalf("round trip mismatch: got %q", got)
	}
}

func TestKeyDecoding(t *testing.T) {
	raw := make([]byte, 32)
	for i := range raw {
		raw[i] = byte(i)
	}
	for name, key := range map[string]string{
		"hex":        hex.EncodeToString(raw),
		"base64":     base64.StdEncoding.EncodeToString(raw),
		"base64-raw": base64.RawStdEncoding.EncodeToString(raw),
		"base64-url": base64.URLEncoding.EncodeToString(raw),
		"whitespace": "  " + hex.EncodeToString(raw) + "\n",
	} {
		if _, err := NewEncryptor(key); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestRejectsBadKeys(t *testing.T) {
	for _, key := range []string{
		"",
		"too-short-hex",
		hex.EncodeToString([]byte("sixteen-byte-key")),
		"!!!not-encoded!!!",
	} {
		if _, err := NewEncryptor(key); err == nil {
			t.Errorf("expected error for key %q", key)
		}
	}
}

func TestDecryptRejectsGarbage(t *testing.T) {
	enc, err := NewEncryptor(testKeyHex)
	if err != nil {
		t.Fatalf("NewEncryptor: %v", err)
	}
	if _, err := enc.Decrypt([]byte("short")); err == nil {
		t.Error("expected error for short ciphertext")
	}
	if _, err := enc.Decrypt(make([]byte, 64)); err == nil {
		t.Error("expected error for unauthenticated ciphertext")
	}
}

func TestCrossKeyFails(t *testing.T) {
	a, _ := NewEncryptor(testKeyHex)
	other := hex.EncodeToString([]byte("0123456789abcdef0123456789abcde0"))
	b, _ := NewEncryptor(other)
	ciphertext, _ := a.Encrypt([]byte("secret"))
	if _, err := b.Decrypt(ciphertext); err == nil {
		t.Error("expected decryption to fail with a different key")
	}
}
