---
author: Saksham Dua
pubDatetime: 2026-03-28T00:00:00Z
title: Adding Server-Side Encryption to TrailAI
slug: adding-server-side-encryption-to-trailai
featured: false
draft: false
description: How we implemented AES-256-GCM encryption in TrailAI to protect user notes at rest, including performance benchmarks and implementation details.
---

When working on the first version of TrailAI, user notes were stored as plain text in our PostgreSQL database. Anyone with database access could read every note. Even though it's a small project with a few users, having plain text stored directly inside the DB was not a comfortable idea for me.

So, we ended up implementing AES-256-GCM encryption for all user data. Here's the technical deep dive on how it works.

## Table of contents

## The Problem: Plain Text Storage

In the initial version of TrailAI, notes were stored like this:

```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

When a user created a note, we'd simply insert the raw text:

```go
_, err := db.Exec(
  "INSERT INTO notes (id, user_id, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
  noteID, userID, plainContent, now, now,
)
```

This meant:
- Database administrators could read all notes
- Backup files contained plain text
- Any database breach would expose all user data immediately
- Compliance issues for handling sensitive user information

## The Solution: AES-256-GCM Encryption

We chose **AES-256-GCM** for several reasons:

1. **AEAD (Authenticated Encryption with Associated Data)**: Provides both confidentiality and integrity
2. **Industry Standard**: Widely adopted and well-tested
3. **Performance**: Hardware-accelerated on modern CPUs
4. **Security**: Resistant to chosen-ciphertext attacks

### Implementation Architecture

The encryption happens at the application layer, completely transparent to both the database and the frontend client:

```
Client (Plain Text)
    ↓
API Layer (Encryption/Decryption)
    ↓
PostgreSQL (Encrypted Text)
```

Every **CREATE** and **UPDATE** encrypts data before storage. Every **READ** decrypts before returning to the client. The frontend receives plain text - encryption is completely transparent to the client.

### Core Implementation

Here's the actual Go implementation from TrailAI using the standard library's `crypto/cipher` package:

```go
package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

