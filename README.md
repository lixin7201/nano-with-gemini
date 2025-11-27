# Nano Banana2

Nano Banana2 is an advanced AI image generation platform powered by Google's Gemini models.

## Features

- **High Quality Generation**: Leverage Gemini 3 Pro Image Preview for stunning visuals.
- **Multi-Resolution**: Support for 1K, 2K, and 4K output.
- **Image-to-Image**: Create variations of existing images.
- **Secure Payments**: Integrated with Creem for secure credit purchases.
- **User History**: Track and manage your generated images.

## Getting Started

1.  **Clone and Install**

    ```bash
    git clone <your-repo-url>
    cd nano-banana2
    pnpm install
    ```

2.  **Environment Setup**

    Copy `.env.example` to `.env` and configure your keys:

    ```bash
    cp .env.example .env
    ```

3.  **Database Setup**

    ```bash
    pnpm db:generate
    pnpm db:migrate
    ```

4.  **Run Development Server**

    ```bash
    pnpm dev
    ```

## Deployment

Deploy to Vercel or Cloudflare using the provided scripts.

```bash
pnpm build
```
