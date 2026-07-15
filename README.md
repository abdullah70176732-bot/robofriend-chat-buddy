# 🤖 Nova Bot

> A beautiful, AI-powered chatbot built with **React 19**, **TanStack Start**, and **Gemini**.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-v1-FFD700?logo=tanstack&logoColor=white)](https://tanstack.com/start)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)

Nova Bot is a modern, multi-modal AI assistant that runs entirely in your browser. Chat with Google's Gemini models, upload images for vision analysis, generate AI images, listen to replies with text-to-speech, and manage multiple chat sessions — all with a polished, themeable UI.

---

## ✨ Features

- 💬 **Real AI Conversations** — Powered by Google's Gemini API with conversation memory.
- 🖼️ **Vision & Image Generation** — Upload images for analysis or generate images from prompts.
- 🌍 **Multi-Language Support** — Chat in English, Urdu, Roman Urdu, Spanish, and more.
- 🎭 **Persona Selector** — Switch personalities like *Friendly Teacher*, *Funny Friend*, and *Aero-Tech 2050*.
- 🎨 **Theme Backgrounds** — Choose from Soft Blue, Sunset Glow, Aurora, Midnight, Mint Frost, and Rose Garden.
- 🎙️ **Voice Input & Output** — Speak your message and listen to AI replies aloud.
- 📜 **Chat History** — Create, rename, search, and delete multiple sessions saved in `localStorage`.
- 💻 **Code Highlighting** — Beautiful dark code blocks with one-click copy.
- 📊 **Session Analytics** — Track words sent, response times, and message counts.
- 📄 **Export Chats** — Download conversations as PDF or plain text.
- 🌙 **Dark Mode** — Toggle between light and dark themes.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `18.x` or later
- [Bun](https://bun.sh/) (recommended — this project uses `bun.lock`)

> Don't have Bun? Install it with:
> ```bash
> curl -fsSL https://bun.sh/install | bash
> ```

---

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/abdullahtanveer70176732-stack/Nova-Bot.git
   cd Nova-Bot
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

   Or with npm:

   ```bash
   npm install
   ```

---

## 🖥️ Running the App

Start the local development server:

```bash
bun run dev
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Available Scripts

| Command | Description |
|--------|-------------|
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Build for production |
| `bun run build:dev` | Build in development mode |
| `bun run preview` | Preview the production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format code with Prettier |

---

## 🔐 Environment Variables

Nova Bot runs fully in the browser and does **not** require a backend `.env` file. The only required secret is your **Gemini API Key**, which you enter directly inside the app.

### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API key**.
4. Copy the generated key.

### Configuring the Key in Nova Bot

1. Launch the app and click the **⚙️ Settings** icon in the top-right header.
2. Paste your Gemini API Key into the **Gemini API Key** field.
3. Click **Save**.

> 🔒 Your API key is stored **locally in your browser's `localStorage`** and is never sent to any server besides Google's Gemini API.

### Optional: Local `.env` for Development

If you prefer to keep a reference key for development tooling, you can create a `.env` file in the project root:

```bash
# .env (optional, for reference only — not required to run)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> The app currently reads the key from the Settings modal, not from environment variables. This may change in future versions.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) |
| UI Library | [React 19](https://react.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Components | [Radix UI](https://www.radix-ui.com) + shadcn/ui patterns |
| Icons | [Lucide React](https://lucide.dev) |
| AI API | [Google Gemini API](https://ai.google.dev) |
| Charts | [Recharts](https://recharts.org) |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) |

---

## 📁 Project Structure

```text
Nova-Bot/
├── public/                  # Static assets
├── src/
│   ├── routes/
│   │   ├── __root.tsx       # Root layout, fonts, SEO metadata
│   │   └── index.tsx        # Main Nova Bot chat application
│   ├── styles.css           # Tailwind v4 theme + custom animations
│   └── router.tsx           # TanStack Router configuration
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Vite + TanStack plugin config
├── tsconfig.json            # TypeScript configuration
└── README.md                # You are here!
```

---

## 🧪 Browser APIs Used

Nova Bot uses modern browser APIs for a native feel:

- **Web Speech API** — Voice input (`SpeechRecognition`) and text-to-speech (`SpeechSynthesis`).
- **Web Audio API** — Synthetic click and pop sound effects.
- **FileReader API** — Reading uploaded images before sending to Gemini.
- **localStorage API** — Persisting chat history, settings, and themes.

> For voice features to work, make sure your browser has microphone permissions enabled.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve Nova Bot:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/my-feature`.
3. Make your changes and run `bun run lint`.
4. Submit a pull request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with 💙 by the Nova Bot community
</p>
