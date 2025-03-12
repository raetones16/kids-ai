# Kids-AI Backend Server

This directory contains the backend server for the Kids-AI project, providing:

1. Database storage for child profiles and conversations
2. Brave Search API proxy to bypass CORS restrictions
3. Migration functionality to transition from localStorage to server-based storage

## Setup Instructions

### 1. Install Dependencies

First, install the required dependencies:

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on the `.env.example` file:

```bash
cp .env.example .env
```

Then, edit the `.env` file to add:
- Your Brave Search API key
- Your Turso database credentials

### 3. Set Up Turso Database

#### Option 1: Using Turso Cloud

1. Create a Turso account at [turso.tech](https://turso.tech)
2. Install the Turso CLI:
   ```bash
   brew install tursodatabase/tap/turso  # macOS
   # Or for other platforms, see: https://docs.turso.tech/reference/turso-cli
   ```
3. Log in to Turso:
   ```bash
   turso auth login
   ```
4. Create a database:
   ```bash
   turso db create kids-ai-db
   ```
5. Get the database URL and auth token:
   ```bash
   turso db show kids-ai-db --url
   turso db tokens create kids-ai-db
   ```
6. Add these credentials to your `.env` file:
   ```
   TURSO_DB_URL=your_database_url_here
   TURSO_DB_AUTH_TOKEN=your_auth_token_here
   ```
7. Apply the schema:
   ```bash
   node update-turso-db.js
   ```

#### Option 2: Using In-Memory Database (Development)

For development, you can leave the Turso credentials blank, and the server will automatically use an in-memory SQLite database that will persist only for the duration of the server process.

### 4. Start the Server

```bash
npm run dev  # For development mode with auto-reload
# OR
npm start    # For production mode
```

The server will start on port 3001 by default (configurable in `.env`).

## API Endpoints

### Profiles API

- `GET /api/profiles` - Get all child profiles
- `GET /api/profiles/:id` - Get a specific child profile
- `POST /api/profiles` - Create a new child profile
- `PUT /api/profiles/:id` - Update an existing profile
- `DELETE /api/profiles/:id` - Delete a profile

### Conversations API

- `GET /api/conversations/child/:childId` - Get all conversations for a specific child
- `GET /api/conversations/:id` - Get a specific conversation
- `GET /api/conversations/:id/messages` - Get all messages for a conversation
- `POST /api/conversations` - Create a new conversation
- `POST /api/conversations/:id/messages` - Add a message to a conversation

### Settings API

- `GET /api/settings` - Get application settings (currently just parent PIN)
- `PUT /api/settings/pin` - Update parent PIN
- `POST /api/settings/verify-pin` - Verify parent PIN

### Search API

- `GET /api/search?q={query}` - Proxy for Brave Search API

### Migration API

- `POST /api/migration/import` - Import data from localStorage

## Database Schema

The database schema includes:

- `child_profiles` - Child profile information
- `conversations` - Conversation metadata
- `messages` - Individual messages in conversations
- `settings` - Application settings

See `db/schema.sql` for the complete schema definition.

## Production Deployment

This server can be deployed to services like Render.com or Railway. Ensure that:

1. Environment variables are properly configured
2. The server is allowed to connect to the Turso database
3. CORS is properly configured to allow only your frontend domain

## Troubleshooting

- **Database Connection Issues**: Verify your Turso credentials and that the database exists
- **CORS Errors**: Check that your frontend URL is properly configured in the CORS middleware
- **Search API Errors**: Verify your Brave Search API key
