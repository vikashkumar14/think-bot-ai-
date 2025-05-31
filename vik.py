import logging
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

# --- YOUR KEYS ---
TELEGRAM_BOT_TOKEN = '7482858905:AAEofvehdzQy8g3d0zi6u6AVc2vQK_gsqDE'
DEEPSEEK_API_KEY = 'sk-c2881aa94f6442dfae6055021d74671f'

# --- SETUP LOGGING ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# --- DEEPSEEK REQUEST FUNCTION ---
def ask_deepseek(message_text):
    try:
        url ="https://api.deepseek.com/v1/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }
        
        data = {
            "messages": [
                {
                    "role": "user",
                    "content": message_text
                }
            ],
            "model": "deepseek-chat",
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        response = requests.post(url, headers=headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                ai_response = result["choices"][0]["message"]["content"]
                formatted_reply = f"""<b>🤖 DeepSeek AI Response:</b>

{ai_response}

<i>Powered by DeepSeek AI (vikash)</i>"""
                return formatted_reply
            else:
                return "⚠️ No response generated from DeepSeek AI"
        else:
            return f"⚠️ API Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"⚠️ Error: {str(e)}"

# --- START COMMAND ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_message = """👋 Welcome to the DeepSeek AI Bot!
I can help you auto-reply in your Telegram group using keywords.

➤ Join our Group: <a href='https://t.me/rightwine'>https://t.me/rightwine</a>
➤ Subscribe on YouTube: <a href='https://youtube.com/@theeditorstar12?si=kcnwThsC2UZiXJ1-'>https://youtube.com/@theeditorstar12</a>

✨ Features:
- Powered by DeepSeek AI
- Smart responses to your messages
- Easy to use interface

💡 Just send me a message and I'll respond!"""
    await update.message.reply_text(welcome_message, parse_mode='HTML')

# --- HANDLE TEXT MESSAGES ---
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_message = update.message.text
    await update.message.chat.send_action(action="typing")
    
    ai_reply = ask_deepseek(user_message)
    
    await update.message.reply_text(ai_reply, parse_mode='HTML')

# --- HELP COMMAND ---
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = """📚 Bot Help Guide:

/start - Start the bot and get welcome message
/help - Show this help message
/addkeyword - Add new keyword response
/listkeywords - Show all keywords
/support - Get support information
/about - About this bot
/settings - Bot settings
/feedback - Send feedback

Need more help? Join our group!"""
    await update.message.reply_text(help_text)

# --- ADD KEYWORD COMMAND ---
async def add_keyword(update: Update, context: ContextTypes.DEFAULT_TYPE):
    usage = """To add a keyword, use this format:
/addkeyword <keyword> | <response>

Example:
/addkeyword hello | Hi there!"""
    await update.message.reply_text(usage)

# --- LIST KEYWORDS COMMAND ---
async def list_keywords(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🔑 Current active keywords:\n(Feature coming soon)")

# --- ABOUT COMMAND ---
async def about(update: Update, context: ContextTypes.DEFAULT_TYPE):
    about_text = """🤖 DeepSeek AI Bot v1.0
Powered by DeepSeek AI

Created by: @theeditorstar12
Support: @rightwine"""
    await update.message.reply_text(about_text)

# --- SETTINGS COMMAND ---
async def settings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    settings_text = """⚙️ Bot Settings:
    
1. Notification: ON
2. Auto-Reply: ON
3. AI Mode: Active

Use /help for more information."""
    await update.message.reply_text(settings_text)

# --- FEEDBACK COMMAND ---
async def feedback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    feedback_text = """📝 Send your feedback:
    
Please join our group and share your feedback:
https://t.me/rightwine"""
    await update.message.reply_text(feedback_text)

# --- SUPPORT COMMAND ---
async def support(update: Update, context: ContextTypes.DEFAULT_TYPE):
    support_text = """🆘 Need Help?

Join our support group:
https://t.me/rightwine

Or contact admin:
@theeditorstar12"""
    await update.message.reply_text(support_text)

# --- COMMANDS LIST ---
async def commands_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    command_message = """⚙️ Available Commands:

/start - Start the bot
/help - Get help and usage instructions
/addkeyword - Add a new keyword
/listkeywords - List all keywords
/about - About this bot
/settings - Bot settings
/feedback - Send feedback
/support - Get support

Use these commands to interact with the bot!"""
    await update.message.reply_text(command_message)

def main():
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Register all command handlers
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help', help_command))
    app.add_handler(CommandHandler('addkeyword', add_keyword))
    app.add_handler(CommandHandler('listkeywords', list_keywords))
    app.add_handler(CommandHandler('about', about))
    app.add_handler(CommandHandler('settings', settings))
    app.add_handler(CommandHandler('feedback', feedback))
    app.add_handler(CommandHandler('support', support))
    app.add_handler(CommandHandler('commands', commands_list))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("🤖 Bot is running...")
    app.run_polling()

if __name__ == '__main__':
    main()
