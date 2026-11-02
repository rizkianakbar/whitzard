// Package evidence stores evidence documents (e.g. hospital bills) off-chain, on local disk,
// named by their SHA-256. The same hash is what the requester puts on-chain as `evidenceHash`,
// so anyone holding the document can check it was not changed.
//
// These are health documents (UU 27/2022): callers must check access before Open, and nothing
// here logs their contents.
package evidence

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
)

// AllowedTypes are the accepted document types, detected from the content, not the file name.
var AllowedTypes = map[string]bool{
	"application/pdf": true,
	"image/png":       true,
	"image/jpeg":      true,
	"image/webp":      true,
}

var (
	// ErrTooLarge means the document exceeds the size limit.
	ErrTooLarge = errors.New("document too large")
	// ErrType means the document is not an accepted type.
	ErrType = errors.New("document type not accepted (PDF, PNG, JPEG or WebP)")
	// ErrNotFound means no document has that hash.
	ErrNotFound = errors.New("document not found")
	// ErrEmpty means the upload was empty.
	ErrEmpty = errors.New("document is empty")
)

var hashPattern = regexp.MustCompile(`^0x[0-9a-f]{64}$`)

// Saved describes a stored document.
type Saved struct {
	Hash        string // 0x-prefixed lowercase SHA-256, the on-chain evidenceHash
	Size        int64
	ContentType string
}

// Disk stores documents as files in Dir.
type Disk struct {
	Dir      string
	MaxBytes int64
	Types    map[string]bool // accepted content types; nil means AllowedTypes
}

// NewDisk creates the directory if needed.
func NewDisk(dir string, maxBytes int64) (*Disk, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	return &Disk{Dir: dir, MaxBytes: maxBytes}, nil
}

// Save streams r to disk while hashing it, then stores it under its hash. Saving the same
// document twice is harmless.
func (d *Disk) Save(r io.Reader) (Saved, error) {
	tmp, err := os.CreateTemp(d.Dir, "upload-*")
	if err != nil {
		return Saved{}, err
	}
	defer os.Remove(tmp.Name()) // no-op after a successful rename

	hasher := sha256.New()
	head := make([]byte, 512)
	n, err := io.ReadFull(r, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		tmp.Close()
		return Saved{}, err
	}
	head = head[:n]
	if n == 0 {
		tmp.Close()
		return Saved{}, ErrEmpty
	}
	contentType := http.DetectContentType(head)
	types := d.Types
	if types == nil {
		types = AllowedTypes
	}
	if !types[contentType] {
		tmp.Close()
		return Saved{}, ErrType
	}

	w := io.MultiWriter(tmp, hasher)
	if _, err := w.Write(head); err != nil {
		tmp.Close()
		return Saved{}, err
	}
	// Read one byte past the limit to detect oversized uploads.
	rest, err := io.Copy(w, io.LimitReader(r, d.MaxBytes-int64(n)+1))
	if err != nil {
		tmp.Close()
		return Saved{}, err
	}
	size := int64(n) + rest
	if size > d.MaxBytes {
		tmp.Close()
		return Saved{}, ErrTooLarge
	}
	if err := tmp.Close(); err != nil {
		return Saved{}, err
	}

	hash := "0x" + hex.EncodeToString(hasher.Sum(nil))
	if err := os.Rename(tmp.Name(), d.path(hash)); err != nil {
		return Saved{}, err
	}
	return Saved{Hash: hash, Size: size, ContentType: contentType}, nil
}

// Open returns the document with the given hash. Check access first.
func (d *Disk) Open(hash string) (*os.File, error) {
	if !hashPattern.MatchString(hash) {
		return nil, fmt.Errorf("invalid hash %q", hash)
	}
	f, err := os.Open(d.path(hash))
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNotFound
	}
	return f, err
}

func (d *Disk) path(hash string) string {
	return filepath.Join(d.Dir, hash[2:])
}
