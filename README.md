# Rockauto Wholesaler Closeouts Parser

## Description

This is a small Node.js application that allows you to track Wholesaler Closeouts for a selected car and send notification to Telegram chat

![Telegram notification](https://github.com/imdimasan/rockparser/blob/prod/assets/example.jpg?raw=true)

## ENV

Check .env.example

- URL - Find direct closeouts URL for necessary year/make/model with [https://www.rockauto.com](https://www.rockauto.com)

- TELEGRAM_TOKEN - Create a bot with [@BotFather](https://t.me/BotFather)
- TELEGRAM_CHATID - Create a private/public chat and invite your created bot into it
- TIMEOUT - Refresh rate in milliseconds (Recommended more that once per 5 mins)

## Deploy

Runs on any server with Node.js support with

```bash
node parse.js

OR

npm run start
```

Simply deploy with [Railway](https://railway.app?referralCode=pm9edL)
