This document outlines the environment variables required to run the system and the recommended deployment strategy (Vercel + Supabase).

Markdown

# Deployment & Configuration Guide

## 1. Prerequisites
* **Node.js**: Version 18.17 or later.
* **Package Manager**: `npm` or `bun`.
* **Database**: A Supabase project (PostgreSQL).
* **AI Access**: A Google Cloud Project with the Gemini API enabled.

## 2. Environment Variables
Create a `.env.local` file in the root directory. The application REQUIRES the following keys:

### Supabase (Database & Auth)
```bash
NEXT_PUBLIC_SUPABASE_URL="[https://your-project-id.supabase.co](https://your-project-id.supabase.co)"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-public-anon-key"
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY="your-secret-service-role-key" 
# WARNING: SERVICE_ROLE_KEY is used for Admin APIs. NEVER expose this to the client.
Google Gemini (AI Features)
Bash

GEMINI_API_KEY="your-google-gemini-api-key"
Resend (Email Transactional)
Bash

RESEND_API_KEY="re_123456789"
3. Installation & Local Development
Install Dependencies:

Bash

npm install
# or
bun install
Database Setup:

Run the migration script schema-newest.sql in the Supabase SQL Editor.

Enable the pgvector extension (included in the script).

Run Development Server:

Bash

npm run dev
Access the app at http://localhost:3000.

4. Production Build
Building the App
To create an optimized production build:

Bash

npm run build
This command compiles the Next.js app, optimizes images, and generates static pages where possible.

Start Production Server
Bash

npm start
5. Deployment Recommendation (Vercel)
This project is optimized for Vercel:

Push your code to GitHub/GitLab.

Import the repository in Vercel.

Important: Add all Environment Variables from Section 2 into the Vercel Project Settings.

Middleware: The middleware.js file is compatible with Vercel Edge Runtime.

6. Troubleshooting
"Missing Service Role Key": If Admin APIs fail (500 Error), ensure NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set in the environment.

Vector Search Errors: Ensure you have enabled the vector extension in Supabase: CREATE EXTENSION vector;.

Images Not Loading: If using external image URLs (e.g., from Supabase Storage), you must add the hostname to next.config.mjs under images.remotePatterns.