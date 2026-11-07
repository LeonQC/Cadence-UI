/* Interaction for the app shell: menus, keyboard shortcuts, collapsible
 * groups. Replaces jQuery, Popper and Bootstrap's JS, which between them were
 * ~90KB to do rather less than this.
 *
 * URLs are read from data attributes on <body> rather than written here, so
 * the templates stay the single place routes are spelled out.
 */
(function () {
  "use strict";

  /* Menus ----------------------------------------------------------------
   *
   * A panel carries [data-menu] and an id; a trigger carries
   * [data-menu-open="thatId"]. A submenu adds [data-menu-parent="parentId"]
   * so that opening it leaves its parent up, while opening anything else
   * closes the chain back down.
   */

  var panels = new Map();
  var stack = [];  // ids currently open, outermost first

  function trigger(id) {
    return document.querySelector('[data-menu-open="' + id + '"]');
  }

  function hide(id) {
    var panel = panels.get(id);
    if (!panel) return;
    panel.hidden = true;
    var t = trigger(id);
    if (t) t.setAttribute("aria-expanded", "false");
  }

  function closeAll() {
    while (stack.length) hide(stack.pop());
  }

  /* Position a panel against its trigger.
   *
   * Every menu is fixed rather than absolute -- see the note in linear.css --
   * so every menu needs placing, and this runs for all of them rather than
   * for the ones someone remembered to mark.
   *
   * [data-menu-side="right"] opens beside the anchor rather than below it,
   * which is what a submenu wants: below would land on top of its parent.
   */
  var GAP = 4;
  var EDGE = 8;

  function place(panel, anchor) {
    var box = anchor.getBoundingClientRect();
    var height = panel.offsetHeight;
    var width = panel.offsetWidth;
    var top, left;

    if (panel.dataset.menuSide === "right") {
      top = box.top;
      left = box.right + GAP;
      if (left + width > window.innerWidth - EDGE) left = box.left - width - GAP;
      if (top + height > window.innerHeight - EDGE) {
        top = window.innerHeight - height - EDGE;
      }
    } else {
      top = box.bottom + GAP;
      left = box.left;
      // Flip above the trigger rather than run off the bottom.
      if (top + height > window.innerHeight - EDGE) top = box.top - height - GAP;
      if (left + width > window.innerWidth - EDGE) {
        left = window.innerWidth - width - EDGE;
      }
    }

    panel.style.top = Math.round(Math.max(EDGE, top)) + "px";
    panel.style.left = Math.round(Math.max(EDGE, left)) + "px";
  }

  function open(id) {
    var panel = panels.get(id);
    if (!panel) return;
    var parent = panel.dataset.menuParent || null;

    // Unwind to this panel's parent, so sibling menus never stack up.
    while (stack.length && stack[stack.length - 1] !== parent) {
      hide(stack.pop());
    }
    if (stack.indexOf(id) !== -1) return;

    panel.hidden = false;
    var t = trigger(id);
    if (t) {
      t.setAttribute("aria-expanded", "true");
      place(panel, t);
    }
    stack.push(id);

    var first = panel.querySelector("a, button, input");
    if (first) first.focus();
  }

  function toggle(id) {
    if (stack.indexOf(id) !== -1) {
      // Close this one and anything it opened, but leave its parent up.
      while (stack.length && stack.indexOf(id) !== -1) hide(stack.pop());
    } else {
      open(id);
    }
  }

  document.addEventListener("click", function (event) {
    var opener = event.target.closest("[data-menu-open]");
    if (opener) {
      event.preventDefault();
      event.stopPropagation();
      toggle(opener.dataset.menuOpen);
      return;
    }
    // A click inside an open menu is for the menu; anything else dismisses.
    if (!event.target.closest("[data-menu]")) closeAll();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && stack.length) {
      event.preventDefault();
      hide(stack.pop());  // one level at a time, like a real menu
    }
  });

  /* Destructive forms ----------------------------------------------------- */

  // [data-confirm] rather than an inline onsubmit, so the markup stays free of
  // JavaScript and one handler covers every such form.
  document.addEventListener("submit", function (event) {
    var message = event.target.dataset.confirm;
    if (message && !window.confirm(message)) event.preventDefault();
  });

  /* Collapsible groups ---------------------------------------------------- */

  document.addEventListener("click", function (event) {
    var toggler = event.target.closest("[data-collapse]");
    if (!toggler) return;
    var target = document.getElementById(toggler.dataset.collapse);
    if (!target) return;
    var collapsed = target.hidden;
    target.hidden = !collapsed;
    toggler.setAttribute("aria-expanded", String(collapsed));
    toggler.classList.toggle("is-collapsed", !collapsed);
  });

  /* Keyboard shortcuts ---------------------------------------------------- */

  // Linear's chords are two taps, not a held modifier: G then S. The leader
  // expires so a stray G does not hijack the next keystroke a minute later.
  var leader = null;
  var leaderTimer = null;

  function setLeader(key) {
    leader = key;
    window.clearTimeout(leaderTimer);
    leaderTimer = window.setTimeout(function () { leader = null; }, 1200);
  }

  function isTyping(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  }

  function go(url) {
    if (url) window.location.href = url;
  }

  document.addEventListener("keydown", function (event) {
    if (isTyping(event.target)) return;

    var data = document.body.dataset;
    var key = event.key.toLowerCase();

    // Alt+Shift+Q, the one shortcut Linear gives a modifier to, presumably
    // because logging out by accident is expensive.
    if (event.altKey && event.shiftKey && key === "q") {
      event.preventDefault();
      go(data.logoutUrl);
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (leader === "g" && key === "s") {
      event.preventDefault();
      setLeader(null);
      go(data.settingsUrl);
      return;
    }

    if (leader === "o" && key === "w") {
      event.preventDefault();
      setLeader(null);
      open("workspace-menu");
      open("workspace-switcher");
      return;
    }

    if (key === "g" || key === "o") {
      setLeader(key);
      return;
    }

    setLeader(null);
  });

  /* Boot ------------------------------------------------------------------ */

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-menu]").forEach(function (panel) {
      panel.hidden = true;
      panels.set(panel.id, panel);
      var t = trigger(panel.id);
      if (t) {
        t.setAttribute("aria-haspopup", "menu");
        t.setAttribute("aria-expanded", "false");
      }
    });
  });
})();