// Encrypt encrypts plaintext using AES-256-GCM
func Encrypt(plaintext string, key []byte) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	if len(key) != 32 {
		return "", errors.New("encryption key must be 32 bytes for AES-256")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts ciphertext using AES-256-GCM
func Decrypt(ciphertext string, key []byte) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	if len(key) != 32 {
		return "", errors.New("encryption key must be 32 bytes for AES-256")
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, encryptedData := data[:nonceSize], data[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
```

### Database Integration

TrailAI uses GORM as the ORM. Here's the actual database model:

```go
type Note struct {
	ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey;not null" json:"id"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	User      User           `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;foreignKey:UserID;references:ID" json:"-"`
	Title     string         `gorm:"size:100" json:"title" validate:"max=100"`
	Content   string         `gorm:"size:50000" json:"content" validate:"max=50000"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at"`
}
```

We updated our database operations to encrypt before writes:

```go
func CreateNote(userId uuid.UUID, title string, content string) (*models.Note, error) {
	// Check note count limit (10 notes max for free tier)
	var noteCount int64
	if err := DB.Model(&models.Note{}).Where("user_id = ?", userId).Count(&noteCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count notes: %w", err)
	}

	if noteCount >= 10 {
		return nil, fmt.Errorf("note limit reached: you have reached the maximum of 10 notes")
	}

	// Encrypt title and content before storing
	encryptedTitle, err := utils.Encrypt(title, config.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt title: %w", err)
	}

	encryptedContent, err := utils.Encrypt(content, config.EncryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt content: %w", err)
	}

	note := models.Note{
		UserID:  userId,
		Title:   encryptedTitle,
		Content: encryptedContent,
	}

	if err := DB.Clauses(clause.Returning{}).Create(&note).Error; err != nil {
		return nil, err
	}

	// Decrypt before returning to caller
	note.Title, err = utils.Decrypt(note.Title, config.EncryptionKey)
	if err != nil {
		log.Printf("Warning: failed to decrypt title after create: %v", err)
	}

	note.Content, err = utils.Decrypt(note.Content, config.EncryptionKey)
	if err != nil {
		log.Printf("Warning: failed to decrypt content after create: %v", err)
	}

	return &note, nil
}
```

And decrypt on reads:

```go
func FetchNotes(skip int, take int, userId uuid.UUID) ([]models.Note, int64, error) {
	var notes []models.Note
	var total int64

	if err := DB.Where("user_id = ?", userId).Model(&models.Note{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := DB.Where("user_id = ?", userId).Order("updated_at DESC").Offset(skip).Limit(take).Find(&notes).Error; err != nil {
		return nil, 0, err
	}

	// Decrypt all notes before returning
	for i := range notes {
		var err error
		notes[i].Title, err = utils.Decrypt(notes[i].Title, config.EncryptionKey)
		if err != nil {
			log.Printf("Warning: failed to decrypt title for note %s: %v", notes[i].ID, err)
		}

		notes[i].Content, err = utils.Decrypt(notes[i].Content, config.EncryptionKey)
		if err != nil {
			log.Printf("Warning: failed to decrypt content for note %s: %v", notes[i].ID, err)
		}
	}

	return notes, total, nil
}
```

## The AI Insights Challenge

TrailAI's unique use case presented an interesting challenge: **AI-powered insights**. Our cron jobs need to analyze user notes to generate daily insights, summaries, and weekly recaps.

This means:
1. Fetch encrypted notes from database for a specific date range
2. Decrypt notes in memory
3. Pass decrypted notes to OpenAI for AI insight generation
4. Encrypt the AI-generated insights before storage
5. Clear plaintext from memory

Here's how we fetch and decrypt notes for a specific day:

```go
// GetNotesByDateRange fetches notes for a user within a date range
func GetNotesByDateRange(userID uuid.UUID, date time.Time) ([]models.Note, error) {
	var notes []models.Note

	// Get start and end of the day in PST
	startOfDay := utils.StartOfDayPST(date)
	endOfDay := utils.EndOfDayPST(date)

	log.Printf("Fetching notes from %s to %s (PST)", startOfDay.Format("2006-01-02 15:04:05 MST"), endOfDay.Format("2006-01-02 15:04:05 MST"))

	err := DB.Where("user_id = ? AND updated_at >= ? AND updated_at <= ?", userID, startOfDay, endOfDay).
		Order("updated_at DESC").
		Find(&notes).Error

	if err != nil {
		return nil, err
	}

	// Decrypt notes before returning
	for i := range notes {
		notes[i].Title, err = utils.Decrypt(notes[i].Title, config.EncryptionKey)
		if err != nil {
			log.Printf("Warning: failed to decrypt title for note %s: %v", notes[i].ID, err)
		}

		notes[i].Content, err = utils.Decrypt(notes[i].Content, config.EncryptionKey)
		if err != nil {
			log.Printf("Warning: failed to decrypt content for note %s: %v", notes[i].ID, err)
		}
	}

	return notes, nil
}
```

Then we generate AI insights using OpenAI:

```go
// GenerateSummaryWithAI uses OpenAI to generate a summary from notes
func GenerateSummaryWithAI(ctx context.Context, notes []models.Note) (string, error) {
	if openaiClient == nil {
		return "", fmt.Errorf("OpenAI client not initialized")
	}

	var prompt = daily_prompt // Predefined prompt for daily insights

	for i, note := range notes {
		prompt += fmt.Sprintf("Note %d:\nTitle: %s\nContent: %s\nUpdatedAt: %s \n\n", i+1, note.Title, note.Content, note.UpdatedAt)
	}

	// Call OpenAI API
	resp, err := openaiClient.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: openai.GPT4oMini,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: "You are an assistant that creates a detailed summary of a user's notes for the day without missing any information from the notes. You MUST respond with valid JSON only, following the exact structure provided in the prompt.",
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
			MaxTokens:   1000,
			Temperature: 0.7,
		},
	)

	if err != nil {
		return "", fmt.Errorf("OpenAI API error: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return resp.Choices[0].Message.Content, nil
}
```

And finally, encrypt the insights before storage:

```go
// CreateOrUpdateDailyInsight creates or updates a daily insight for a user
func CreateOrUpdateDailyInsight(userID uuid.UUID, date time.Time, summary string) error {
	// Encrypt summary before storing
	encryptedSummary, err := utils.Encrypt(summary, config.EncryptionKey)
	if err != nil {
		return fmt.Errorf("failed to encrypt summary: %w", err)
	}

	// Normalize date to PST start of day for consistent storage
	normalizedDate := utils.StartOfDayPST(date)

	var existingInsight models.DailyInsight
	result := DB.Where("user_id = ? AND date = ?", userID, normalizedDate).First(&existingInsight)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new insight
		insight := models.DailyInsight{
			UserID:  userID,
			Date:    normalizedDate,
			Summary: encryptedSummary,
		}
		return DB.Create(&insight).Error
	} else if result.Error == nil {
		// Update existing insight
		return DB.Model(&existingInsight).Update("summary", encryptedSummary).Error
	}

	return result.Error
}
```

## Nonce Handling: Why Random Matters

Each encryption uses a **random nonce** (Number Used Once), so the same content encrypted twice produces different ciphertext. This is critical for security:

```go
// Same note encrypted twice produces different output
encrypted1, _ := Encrypt("Hello World")
encrypted2, _ := Encrypt("Hello World")

fmt.Println(encrypted1 == encrypted2) // false
```

**Why this matters:**
- Prevents pattern analysis attacks
- Even if two users write identical notes, the ciphertext is different
- Replay attacks become impossible
- Forward secrecy is maintained

The nonce is stored alongside the ciphertext (prepended), so we don't need a separate nonce column in the database.

## Performance Benchmarks

I ran benchmarks on encryption/decryption performance:

```go
func BenchmarkEncrypt(b *testing.B) {
	InitEncryption(os.Getenv("ENCRYPTION_KEY"))
	content := strings.Repeat("This is a test note. ", 50) // ~1KB

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Encrypt(content)
	}
}

func BenchmarkDecrypt(b *testing.B) {
	InitEncryption(os.Getenv("ENCRYPTION_KEY"))
	content := strings.Repeat("This is a test note. ", 50)
	encrypted, _ := Encrypt(content)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = Decrypt(encrypted)
	}
}
```

**Results on a 2023 MacBook Pro (M2):**

| Operation | Time per Op | Allocations |
|-----------|-------------|-------------|
| Encryption | ~0.5ms | 5 allocs |
| Decryption | ~0.3ms | 4 allocs |

**Database Impact:**
- Storage size increase: ~33% due to base64 encoding overhead
- Original note: 1000 bytes → Encrypted: ~1330 bytes
- Query performance: No noticeable difference (encryption happens after fetch)

The CPU cost is **negligible** compared to the security gain.

## Key Management

The encryption key is:
- Generated using `openssl rand -base64 32`
- Stored in environment variables (never in code)
- Loaded once at application startup
- Rotated quarterly (with migration script for re-encryption)

```bash
# Generate a new key
openssl rand -base64 32

# Add to .env
ENCRYPTION_KEY=your_generated_key_here
```

### Key Rotation Strategy

For key rotation, we implement a two-key approach:

```go
var (
	currentKey  []byte
	previousKey []byte
)

func Decrypt(ciphertext string) (string, error) {
	// Try current key first
	plaintext, err := decryptWithKey(ciphertext, currentKey)
	if err == nil {
		return plaintext, nil
	}

	// Fall back to previous key (during rotation period)
	if previousKey != nil {
		return decryptWithKey(ciphertext, previousKey)
	}

	return "", err
}
```

## Security Considerations

### Additional Hardening
- Key stored in AWS Secrets Manager / HashiCorp Vault
- Audit logs for all decrypt operations
- Rate limiting on API endpoints
- Multi-factor authentication for admin access

## Migration Strategy

We migrated existing plain text data with zero downtime:

1. **Add migration flag**: `encrypted BOOLEAN DEFAULT FALSE`
2. **Dual-write mode**: Encrypt new notes, keep old notes as-is
3. **Background migration**: Slowly encrypt old notes in batches
4. **Validation**: Ensure encrypted notes can be decrypted
5. **Cleanup**: Remove migration flag once 100% migrated

```go
func MigrateNotes() error {
	// Process in batches to avoid memory issues
	for {
		rows, err := db.Query(
			"SELECT id, content FROM notes WHERE encrypted = false LIMIT 100",
		)
		if err != nil {
			return err
		}

		count := 0
		for rows.Next() {
			var id uuid.UUID
			var plainContent string

			rows.Scan(&id, &plainContent)

			encryptedContent, err := encryption.Encrypt(plainContent)
			if err != nil {
				log.Printf("Failed to encrypt note %s: %v", id, err)
				continue
			}

			_, err = db.Exec(
				"UPDATE notes SET content = $1, encrypted = true WHERE id = $2",
				encryptedContent, id,
			)
			if err != nil {
				log.Printf("Failed to update note %s: %v", id, err)
			}
			count++
		}
		rows.Close()

		if count == 0 {
			break
		}

		log.Printf("Migrated %d notes", count)
		time.Sleep(1 * time.Second) // Rate limit
	}

	return nil
}
```

## Lessons Learned

1. **Start with encryption from day one** - Migration is complex and risky
2. **Transparent encryption works well** - Frontend doesn't need to know
3. **Performance impact is minimal** - Modern CPUs handle AES efficiently
4. **Key management is the hard part** - Use a proper secret management system
5. **Test decryption in your backups** - Encrypted data is useless if you can't decrypt it

## Conclusion

Adding encryption at rest was one of the best decisions for TrailAI. It took about a week to implement and migrate, but the peace of mind is worth it. Users trust us with their personal notes and thoughts - the least we can do is ensure they're protected.

If you're building a similar application, don't wait. Implement encryption early, use established standards like AES-256-GCM, and invest in proper key management. Your users (and your future self) will thank you.

---

**Resources:**
- [AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Go crypto/cipher Package](https://pkg.go.dev/crypto/cipher)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
