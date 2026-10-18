package evidence_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"testing"

	"github.com/rizkianakbar/whitzard/backend/internal/evidence"
)

var pdf = append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("bill line\n"), 100)...)

func newDisk(t *testing.T, max int64) *evidence.Disk {
	t.Helper()
	d, err := evidence.NewDisk(t.TempDir(), max)
	if err != nil {
		t.Fatal(err)
	}
	return d
}

func TestSaveAndOpen(t *testing.T) {
	d := newDisk(t, 1<<20)
	saved, err := d.Save(bytes.NewReader(pdf))
	if err != nil {
		t.Fatal(err)
	}
	sum := sha256.Sum256(pdf)
	if want := "0x" + hex.EncodeToString(sum[:]); saved.Hash != want {
		t.Fatalf("hash %s, want %s", saved.Hash, want)
	}
	if saved.Size != int64(len(pdf)) || saved.ContentType != "application/pdf" {
		t.Fatalf("saved = %+v", saved)
	}

	f, err := d.Open(saved.Hash)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	got, _ := io.ReadAll(f)
	if !bytes.Equal(got, pdf) {
		t.Fatal("content differs")
	}

	// Saving the same document again is harmless.
	if again, err := d.Save(bytes.NewReader(pdf)); err != nil || again.Hash != saved.Hash {
		t.Fatalf("second save: %+v, %v", again, err)
	}
}

func TestRejects(t *testing.T) {
	d := newDisk(t, 512)
	cases := map[string]struct {
		body []byte
		want error
	}{
		"empty":     {nil, evidence.ErrEmpty},
		"html":      {[]byte("<html><script>alert(1)</script></html>"), evidence.ErrType},
		"too large": {append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("x"), 600)...), evidence.ErrTooLarge},
	}
	for name, c := range cases {
		if _, err := d.Save(bytes.NewReader(c.body)); !errors.Is(err, c.want) {
			t.Errorf("%s: err = %v, want %v", name, err, c.want)
		}
	}
	if _, err := d.Open("0x" + hex.EncodeToString(make([]byte, 32))); !errors.Is(err, evidence.ErrNotFound) {
		t.Errorf("missing document: %v", err)
	}
	if _, err := d.Open("../../etc/passwd"); err == nil {
		t.Error("path traversal must be rejected")
	}
}

func TestExactlyMaxSizeIsAccepted(t *testing.T) {
	body := append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("x"), 503)...) // 512 bytes
	if _, err := newDisk(t, 512).Save(bytes.NewReader(body)); err != nil {
		t.Fatalf("512-byte document with a 512-byte limit: %v", err)
	}
}
