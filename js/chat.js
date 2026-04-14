const CHAT_API = 'https://chat.prigoana.com/api/messages';

function formatChatTimeAgo(timestamp) {
    if (!timestamp) return '';
    // Truncate sub-millisecond digits (API returns microseconds, e.g. .949546Z)
    const normalized = String(timestamp).replace(/(\.\d{3})\d+/, '$1');
    const sentMs = new Date(normalized).getTime();
    if (isNaN(sentMs)) return '';
    const now = Date.now();
    const diffMs = now - sentMs;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return new Date(sentMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMessage(msg) {
    const hasAvatar = msg.avatar && msg.avatar.trim() !== '';
    const avatarHtml = hasAvatar
        ? `<img src="${escapeHtml(msg.avatar)}" alt="" class="chat-avatar">`
        : '';

    const contactHtml = msg.contact && msg.contact.trim() !== ''
        ? `<div class="chat-contact">→ <a href="${/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(msg.contact) ? 'mailto:' + msg.contact : msg.contact}" target="_blank" rel="noopener">${escapeHtml(msg.contact)}</a></div>`
        : '';

    return `
        <div class="chat-message">
            <div class="chat-header">
                ${avatarHtml}
                <span class="chat-name">${escapeHtml(msg.name)}</span>
                <span class="chat-time">${formatChatTimeAgo(msg.sent_at)}</span>
            </div>
            <div class="chat-text">${escapeHtml(msg.message)}</div>
            ${contactHtml}
        </div>
    `;
}

async function fetchMessages() {
    const container = document.getElementById('chat-messages');

    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 20000);
        const response = await fetch(CHAT_API, { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to fetch messages');

        const messages = await response.json();

        if (messages.length === 0) {
            container.innerHTML = '<div class="chat-empty">No messages yet...</div>';
        } else {
            // API already returns newest first (ORDER BY sent_at DESC)
            container.innerHTML = messages.map(renderMessage).join('');
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        container.innerHTML = '<div class="chat-error">Failed to load messages</div>';
    }
}

async function postChatMessage(name, message, contact = '', avatar = '') {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000);
    const response = await fetch(`${CHAT_API}/post`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
            name: name.trim(),
            message: message.trim(),
            contact: contact.trim(),
            avatar: avatar.trim()
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to post message');
    }

    return response.json();
}

function initChatbox() {
    const form = document.getElementById('chat-form');
    const nameInput = document.getElementById('chat-name');
    const messageInput = document.getElementById('chat-message');
    const contactInput = document.getElementById('chat-contact');
    const avatarInput = document.getElementById('chat-avatar');

    const savedName = localStorage.getItem('chat-name');
    const savedContact = localStorage.getItem('chat-contact');
    const savedAvatar = localStorage.getItem('chat-avatar');

    if (savedName) nameInput.value = savedName;
    if (savedContact) contactInput.value = savedContact;
    if (savedAvatar) avatarInput.value = savedAvatar;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = nameInput.value.trim();
        const message = messageInput.value.trim();
        const contact = contactInput.value.trim();
        const avatar = avatarInput.value.trim();
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!name || !message) return;

        if (name.length < 2 || name.length > 100) {
            alert('Name must be between 2 and 100 characters');
            return;
        }

        if (message.length < 1 || message.length > 1000) {
            alert('Message must be between 1 and 1000 characters');
            return;
        }

        localStorage.setItem('chat-name', name);
        if (contact) localStorage.setItem('chat-contact', contact);
        if (avatar) localStorage.setItem('chat-avatar', avatar);

        submitBtn.disabled = true;
        submitBtn.textContent = 'SENDING...';

        try {
            await postChatMessage(name, message, contact, avatar);
            messageInput.value = '';
            await fetchMessages();

            const messagesContainer = document.getElementById('chat-messages');
            messagesContainer.scrollTop = 0;
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'SEND';
        }
    });

    fetchMessages();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbox);
} else {
    initChatbox();
}
