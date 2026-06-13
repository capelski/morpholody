# Morpholody MCP Server

A remote [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude users query their own Morpholody data (diary entries and ingredients) from a Firestore database.

## Tools exposed

| Tool                          | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `get_diary_entry`             | Fetch a single day's diary entry (meals, calories, weight) |
| `get_diary_entries_for_range` | Fetch all entries between two dates (max 90 days)          |
| `get_diary_summary_for_month` | Average calories & weight for a given month                |
| `list_ingredients`            | List all ingredients in the user's library                 |
| `search_ingredients`          | Search ingredients by name prefix                          |

## Authentication

Every request must include a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

The server verifies the token with Firebase Admin SDK and scopes all Firestore queries to `users/{uid}/...`, so users can only access their own data.

## Deploy

The MCP server is deployed as a Firebase Cloud Function. The source code is located at `../functions/src/index.ts`.

## Configure Claude to use this server

```json
{
  "mcpServers": {
    "morpholody": {
      "type": "http",
      "url": "<cloud-function-url>",
      "headers": {
        "Authorization": "Bearer <firebase-id-token>"
      }
    }
  }
}
```

Replace the `<cloud-function-url>` with the one printed by `firebase deploy`. Users obtain their Firebase ID token by calling `firebase.auth().currentUser.getIdToken()` in the Morpholody web app.
