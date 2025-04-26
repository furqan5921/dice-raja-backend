# Dice Raja Backend

Backend services for the Dice Raja online board game platform.

## Starting the Backend

You can start the backend services using any of the following methods:

### Option 1: Run with single command (Recommended)

```bash
npm run start:all
```

Or using the shell script:

```bash
./start.sh
```

This will start both the Socket server and API server simultaneously with color-coded logs.

### Option 2: Start services individually

Start the Socket server:

```bash
npm start
```

Start the API server:

```bash
npm run start:api
```

## Development Mode

For development with auto-reload:

Start both services in development mode:

```bash
npm run dev:all
```

Or individually:

```bash
npm run dev        # Socket server with auto-reload
npm run dev:api    # API server with auto-reload
```

## Environment Configuration

Configure your environment by setting values in the `.env` file:

- `PORT`: Main server port (default: 8010)
- `API_PORT`: API server port (default: 8020)
- `SOCKET_PORT`: Socket server port (default: 8030)
- `MONGODB_URI`: MongoDB connection string
- `FRONTEND_URL`: Frontend development URL
- `FRONTEND_PROD_URL`: Frontend production URL

## Services

- **Socket Server**: Handles real-time game communications (port 8030)
- **API Server**: Handles authentication, user management, and other RESTful endpoints (port 8020)
