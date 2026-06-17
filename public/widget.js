/* Missed No More Pro — embeddable website chat widget (Phase 10).
 * Drop-in: <script src="https://app.example.com/widget.js" data-key="WIDGET_KEY" async></script>
 * Talks only to /api/chat/web on the origin it was served from, authenticated
 * by the per-business widget key. No dependencies. */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var KEY = script.getAttribute("data-key");
  if (!KEY) return;
  var API = new URL(script.src).origin + "/api/chat/web";

  // Stable anonymous visitor id.
  var VISITOR;
  try {
    VISITOR = localStorage.getItem("mnmp_chat_visitor");
    if (!VISITOR) {
      VISITOR = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("mnmp_chat_visitor", VISITOR);
    }
  } catch (e) {
    VISITOR = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  var accent = "#00E5FF";
  var conversationId = null;
  var lastAt = null;
  var pollTimer = null;
  var sending = false;

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function style(css) {
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function init(cfg) {
    accent = cfg.accent || accent;
    style(
      ".mnmp-fab{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:" +
        accent +
        ";color:#021320;box-shadow:0 10px 30px -8px rgba(0,0,0,.5);z-index:2147483000;display:flex;align-items:center;justify-content:center;font-size:26px}" +
        ".mnmp-panel{position:fixed;bottom:90px;right:20px;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#0a1b3d;color:#f8f8f8;border:1px solid #1b2f55;border-radius:16px;box-shadow:0 24px 70px -20px rgba(0,0,0,.6);z-index:2147483000;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
        ".mnmp-panel.open{display:flex}" +
        ".mnmp-head{padding:14px 16px;background:#020817;border-bottom:1px solid #1b2f55;font-weight:600;font-size:15px}" +
        ".mnmp-head small{display:block;font-weight:400;color:#a7b0c0;font-size:12px;margin-top:2px}" +
        ".mnmp-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}" +
        ".mnmp-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
        ".mnmp-msg.you{align-self:flex-end;background:#11305e;border-bottom-right-radius:4px}" +
        ".mnmp-msg.them{align-self:flex-start;background:rgba(0,229,255,.10);border:1px solid rgba(0,229,255,.25);border-bottom-left-radius:4px}" +
        ".mnmp-foot{display:flex;gap:8px;padding:12px;border-top:1px solid #1b2f55}" +
        ".mnmp-foot input{flex:1;background:#020817;border:1px solid #1b2f55;color:#f8f8f8;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}" +
        ".mnmp-foot button{background:" +
        accent +
        ";color:#021320;border:none;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer}" +
        ".mnmp-foot button:disabled{opacity:.5;cursor:default}" +
        ".mnmp-note{font-size:11px;color:#a7b0c0;text-align:center;padding:0 12px 10px}"
    );

    var fab = el("button", { class: "mnmp-fab", "aria-label": "Open chat" }, "💬");
    var panel = el("div", { class: "mnmp-panel", role: "dialog", "aria-label": "Chat" });
    var head = el("div", { class: "mnmp-head" });
    head.appendChild(document.createTextNode("Chat with us"));
    head.appendChild(el("small", null, "AI assistant · replies in seconds"));
    var bodyEl = el("div", { class: "mnmp-body" });
    var foot = el("form", { class: "mnmp-foot" });
    var input = el("input", {
      type: "text",
      placeholder: "Type your message…",
      "aria-label": "Your message",
      maxlength: "1000",
    });
    var sendBtn = el("button", { type: "submit" }, "Send");
    foot.appendChild(input);
    foot.appendChild(sendBtn);
    var note = el("div", { class: "mnmp-note" }, "Powered by Missed No More Pro");

    panel.appendChild(head);
    panel.appendChild(bodyEl);
    panel.appendChild(foot);
    panel.appendChild(note);
    document.body.appendChild(fab);
    document.body.appendChild(panel);

    if (cfg.greeting) addMsg("them", cfg.greeting);

    function addMsg(side, text) {
      var m = el("div", { class: "mnmp-msg " + side }, text);
      bodyEl.appendChild(m);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }

    var opened = false;
    fab.addEventListener("click", function () {
      opened = !opened;
      panel.classList.toggle("open", opened);
      fab.textContent = opened ? "✕" : "💬";
      if (opened) {
        input.focus();
        startPolling();
      } else {
        stopPolling();
      }
    });

    foot.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || sending) return;
      input.value = "";
      addMsg("you", text);
      sending = true;
      sendBtn.disabled = true;
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: KEY, visitorId: VISITOR, message: text }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.conversationId) conversationId = data.conversationId;
          if (data && data.reply) {
            addMsg("them", data.reply);
            lastAt = new Date().toISOString();
          }
        })
        .catch(function () {
          addMsg("them", "Sorry — something went wrong. Please try again.");
        })
        .finally(function () {
          sending = false;
          sendBtn.disabled = false;
          input.focus();
        });
    });

    function poll() {
      if (!conversationId) return;
      var u =
        API +
        "?key=" +
        encodeURIComponent(KEY) +
        "&visitorId=" +
        encodeURIComponent(VISITOR) +
        "&conversationId=" +
        encodeURIComponent(conversationId) +
        (lastAt ? "&after=" + encodeURIComponent(lastAt) : "");
      fetch(u)
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.messages) {
            data.messages.forEach(function (m) {
              // Skip echoing the AI reply we already showed inline.
              if (m.role === "staff") addMsg("them", m.body);
              lastAt = m.at;
            });
          }
        })
        .catch(function () {});
    }

    function startPolling() {
      stopPolling();
      pollTimer = setInterval(poll, 4000);
    }
    function stopPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // Bootstrap: fetch config; only render if web chat is enabled.
  fetch(API + "?key=" + encodeURIComponent(KEY))
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      if (cfg && cfg.ok && cfg.enabled) init(cfg);
    })
    .catch(function () {});
})();
