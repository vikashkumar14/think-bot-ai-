import logging
import requests
import time
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters, CallbackQueryHandler
import google.generativeai as genai
import traceback
from telegram.request import HTTPXRequest
import asyncio

# --- YOUR KEYS ---
TELEGRAM_BOT_TOKEN = '8090423368:AAH-F-uElvnwB0W--gWCVpcCGD_k7CgZs4Q'
GEMINI_API_KEY = 'AIzaSyAueF0PcUH21_xzz9aKU048vAd_9PQ9uGk'

# --- SETUP LOGGING ---
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO  # Changed to INFO for less verbose logging
)
logger = logging.getLogger(__name__)

# Configure request settings
request_kwargs = {
    'connection_pool_size': 8,
    'connect_timeout': 30.0,
    'read_timeout': 30.0,
    'write_timeout': 30.0,
    'pool_timeout': 30.0
}

# Configure Gemini API
genai.configure(api_key=GEMINI_API_KEY)

def detect_code_request(text):
    code_keywords = [
        "code", "program", "script", "write a", "create a", 
        "implement", "function", "class", "syntax",
        "programming", "example", "source code",
        "generate code", "code snippet"
    ]
    return any(keyword.lower() in text.lower() for keyword in code_keywords)

def format_code_response(code_text):
    formatted_text = f"""<b>📝 Generated Code:</b>

<code>{code_text}</code>

<i>Powered by Google Gemini AI (vikash)</i>"""
    return formatted_text

def format_regular_response(text):
    return f"""<b>🤖 AI Response:</b>

{text}

<i>Powered by Google Gemini AI </i>"""

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    try:
        if query.data == "copy_code":
            message_text = query.message.text
            code_start = message_text.find("<code>") + 6
            code_end = message_text.find("</code>")
            if code_start > 5 and code_end > code_start:
                code = message_text[code_start:code_end].strip()
                await query.answer("Code copied to clipboard! 📋")
        elif query.data == "view_raw":
            message_text = query.message.text
            code_start = message_text.find("<code>") + 6
            code_end = message_text.find("</code>")
            if code_start > 5 and code_end > code_start:
                code = message_text[code_start:code_end].strip()
                await query.message.reply_text(f"```\n{code}\n```", parse_mode='MarkdownV2')
        await query.answer()
    except Exception as e:
        logger.error(f"Error in button_callback: {str(e)}")
        logger.error(traceback.format_exc())
        await query.answer("❌ Error processing button click")

def ask_gemini(message_text):
    try:
        logger.info(f"Generating response for: {message_text}")
        model = genai.GenerativeModel("gemini-pro")
        response = model.generate_content(message_text)
        
        if response and response.text:
            logger.info("Successfully generated response")
            if detect_code_request(message_text):
                return format_code_response(response.text)
            else:
                return format_regular_response(response.text)
        else:
            logger.error("No response generated from Gemini AI")
            return "⚠️ No response from Gemini AI."
    except Exception as e:
        logger.error(f"Error in ask_gemini: {str(e)}")
        logger.error(traceback.format_exc())  # Log the full error traceback
        return f"⚠️ Error: {str(e)}"

# --- HANDLE TEXT MESSAGES ---
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        user_message = update.message.text
        user_id = update.message.from_user.id
        chat_id = update.message.chat_id
        
        logger.info(f"Received message from user {user_id} in chat {chat_id}: {user_message}")
        
        await update.message.chat.send_action(action="typing")
        
        ai_reply = ask_gemini(user_message)
        logger.info(f"Generated reply: {ai_reply[:100]}...")  # Log first 100 chars of reply
        
        if "<code>" in ai_reply:
            await update.message.reply_text(
                ai_reply, 
                parse_mode='HTML',
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("📋 Copy Code", callback_data="copy_code")],
                    [InlineKeyboardButton("🔍 View Raw", callback_data="view_raw")]
                ])
            )
        else:
            await update.message.reply_text(ai_reply, parse_mode='HTML')
            
        logger.info("Reply sent successfully")
        
    except Exception as e:
        logger.error(f"Error in handle_message: {str(e)}")
        logger.error(traceback.format_exc())
        try:
            await update.message.reply_text("⚠️ Sorry, there was an error processing your message. Please try again.")
        except:
            logger.error("Could not send error message to user")

# --- START COMMAND ---
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    welcome_message = """👋 Welcome to the Paro_Arti_ViralBot!
I can help you auto-reply in your Telegram group using keywords.

➤ paro video viral : <a href='https://t.me/+p2UxjyQgIHFhMTZl'>https://t.me/+p2UxjyQgIHFhMTZl</a>


Tap \"Start\" below to add a keyword + link.

✨ Features:
- Auto-reply to messages using keywords
- Easy setup and management
- Powered by Google Gemini AI

💡 Pro Tip: Use descriptive keywords for better responses."""
    await update.message.reply_text(welcome_message, parse_mode='HTML')

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
    about_text = """🤖 GeminiX Bot v1.0
Powered by Google Gemini AI

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
    # Create custom request object
    request = HTTPXRequest(**request_kwargs)
    
    # Initialize bot with custom request object and connection pool
    app = (
        ApplicationBuilder()
        .token(TELEGRAM_BOT_TOKEN)
        .request(request)
        .get_updates_request(request)
        .concurrent_updates(True)
        .build()
    )
    
    # Register handlers
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
    app.add_handler(CallbackQueryHandler(button_callback))

    print("🤖 Bot is starting...")
    
    # Run with enhanced error handling
    while True:
        try:
            print("Connecting to Telegram servers...")
            app.run_polling(
                poll_interval=2.0,
                timeout=30,
                bootstrap_retries=-1,  # Infinite retries
                read_timeout=30,
                write_timeout=30,
                connect_timeout=30,
                pool_timeout=30,
                drop_pending_updates=True  # Ignore updates from when bot was offline
            )
        except Exception as e:
            logger.error(f"Bot encountered an error: {str(e)}")
            logger.error(traceback.format_exc())
            print("Connection failed. Retrying in 10 seconds...")
            time.sleep(10)  # Wait before retrying
            continue

if __name__ == '__main__':
    main()
