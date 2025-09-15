// chat.js
export function initializeChat() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const log = document.getElementById('chat-log');
  const button = form.querySelector('button');

  if (!form || !input || !log || !button) {
    console.error('Chat elements not found');
    return;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[m]));
  }

  function addMessage(sender, message, isError = false) {
    const messageClass = isError ? 'error-message' : '';
    log.innerHTML += `<div class="${messageClass}"><b>${sender}:</b> ${escapeHTML(message)}</div>`;
    log.scrollTop = log.scrollHeight;
  }

  function setLoading(isLoading) {
    button.disabled = isLoading;
    button.textContent = isLoading ? '...' : 'Send';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    // Agregar mensaje del usuario
    addMessage('You', q);
    input.value = '';
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: q })
      });
      
      if (!response.ok) throw new Error('Error de conexión');
      
      const data = await response.json();
      
      // Agregar respuesta del bot
      addMessage('Bot', data.answer);
      
      // Agregar fuentes si existen
      if (data.sources && data.sources.length > 0) {
        const srcs = data.sources
          .map(s => s.url ? 
            `<a href="${s.url}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${escapeHTML(s.title || 'Source')}</a>` : 
            escapeHTML(s.title || 'Source')
          )
          .join(' · ');
        log.innerHTML += `<div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">Sources: ${srcs}</div>`;
      }
      
    } catch (err) {
      console.error('Chat error:', err);
      addMessage('System', 'There was an error. Please try again.', true);
    } finally {
      setLoading(false);
    }
  });

  // Auto-focus en el input
  input.focus();
}