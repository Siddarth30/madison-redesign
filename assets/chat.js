(function () {
  'use strict';

  var ENDPOINT = '/api/chat';
  var MAX_CHARS = 1000;
  var GREETING =
    "Hi — I'm Madison's virtual assistant. I can help with payments, fees, forms, " +
    'servicing questions, or getting you to the right team. What can I help you find?';

  var history = [];
  var busy = false;
  var els = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function build() {
    var launcher = el('button', 'mchat-launcher');
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open chat assistant');
    launcher.innerHTML =
      '<span class="mchat-launcher-icon" aria-hidden="true">💬</span>' +
      '<span class="mchat-launcher-text">Ask a question</span>';

    var panel = el('div', 'mchat-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Madison Management chat assistant');
    panel.setAttribute('aria-modal', 'false');
    panel.hidden = true;

    var header = el('div', 'mchat-header');
    var heading = el('div', 'mchat-heading');
    heading.appendChild(el('strong', null, 'Madison Assistant'));
    heading.appendChild(el('span', 'mchat-sub', 'Automated — not a live agent'));
    var close = el('button', 'mchat-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close chat');
    close.textContent = '×';
    header.appendChild(heading);
    header.appendChild(close);

    var log = el('div', 'mchat-log');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-atomic', 'false');

    var form = el('form', 'mchat-form');
    var input = el('textarea', 'mchat-input');
    input.rows = 1;
    input.placeholder = 'Ask about payments, fees, forms…';
    input.maxLength = MAX_CHARS;
    input.setAttribute('aria-label', 'Your question');
    var send = el('button', 'mchat-send');
    send.type = 'submit';
    send.setAttribute('aria-label', 'Send question');
    send.innerHTML = '<span aria-hidden="true">↑</span>';
    form.appendChild(input);
    form.appendChild(send);

    var note = el(
      'p',
      'mchat-note',
      'Automated assistant — general information only. It cannot access your account. ' +
        'Do not share account numbers, Social Security numbers, or passwords. ' +
        'For account-specific help call (877) 563-4164.'
    );

    panel.appendChild(header);
    panel.appendChild(log);
    panel.appendChild(form);
    panel.appendChild(note);

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    els = {
      launcher: launcher,
      panel: panel,
      close: close,
      log: log,
      form: form,
      input: input,
      send: send,
    };
  }

  // Appends text as DOM nodes, rendering **bold** spans as <strong>.
  // Builds nodes directly from the string — never parses it as HTML —
  // so model output still can't inject markup.
  function appendInlineText(parent, text) {
    var parts = text.split(/\*\*(.+?)\*\*/);
    parts.forEach(function (part, i) {
      if (!part) return;
      if (i % 2 === 1) {
        parent.appendChild(el('strong', null, part));
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  }

  function addMessage(role, text) {
    var row = el('div', 'mchat-msg mchat-msg-' + role);
    var bubble = el('div', 'mchat-bubble');
    // textContent, never innerHTML — model output is untrusted.
    text.split(/\n{2,}/).forEach(function (para) {
      var p = el('p');
      appendInlineText(p, para.trim());
      bubble.appendChild(p);
    });
    row.appendChild(bubble);
    els.log.appendChild(row);
    els.log.scrollTop = els.log.scrollHeight;
    return row;
  }

  function addError(text) {
    var row = el('div', 'mchat-msg mchat-msg-error');
    row.appendChild(el('div', 'mchat-bubble', text));
    els.log.appendChild(row);
    els.log.scrollTop = els.log.scrollHeight;
  }

  function showTyping() {
    var row = el('div', 'mchat-msg mchat-msg-assistant mchat-typing');
    var bubble = el('div', 'mchat-bubble');
    bubble.innerHTML = '<span></span><span></span><span></span>';
    bubble.setAttribute('aria-label', 'Assistant is typing');
    row.appendChild(bubble);
    els.log.appendChild(row);
    els.log.scrollTop = els.log.scrollHeight;
    return row;
  }

  function setBusy(state) {
    busy = state;
    els.send.disabled = state;
    els.input.disabled = state;
  }

  function autosize() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 120) + 'px';
  }

  async function send(text) {
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    setBusy(true);
    var typing = showTyping();

    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });

      var data = await res.json().catch(function () {
        return {};
      });
      typing.remove();

      if (!res.ok || data.error) {
        addError(
          data.error ||
            "Sorry — I couldn't reach the assistant. Please call (877) 563-4164 for help."
        );
        history.pop();
        return;
      }

      addMessage('assistant', data.reply);
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      typing.remove();
      addError(
        'Connection problem — please check your internet, or call (877) 563-4164 ' +
          'to speak with someone directly.'
      );
      history.pop();
    } finally {
      setBusy(false);
      els.input.focus();
    }
  }

  function open() {
    els.panel.hidden = false;
    els.launcher.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mchat-open');
    if (!els.log.childElementCount) addMessage('assistant', GREETING);
    els.input.focus();
  }

  function close() {
    els.panel.hidden = true;
    els.launcher.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mchat-open');
    els.launcher.focus();
  }

  function init() {
    build();

    els.launcher.setAttribute('aria-expanded', 'false');
    els.launcher.addEventListener('click', function () {
      els.panel.hidden ? open() : close();
    });
    els.close.addEventListener('click', close);

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = els.input.value.trim();
      if (!text || busy) return;
      els.input.value = '';
      autosize();
      send(text);
    });

    els.input.addEventListener('input', autosize);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        els.form.requestSubmit();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.panel.hidden) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
