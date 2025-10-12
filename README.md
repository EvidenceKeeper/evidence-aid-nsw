# NSW Legal Evidence Manager

**Trauma-Informed AI Legal Assistant for NSW, Australia**

> **Latest Update (2025)**: Complete chatbot rebuild - 10x faster, embeddings-free architecture with real-time streaming!

## Project info

**URL**: https://lovable.dev/projects/93eec4ba-e16c-42d9-9d7f-5d6d45d07275

## Overview

This application helps NSW residents navigate legal matters (domestic violence, parenting disputes, ADVOs) with an empathetic AI assistant named Veronica. Key features:

- 🤖 **AI Chat**: Streaming responses with NSW legal context
- 📁 **Evidence Manager**: Upload and organize case files  
- 📅 **Timeline**: Track events and build your case
- ⚖️ **NSW Legal Database**: Searchable legislation and case law
- 🔒 **Trauma-Informed**: Safe, supportive, user-focused design

### Architecture Highlights

**2025 Rebuild:**
- ✅ **No embeddings** - Direct text processing (10x faster)
- ✅ **Token streaming** - Real-time AI responses
- ✅ **Full-text search** - NSW legal content via PostgreSQL
- ✅ **Simplified pipeline** - Upload → Extract → Ready in <3 seconds

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres, Storage, Edge Functions)
- AI: Lovable AI Gateway (Google Gemini 2.5 Flash)
- Search: PostgreSQL full-text (GIN indexes)

📖 **Detailed Docs:**
- [Architecture Overview](./docs/Architecture-Overview.md)
- [Testing Guide](./docs/Chatbot-Rebuild-Testing.md)
- [Legal Training Document](./docs/Legal-Journey-Training-Document.md)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/93eec4ba-e16c-42d9-9d7f-5d6d45d07275) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/93eec4ba-e16c-42d9-9d7f-5d6d45d07275) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
