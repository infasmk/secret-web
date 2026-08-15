# Security Specification for Ephemeral Encrypted Rooms

## 1. Data Invariants
1. **Zero-Knowledge Principle**: The backend never receives raw plain-text messages or private AES decryption keys. All payloads stored in `messages` are base64-encoded ciphertexts with distinct initialization vectors (IV).
2. **Room Expiration Boundary**: Once a room reaches its `expiresAt` timestamp or is marked `destroyed: true`, no new messages or member joins can be written.
3. **Immutable Origin Fields**: Document IDs, `createdAt`, `roomId`, and `sender` identities are immutable upon initial creation.
4. **Member Presence Expiration**: Member records are scoped strictly as subcollections under their respective `rooms/{roomId}` parent document.

## 2. Dirty Dozen Security Attack Payloads & Test Invariants
1. **Unauthenticated Global Read/Write**: Attempting to read `/{document=**}` without matching valid room logic -> **DENIED**.
2. **Expired Room Mutation**: Writing a message to a room whose `expiresAt` < current time -> **DENIED**.
3. **ID Poisoning / Denial-of-Wallet**: Writing document IDs exceeding 128 characters or containing invalid regex characters -> **DENIED**.
4. **Oversized Ciphertext Injection**: Sending encrypted payload strings exceeding length limit (e.g. > 1,000,000 chars in a single message) -> **DENIED**.
5. **Ghost Field / Shadow Key Attack**: Inserting unvalidated fields like `adminRole: true` or `bypassed: true` inside a Message document -> **DENIED**.
6. **Altered Sender Spoofing**: Updating an existing message to change `sender` or `roomId` -> **DENIED**.
7. **Creation Timestamp Tampering**: Submitting a room with invalid integer/float bounds -> **DENIED**.
8. **View-Once Re-burn Circumvention**: Non-permitted modifications to `viewed` states -> **DENIED**.
9. **Cross-Room Orphaned Messages**: Writing a message with `roomId` differing from parent document path variable `{roomId}` -> **DENIED**.
10. **Arbitrary Blanket List Querying**: Attempting to scrape messages without specifying the specific room path -> **DENIED**.
11. **Malicious Destruction Spoofing**: Non-members attempting to manipulate room security state -> **DENIED**.
12. **Malformed PIN Salt Injection**: Passing malicious or unformatted strings in salt fields -> **DENIED**.
