// thinkbot-memory.js
// Think Bot ka "dimag" (memory) system
// User ke sabhi messages/conversations ko store karta hai

const ThinkBotMemory = {
    MEMORY_KEY: 'thinkbot_memory',
    MAX_MESSAGES: 100, // Maximum messages to store

    // Memory ko load karo (localStorage se)
    loadMemory: function() {
        try {
            const data = localStorage.getItem(this.MEMORY_KEY);
            if (!data) return [];
            
            const memory = JSON.parse(data);
            // Validate and fix message format if needed
            return memory.map(msg => ({
                sender: msg.sender || 'user',
                message: msg.message || msg.text || '', // Support both formats
                timestamp: msg.timestamp || new Date().toISOString()
            }));
        } catch (e) {
            console.error('Memory load error:', e);
            return [];
        }
    },

    // Memory me naya message add karo
    addMessage: function(message, sender = 'user') {
        try {
            if (!message || typeof message !== 'string') {
                console.error('Invalid message:', message);
                return;
            }
            
            let memory = this.loadMemory();
            
            // Add new message
            memory.push({
                sender,
                message: message.trim(),
                timestamp: new Date().toISOString()
            });

            // Keep only the last MAX_MESSAGES
            if (memory.length > this.MAX_MESSAGES) {
                memory = memory.slice(-this.MAX_MESSAGES);
            }

            localStorage.setItem(this.MEMORY_KEY, JSON.stringify(memory));
            return true;
        } catch (e) {
            console.error('Memory save error:', e);
            return false;
        }
    },

    // Pura memory (conversation) return karo
    getAllMessages: function() {
        return this.loadMemory();
    },

    // Last N messages return karo
    getLastMessages: function(n = 10) {
        const memory = this.loadMemory();
        return memory.slice(-n);
    },

    // Memory ko clear karo
    clearMemory: function() {
        try {
            localStorage.removeItem(this.MEMORY_KEY);
            return true;
        } catch (e) {
            console.error('Memory clear error:', e);
            return false;
        }
    }
};

// Export for global use
window.ThinkBotMemory = ThinkBotMemory;
