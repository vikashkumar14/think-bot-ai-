// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    const themeToggleButton = document.getElementById('theme-toggle');
    const clearButton = document.getElementById('clear-chat');
    const historyButton = document.getElementById('history-button');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryModalButton = document.getElementById('close-history-modal');
    const historyContent = document.getElementById('history-content');

    // --- State ---
    let lastUserPrompt = ''; // Store last user message for potential regeneration
    let currentTypingTimeout = null; // To manage typing effect timeout

    // --- API Key (Hardcoded - INSECURE FOR PRODUCTION) ---
    const GEMINI_API_KEY = "AIzaSyAueF0PcUH21_xzz9aKU048vAd_9PQ9uGk"; // <-- REPLACE WITH YOUR KEY

    // --- Constants ---
    const TYPING_SPEED_MS = 25; // Slightly adjusted typing speed
    const MAX_HISTORY_LENGTH = 50; // Max messages to save in localStorage

    // --- Check for Libraries ---
    const libsLoaded = typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined' && typeof hljs !== 'undefined';
    if (!libsLoaded) {
        console.error("CRITICAL: Required libraries (Marked, DOMPurify, Highlight.js) not loaded. Check script tags in HTML.");
        // Optionally display an error message to the user in the chat
    }

    // --- Initialization ---
    function initializeApp() {
        loadThemePreference();
        if (checkApiKey()) {
            loadChatHistory();
        }
        adjustTextareaHeight();
        setupEventListeners();
        if (userInput) {
            sendButton.disabled = userInput.value.trim() === '';
            userInput.focus();
        }
    }

    // --- API Key Check ---
    function checkApiKey() {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY_HERE" || GEMINI_API_KEY === "" || GEMINI_API_KEY.length < 30) {
             // Use a safe version of addMessageToChatInternal that doesn't rely on libs if they failed
             addInitialMessage("CRITICAL: API Key appears missing, invalid, or is just a placeholder in script.js. Bot disabled.", 'ai', true);
            if (sendButton) sendButton.disabled = true;
            if (userInput) userInput.disabled = true;
            console.error("CRITICAL: Gemini API Key is missing or invalid in script.js");
            return false;
        }
        return true;
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        if (sendButton) sendButton.addEventListener('click', handleSendMessage);
        if (userInput) {
            userInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendMessage();
                }
            });
            userInput.addEventListener('input', adjustTextareaHeight);
        }
        if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);
        if (clearButton) clearButton.addEventListener('click', handleClearChat);
        if (chatBox) chatBox.addEventListener('click', handleChatBoxClicks); // Event delegation

        // History Modal Listeners
        if (historyButton && historyModal && closeHistoryModalButton && historyContent) {
            historyButton.addEventListener('click', showHistory);
            closeHistoryModalButton.addEventListener('click', hideHistory);
            historyModal.addEventListener('click', (event) => {
                if (event.target === historyModal) hideHistory();
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && historyModal?.classList.contains('modal-visible')) {
                    hideHistory();
                }
            });
        }

        // Voice input button listener
        if (document.getElementById('mic-button')) {
            document.getElementById('mic-button').addEventListener('click', toggleSpeechRecognition);
        }
    }

    // --- Event Handlers ---
    function handleSendMessage() {
        if (!checkApiKey() || !userInput || sendButton.disabled) return; // Prevent sending if disabled
        const userText = userInput.value.trim();
        if (userText === '') return;

        lastUserPrompt = userText;
        addMessageToChat(userText, 'user'); // Add user message
        userInput.value = '';
        adjustTextareaHeight();
        if (sendButton) sendButton.disabled = true; // Disable send button
        showTypingIndicator(true);

        getGeminiResponse(userText); // Fetch AI response
    }

    function handleClearChat() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            chatBox.innerHTML = ''; // Clear visually
            addInitialMessage("Hello! I'm Think Bot.<br>How can I help you today?", 'ai'); // Add greeting back
            try {
                localStorage.removeItem('thinkBotChatHistory');
            } catch (e) { console.error("Error removing chat history from localStorage:", e); }
            lastUserPrompt = '';
            console.log("Chat history cleared.");
        }
    }

    function handleChatBoxClicks(event) {
        const copyButton = event.target.closest('.copy-code-button');
        if (copyButton && libsLoaded) { // Ensure libs are loaded for copy functionality
            const preElement = copyButton.closest('pre');
            const codeElement = preElement?.querySelector('code');
            if (codeElement) {
                copyCodeToClipboard(codeElement.innerText, copyButton);
            }
        }
    }

    // --- Core Chat Functions ---

    /**
     * Public function to add a message. Routes to internal function.
     * @param {string} rawText
     * @param {'user' | 'ai'} sender
     */
    function addMessageToChat(rawText, sender) {
        addMessageToChatInternal(rawText, sender);
    }

    /**
    * Adds the initial greeting or system messages without processing/saving.
    * @param {string} htmlContent - HTML content to display.
    * @param {'ai' | 'system'} sender
    * @param {boolean} isCritical - If true, maybe add specific styling.
    */
   function addInitialMessage(htmlContent, sender, isCritical = false) {
       if (!chatBox) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        if (isCritical) messageDiv.classList.add('critical-error'); // Add specific class for styling critical errors

        const messageContentWrapper = document.createElement('div');
        messageContentWrapper.classList.add('message-content-wrapper');

        if (sender === 'ai') {
             messageContentWrapper.innerHTML = `
             <div class="message-icon">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                   <path d="M12 2a10 10 0 0 0-9.17 13.35A8 8 0 0 1 12 4a8 8 0 0 1 9.17 11.35A10 10 0 0 0 12 2zm0 20a10 10 0 0 0 9.17-13.35A8 8 0 0 1 12 20a8 8 0 0 1-9.17-11.35A10 10 0 0 0 12 22zM12 6a6 6 0 0 0-6 6h2a4 4 0 0 1 4-4v-2zm0 12a6 6 0 0 0 6-6h-2a4 4 0 0 1-4 4v2zM7 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                 </svg>
             </div>`;
        }
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-text');
        contentDiv.innerHTML = htmlContent; // Directly use provided HTML

        messageContentWrapper.appendChild(contentDiv);
        messageDiv.appendChild(messageContentWrapper);
        chatBox.appendChild(messageDiv);
        scrollToBottom();
   }


    /**
     * Internal function to create and add message element to the DOM.
     * Handles HTML creation, decides on processing/typing based on content.
     * @param {string} rawText - The raw text content.
     * @param {'user' | 'ai'} sender - The sender.
     * @param {boolean} [isHistoryLoad=false] - Flag to indicate if loading from history.
     */
    function addMessageToChatInternal(rawText, sender, isHistoryLoad = false) {
        if (!chatBox) return;

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.dataset.rawText = rawText; // Store raw text for saving history

        // --- Create structure ---
        const messageContentWrapper = document.createElement('div');
        messageContentWrapper.classList.add('message-content-wrapper');

        if (sender === 'ai') {
            messageContentWrapper.innerHTML = `
            <div class="message-icon">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                   <path d="M12 2a10 10 0 0 0-9.17 13.35A8 8 0 0 1 12 4a8 8 0 0 1 9.17 11.35A10 10 0 0 0 12 2zm0 20a10 10 0 0 0 9.17-13.35A8 8 0 0 1 12 20a8 8 0 0 1-9.17-11.35A10 10 0 0 0 12 22zM12 6a6 6 0 0 0-6 6h2a4 4 0 0 1 4-4v-2zm0 12a6 6 0 0 0 6-6h-2a4 4 0 0 1-4 4v2zM7 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                 </svg>
             </div>`;
        }

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-text');
        messageContentWrapper.appendChild(contentDiv);
        messageDiv.appendChild(messageContentWrapper);

        // Append structure to chatBox first
        chatBox.appendChild(messageDiv);
        scrollToBottom();

        // --- Decide on Processing and Display ---
        let skipTyping = isHistoryLoad; // Always skip typing when loading history
        let processedHTML = '';
        let needsProcessing = false;

        if (sender === 'ai' && libsLoaded) { // Only process AI messages if libs are loaded
            const containsCodeBlock = /```[\s\S]*?```/.test(rawText); // Check for ``` blocks
            // Check for simple markdown (bold, italic, inline code) EXCLUDING ```
            const containsSimpleMarkdown = /(?<!`)(\*\*|__)(?!\s)(.+?)(?<!\s)\1(?<!`)|(?<!`)(\*|_)(?!\s)(.+?)(?<!\s)\3(?<!`)|(?<!`)`(?!\s)(.+?)(?<!\s)`(?!`)/.test(rawText);

            if (containsCodeBlock) {
                needsProcessing = true;
                skipTyping = true; // Don't type messages with code blocks
                console.log("Code block detected, processing and showing instantly.");
            } else if (containsSimpleMarkdown) {
                needsProcessing = true;
                skipTyping = true; // Don't type messages with simple markdown either for consistency
                console.log("Simple markdown detected, processing and showing instantly.");
            }
            // Else: Plain text AI message, needsProcessing = false, skipTyping = false (unless isHistoryLoad)
        }

        // --- Process or Prepare Plain Text ---
        if (sender === 'ai' && needsProcessing) {
            try {
                 // Use Marked for Markdown -> HTML
                const dirtyHtml = marked.parse(rawText);
                 // Sanitize HTML
                processedHTML = DOMPurify.sanitize(dirtyHtml);
            } catch (e) {
                 console.error("Error processing AI message with Markdown:", e);
                 // Fallback: Escape raw text and convert newlines
                 contentDiv.textContent = rawText;
                 processedHTML = contentDiv.innerHTML.replace(/(\r\n|\n|\r)/gm, '<br>');
            }
        } else {
             // User message or plain AI text: Escape HTML entities and convert newlines
            contentDiv.textContent = rawText; // Safely sets text content
            processedHTML = contentDiv.innerHTML.replace(/(\r\n|\n|\r)/gm, '<br>');
        }

        // --- Apply Typing Effect OR Show Instantly ---
        if (sender === 'ai' && !skipTyping) {
            // Use Typing Effect only for plain text AI messages
             console.log("Plain text AI message, using typing effect.");
            messageDiv.classList.add('typing-effect');
            typeMessage(contentDiv, processedHTML)
                .then(() => {
                    messageDiv.classList.remove('typing-effect');
                    if (!isHistoryLoad) saveChatHistory(); // Save only if it's a new message
                })
                .catch(err => {
                    console.error("Typing effect error:", err);
                    contentDiv.innerHTML = processedHTML; // Show instantly on error
                    messageDiv.classList.remove('typing-effect');
                     if (!isHistoryLoad) saveChatHistory();
                });
        } else {
            // Show instantly (User msg, AI with markdown/code, or history load)
            contentDiv.innerHTML = processedHTML;
            // If AI message was processed, highlight code blocks now
            if (sender === 'ai' && needsProcessing && libsLoaded) {
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    try {
                        hljs.highlightElement(block);
                    } catch (e) { console.error('Highlight.js error:', e); }
                });
                 // Add copy buttons after highlighting (ensure structure exists)
                 contentDiv.querySelectorAll('pre').forEach((preElement) => {
                      if (!preElement.querySelector('.copy-code-button')) { // Add only if not already present
                           addCopyButton(preElement);
                      }
                 });
            }
             scrollToBottom(); // Ensure scroll after instant display
             if (!isHistoryLoad) saveChatHistory(); // Save non-history messages
        }
    }

     /**
      * Adds a copy button to a PRE element.
      * @param {HTMLPreElement} preElement
      */
     function addCopyButton(preElement) {
         const copyButton = document.createElement('button');
         copyButton.className = 'copy-code-button';
         copyButton.title = 'Copy code';
         copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M5.75 2a.75.75 0 0 0-.75.75v9.5a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 0 .75-.75V6.634l-3.13-3.131A.75.75 0 0 0 6.634 2H5.75Zm-.74 10.49a2.25 2.25 0 0 1-2.25-2.25v-9.5A2.25 2.25 0 0 1 5.01.5h1.624a2.25 2.25 0 0 1 1.591.659l3.13 3.131a2.25 2.25 0 0 1 .659 1.591v5.87A2.25 2.25 0 0 1 9.75 15h-4.5a2.25 2.25 0 0 1-2.24-.26Z"></path></svg><span>Copy</span>`;
         preElement.appendChild(copyButton);
     }


    /**
     * Simulates typing effect for simple text (with <br> tags).
     * @param {HTMLElement} element - The element to type into (.message-text).
     * @param {string} htmlWithBreaks - The HTML string containing text and <br> tags.
     * @returns {Promise<void>}
     */
    function typeMessage(element, htmlWithBreaks) {
        return new Promise((resolve, reject) => {
            if (currentTypingTimeout) { // Clear any previous typing animation
                 clearTimeout(currentTypingTimeout);
                 currentTypingTimeout = null;
                 // If clearing an old one, ensure the target element is reset if needed
                 // This might depend on how the previous call was interrupted.
                 // For simplicity, we just start fresh.
            }
            let index = 0;
            element.innerHTML = ''; // Start empty

            function typeCharacter() {
                // Exit if typing was interrupted externally
                if (currentTypingTimeout === null && index > 0) {
                     console.log("Typing interrupted.");
                     reject(new Error("Typing interrupted"));
                     return;
                 }

                if (index < htmlWithBreaks.length) {
                    // Simple check for <br> is sufficient as complex HTML is handled separately
                    if (htmlWithBreaks.substring(index, index + 4).toLowerCase() === '<br>') {
                        element.innerHTML += '<br>';
                        index += 4;
                    } else {
                        element.innerHTML += htmlWithBreaks.charAt(index);
                        index++;
                    }
                    scrollToBottom(); // Scroll as content grows
                    currentTypingTimeout = setTimeout(typeCharacter, TYPING_SPEED_MS);
                } else {
                    currentTypingTimeout = null;
                    resolve(); // Typing complete
                }
            }

            // Start the typing process safely
            try {
                 // Assign the timeout ID immediately so it can be cleared
                 currentTypingTimeout = setTimeout(typeCharacter, TYPING_SPEED_MS);
            } catch (error) {
                 console.error("Error starting typing:", error);
                 currentTypingTimeout = null;
                 reject(error);
            }
        });
    }

    function showTypingIndicator(show) {
        if (!typingIndicator) return;
        typingIndicator.style.display = show ? 'flex' : 'none';
        if (show) {
            scrollToBottom();
        }
    }

    async function getGeminiResponse(promptText) {
        if (!checkApiKey()) {
            showTypingIndicator(false);
            return;
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const requestBody = { contents: [{ parts: [{ "text": promptText }] }] };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            showTypingIndicator(false); // Hide indicator once response starts processing

            if (!response.ok) {
                let errorData = null;
                let errorMsg = `API Error ${response.status}: ${response.statusText}`;
                try {
                    errorData = await response.json();
                    console.error("API Error Data:", errorData);
                    if (errorData?.error?.message) errorMsg += ` - ${errorData.error.message}`;
                } catch (e) { /* Ignore parse error */ }
                // Add specific error messages based on status code
                if (response.status === 400 && errorData?.error?.message?.includes('API key not valid')) errorMsg = "API Key Error: Invalid or restricted API key.";
                else if (response.status === 403) errorMsg = "API Error: Forbidden (403). Check API settings (enabled, billing, restrictions).";
                else if (response.status === 429) errorMsg = "API Error: Quota exceeded (429).";
                throw new Error(errorMsg);
            }

            const data = await response.json();

            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const aiResponse = data.candidates[0].content.parts[0].text;
                addMessageToChat(aiResponse, 'ai'); // Let the public function handle processing/typing
            } else if (data.promptFeedback?.blockReason) {
                const reason = data.promptFeedback.blockReason;
                console.warn("Prompt blocked:", reason);
                 // Add error message instantly, no processing, don't save
                addMessageToChatInternal(`Safety filters blocked the response. Reason: ${reason}`, 'ai', true, false, false);
            } else {
                console.error("API Success, but no valid content found:", data);
                let reason = "unexpected response structure";
                if (data.candidates?.[0]?.finishReason) reason = `finish reason: '${data.candidates[0].finishReason}'`;
                 // Add error message instantly, no processing, don't save
                addMessageToChatInternal(`Sorry, received an empty or unusable response (${reason}).`, 'ai', true, false, false);
            }

        } catch (error) {
            console.error("Gemini API call failed:", error);
            showTypingIndicator(false);
             // Add error message instantly, no processing, don't save
            addMessageToChatInternal(`Sorry, an error occurred: ${error.message}`, 'ai', true, false, false);
        } finally {
            // Re-enable send button regardless of success/error
            if (sendButton && userInput) sendButton.disabled = userInput.value.trim() === '';
            if (userInput) userInput.focus();
        }
    }

    // --- Utility Functions ---
    function adjustTextareaHeight() {
        if (!userInput) return;
        userInput.style.height = 'auto';
        const maxHeight = 150;
        const scrollHeight = userInput.scrollHeight;
        userInput.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        userInput.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
        if (sendButton) sendButton.disabled = userInput.value.trim() === '';
    }

    function scrollToBottom() {
        setTimeout(() => {
            const chatArea = chatBox?.parentNode;
            if (chatArea) {
                chatArea.scrollTop = chatArea.scrollHeight;
            }
        }, 55); // Slightly increased delay
    }

    function copyCodeToClipboard(codeText, buttonElement) {
        navigator.clipboard.writeText(codeText).then(() => {
            const buttonSpan = buttonElement.querySelector('span');
            if (buttonSpan) buttonSpan.textContent = 'Copied!';
            buttonElement.classList.add('copied');
            buttonElement.disabled = true;
            setTimeout(() => {
                if (buttonSpan) buttonSpan.textContent = 'Copy';
                buttonElement.classList.remove('copied');
                buttonElement.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code: ', err);
            const buttonSpan = buttonElement.querySelector('span');
            if (buttonSpan) buttonSpan.textContent = 'Error!';
             setTimeout(() => { if(buttonSpan) buttonSpan.textContent = 'Copy'; }, 1500);
        });
    }

    // --- History Management ---
    function saveChatHistory() {
        if (!chatBox) return;
        const messages = [];
        chatBox.querySelectorAll('.message:not(.initial-greeting)').forEach(msgElement => {
            const sender = msgElement.classList.contains('user-message') ? 'user' : 'ai';
            const rawText = msgElement.dataset.rawText; // Get raw text
            if (rawText !== undefined && rawText !== null) { // Ensure rawText exists
                messages.push({ sender, text: rawText.trim() });
            } else {
                // Fallback if dataset is missing (shouldn't happen often)
                const contentDiv = msgElement.querySelector('.message-text');
                if (contentDiv) messages.push({ sender, text: contentDiv.innerText.trim() });
                console.warn("Message missing rawText data attribute:", msgElement);
            }
        });

        if (messages.length > MAX_HISTORY_LENGTH) {
            messages.splice(0, messages.length - MAX_HISTORY_LENGTH);
        }

        try {
            if (messages.length > 0) {
               localStorage.setItem('thinkBotChatHistory', JSON.stringify(messages));
            } else {
               localStorage.removeItem('thinkBotChatHistory');
            }
        } catch (e) {
            console.error("Error saving chat history:", e);
        }
    }

    function loadChatHistory() {
        if (!chatBox) return;
        let historyJson = null;
        try {
            historyJson = localStorage.getItem('thinkBotChatHistory');
            if (!historyJson) return; // No history, keep initial greeting
        } catch (e) {
            console.error("Error reading chat history:", e);
            addInitialMessage("System Notice: Could not read chat history.", 'ai', true);
            return;
        }

        try {
            const messages = JSON.parse(historyJson);
            if (messages.length > 0) {
                const initialGreeting = chatBox.querySelector('.initial-greeting');
                if (initialGreeting) initialGreeting.remove(); // Remove greeting if loading history

                messages.forEach(msg => {
                    // Call internal function directly, mark as history load
                    addMessageToChatInternal(msg.text, msg.sender, true); // isHistoryLoad = true
                });
            }
            // If messages array is empty, initial greeting remains
        } catch (e) {
            console.error("Error parsing chat history:", e);
            localStorage.removeItem('thinkBotChatHistory');
            addInitialMessage("System Notice: Chat history corrupted, cleared.", 'ai', true);
        } finally {
            scrollToBottom();
        }
    }

    // --- Theme Management ---
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode', !isDarkMode);
        const currentTheme = isDarkMode ? 'dark' : 'light';
        try {
            localStorage.setItem('thinkBotTheme', currentTheme);
        } catch (e) { console.warn("Could not save theme preference"); }
        updateHighlightTheme(currentTheme);
    }

    function loadThemePreference() {
        let savedTheme = 'dark';
        try { savedTheme = localStorage.getItem('thinkBotTheme') || 'dark'; } catch (e) { /* Ignore */ }
        const isDarkMode = savedTheme === 'dark';
        document.body.classList.toggle('dark-mode', isDarkMode);
        document.body.classList.toggle('light-mode', !isDarkMode);
        updateHighlightTheme(savedTheme);
    }

    function updateHighlightTheme(theme) {
        const hljsLink = document.querySelector('link[href*="highlight.js/styles/"]');
        if (hljsLink && libsLoaded) { // Check if libs are loaded
            const themeName = theme === 'light' ? 'atom-one-light.min.css' : 'atom-one-dark.min.css';
            const currentHref = hljsLink.getAttribute('href');
            const newHref = currentHref.replace(/[^/]+$/, themeName);
            if (currentHref !== newHref) {
                hljsLink.setAttribute('href', newHref);
            }
        }
    }

    // --- History Modal Functions ---
    function showHistory() {
        if (!historyModal || !historyContent) return;
        let historyJson = null;
        try { historyJson = localStorage.getItem('thinkBotChatHistory'); } catch (e) { /* Handle error */ }

        if (historyJson) {
            try {
                const messages = JSON.parse(historyJson);
                const filteredMessages = messages.filter(msg => !(msg.sender === 'ai' && msg.text.startsWith("Hello! I'm Think Bot")));

                if (filteredMessages.length === 0) {
                    historyContent.innerHTML = '<p>Chat history is empty.</p>';
                } else {
                    historyContent.innerHTML = '';
                    filteredMessages.forEach(msg => {
                        const entryDiv = document.createElement('div');
                        entryDiv.className = 'history-entry';
                        const senderSpan = document.createElement('span');
                        senderSpan.className = msg.sender;
                        senderSpan.textContent = msg.sender === 'user' ? 'You:' : 'Bot:';
                        const messageTextDiv = document.createElement('div');
                        // Display raw text safely with line breaks for history
                        messageTextDiv.textContent = msg.text;
                        messageTextDiv.innerHTML = messageTextDiv.innerHTML.replace(/(\r\n|\n|\r)/gm, '<br>');
                        entryDiv.appendChild(senderSpan);
                        entryDiv.appendChild(messageTextDiv);
                        historyContent.appendChild(entryDiv);
                    });
                }
            } catch (e) {
                 console.error("Error parsing history for modal:", e);
                 historyContent.innerHTML = '<p style="color: var(--error-color, #dc3545);">Error: Chat history data is corrupted.</p>';
            }
        } else {
            historyContent.innerHTML = '<p>No chat history saved yet.</p>';
        }
        historyModal.classList.add('modal-visible');
        historyContent.scrollTop = 0;
    }

    function hideHistory() {
        if (historyModal) historyModal.classList.remove('modal-visible');
    }

    // --- Speech Recognition ---
    let isRecording = false;
    let recognition = null;

    function setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'hi-IN'; // Set to Hindi by default

            recognition.onstart = () => {
                isRecording = true;
                const micButton = document.getElementById('mic-button');
                if (micButton) {
                    micButton.classList.add('recording');
                    micButton.title = 'Stop recording';
                }
            };

            recognition.onend = () => {
                isRecording = false;
                const micButton = document.getElementById('mic-button');
                if (micButton) {
                    micButton.classList.remove('recording');
                    micButton.title = 'Voice Input';
                }
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const userInput = document.getElementById('user-input');
                if (userInput) {
                    userInput.value = transcript;
                    userInput.dispatchEvent(new Event('input')); // Trigger input event for textarea resize
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                isRecording = false;
                const micButton = document.getElementById('mic-button');
                if (micButton) {
                    micButton.classList.remove('recording');
                }
            };
        }
    }

    function toggleSpeechRecognition() {
        if (!recognition) {
            setupSpeechRecognition();
        }

        if (!recognition) {
            console.error('Speech recognition not supported');
            return;
        }

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    // --- Start the application ---
    initializeApp();

}); // End of DOMContentLoaded