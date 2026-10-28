"use strict";

(() => {
  const dialog = document.querySelector("#portfolio-terminal");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const output = dialog.querySelector("#terminal-output");
  const input = dialog.querySelector("#terminal-input");
  const form = dialog.querySelector("#terminal-form");
  const prompt = dialog.querySelector("#terminal-prompt");
  const status = dialog.querySelector("#terminal-status");
  const cursor = dialog.querySelector("#terminal-cursor");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const triggers = [...document.querySelectorAll("[data-open-terminal]")];

  // O HTML é a fonte dos dados; só os nomes dos arquivos virtuais são definidos aqui.
  function text(element) {
    const copy = element.cloneNode(true);
    copy.querySelectorAll("br").forEach((br) => br.replaceWith(document.createTextNode(" ")));
    copy.querySelectorAll(".sr-only, [aria-hidden], small").forEach((node) => node.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  }

  const alias = text(document.querySelector(".hero-handle")).replace(/^@/, "");
  const home = `/home/${alias}`;
  const introduction = `${text(document.querySelector("#hero-title")).replace(/\.$/, "")} (${alias})\n${text(document.querySelector(".hero-detail"))}`;
  const about = [...document.querySelectorAll("#sobre .about-content p")].map((p) => ({ text: text(p) }));
  const skills = [...document.querySelectorAll("#skills .skill-card")].map((card) => ({
    text: `${text(card.querySelector("h3"))}: ${[...card.querySelectorAll(".tags li")].map(text).join(" · ")}`,
  }));

  function readCards(selector, categorySelector) {
    return [...document.querySelectorAll(selector)].map((card) => ({
      title: text(card.querySelector("h3")),
      description: text(card.querySelector("p")),
      category: text(card.querySelector(categorySelector)),
      href: card.querySelector("a[href]").href,
    }));
  }

  const projects = readCards("#projetos .project-card", ".project-category");
  const writeups = readCards("#writeups .writeup-item", ".writeup-meta > span");
  const contacts = [...document.querySelectorAll("#contato .contact-links a")].map((a) => ({
    text: text(a), href: a.href,
  }));
  const cardContent = (card) => [
    { text: `${card.title} [${card.category}]`, href: card.href },
    { text: card.description },
  ];

  const directories = new Set(["/", "/home", home]);
  const files = new Map([[`${home}/perfil.txt`, [{ text: introduction }]]]);
  function addDirectory(name, filename, contents) {
    directories.add(`${home}/${name}`);
    files.set(`${home}/${name}/${filename}`, contents);
  }
  addDirectory("about", "sobre.txt", about);
  addDirectory("skills", "skills.txt", skills);
  addDirectory("projects", "projetos.txt", projects.flatMap(cardContent));
  addDirectory("writeups", "artigos.txt", writeups.flatMap(cardContent));
  addDirectory("contact", "links.txt", contacts);
  const challengeDigest = "8621ffdbc5698829397d97767ac13db3";
  addDirectory("archive", "secret.txt", [{
    text: "TUQ1OiA4NjIxZmZkYmM1Njk4ODI5Mzk3ZDk3NzY3YWMxM2RiMwpVc2FnZTogdW5sb2NrIDxwYXNzd29yZD4=",
  }]);
  function addCardFiles(directory, cards) {
    cards.forEach((card) => {
      const slug = card.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      files.set(`${home}/${directory}/${slug}.txt`, cardContent(card));
    });
  }
  addCardFiles("projects", projects);
  addCardFiles("writeups", writeups);

  let currentDirectory = home;
  let opener = null;
  let closeTimer = null;
  let closing = false;
  const history = [];
  let historyPosition = 0;
  let draft = "";
  const commands = new Map([
    ["help", "Mostrar comandos e exemplos de uso."],
    ["whoami", "Apresentação de Felipe Santos."],
    ["about", "Informações da seção Sobre."],
    ["skills", "Habilidades organizadas por categoria."],
    ["projects", "Projetos e links dos repositórios."],
    ["writeups", "Artigos e links do Medium."],
    ["contact", "Perfis e links profissionais."],
    ["ls", "Listar um diretório virtual. Uso: ls [caminho]"],
    ["pwd", "Mostrar o diretório virtual atual."],
    ["cd", "Mudar de diretório. Uso: cd [caminho], cd .. ou cd ~"],
    ["cat", "Ler um arquivo virtual. Uso: cat caminho/arquivo.txt"],
    ["clear", "Limpar os resultados visuais, mantendo os comandos nas setas."],
    ["date", "Data e hora local do visitante."],
    ["exit", "Fechar o terminal."],
  ]);

  // MD5 local apenas para o easter egg; não representa autenticação real.
  function md5(value) {
    const bytes = new TextEncoder().encode(value);
    const size = Math.ceil((bytes.length + 9) / 64) * 64;
    const buffer = new Uint8Array(size);
    buffer.set(bytes);
    buffer[bytes.length] = 0x80;
    const view = new DataView(buffer.buffer);
    view.setUint32(size - 8, (bytes.length * 8) >>> 0, true);
    view.setUint32(size - 4, Math.floor(bytes.length / 0x20000000), true);
    const shifts = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const state = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];

    for (let offset = 0; offset < size; offset += 64) {
      let [a, b, c, d] = state;
      for (let step = 0; step < 64; step++) {
        const round = Math.floor(step / 16);
        let mix;
        let index;
        if (round === 0) { mix = (b & c) | (~b & d); index = step; }
        else if (round === 1) { mix = (d & b) | (~d & c); index = (5 * step + 1) % 16; }
        else if (round === 2) { mix = b ^ c ^ d; index = (3 * step + 5) % 16; }
        else { mix = c ^ (b | ~d); index = (7 * step) % 16; }
        const constant = Math.floor(Math.abs(Math.sin(step + 1)) * 0x100000000);
        const sum = (a + mix + constant + view.getUint32(offset + index * 4, true)) >>> 0;
        const shift = shifts[round * 4 + step % 4];
        const next = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
        a = d;
        d = c;
        c = b;
        b = next;
      }
      [a, b, c, d].forEach((word, index) => { state[index] = (state[index] + word) >>> 0; });
    }
    return state.map((word) => [0, 8, 16, 24]
      .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
  }

  function shortPath() {
    return currentDirectory === home || currentDirectory.startsWith(`${home}/`)
      ? `~${currentDirectory.slice(home.length)}` : currentDirectory;
  }
  function updatePrompt() {
    const user = document.createElement("span");
    user.className = "terminal-prompt-user";
    user.textContent = alias;
    const host = document.createElement("span");
    host.className = "terminal-prompt-host";
    host.textContent = "@portfolio:";
    const path = document.createElement("span");
    path.className = "terminal-prompt-path";
    path.textContent = shortPath();
    const symbol = document.createElement("span");
    symbol.className = "terminal-prompt-symbol";
    symbol.textContent = " ❯";
    prompt.replaceChildren(user, host, path, symbol);
  }

  function updateCursor() {
    const position = input.selectionStart ?? input.value.length;
    cursor.style.setProperty("--cursor-column", Array.from(input.value.slice(0, position)).length);
    cursor.style.setProperty("--cursor-scroll", `${input.scrollLeft}px`);
    cursor.hidden = input.selectionStart !== input.selectionEnd;
  }

  function showWelcome() {
    const welcome = document.createElement("div");
    welcome.className = "terminal-welcome";
    const label = document.createElement("p");
    label.className = "terminal-fetch-label";
    label.textContent = "fastfetch · simulação visual";
    const fetch = document.createElement("div");
    fetch.className = "terminal-fetch";
    const logo = document.createElement("pre");
    logo.className = "terminal-arch-logo";
    logo.setAttribute("aria-hidden", "true");
    logo.textContent = String.raw`         /\
        /  \
       /\   \
      /      \
     /   ,,   \
    /   |  |   \
   /    |  |    \
  /   ,,,  ,,,   \
 /  ,'        ',  \
/_-'            '-_\
`.trimEnd();
    const info = document.createElement("div");
    info.className = "terminal-fetch-info";
    const heading = document.createElement("p");
    heading.className = "terminal-fetch-user";
    heading.textContent = `${alias}@portfolio`;
    info.append(heading);
    const fields = [
      ["Perfil", text(document.querySelector("#hero-title")).replace(/\.$/, "")],
      ["Foco", text(document.querySelector(".hero-detail"))],
      ["Projetos", `${projects.length} repositórios`],
      ["Write-ups", `${writeups.length} artigos`],
      ["Visual", "Arch Linux / Hyprland"],
      ["Terminal", "Kitty / Zsh / Starship"],
      ["Sessão", "Portfólio virtual · somente leitura"],
    ];
    fields.forEach(([name, value]) => {
      const row = document.createElement("p");
      const key = document.createElement("span");
      key.className = "terminal-fetch-key";
      key.textContent = `${name}  `;
      row.append(key, document.createTextNode(value));
      info.append(row);
    });
    fetch.append(logo, info);
    const hint = document.createElement("p");
    hint.className = "terminal-welcome-hint";
    hint.textContent = "Digite help para explorar os comandos.";
    welcome.append(label, fetch, hint);
    output.append(welcome);
    while (output.children.length > 100) output.firstElementChild.remove();
  }

  // Caminhos são resolvidos apenas nas coleções em memória, sem acesso a arquivos reais.
  function resolvePath(value = "~") {
    if (value.startsWith("~") && value !== "~" && !value.startsWith("~/")) return null;
    const expanded = value === "~" || value.startsWith("~/") ? home + value.slice(1) : value;
    const parts = (expanded.startsWith("/") ? expanded : `${currentDirectory}/${expanded}`).split("/");
    const normalized = [];
    parts.forEach((part) => {
      if (part === "..") normalized.pop();
      else if (part && part !== ".") normalized.push(part);
    });
    return `/${normalized.join("/")}`;
  }

  function line(content, parent) {
    const p = document.createElement("p");
    if (content.href) {
      const url = new URL(content.href);
      if (url.protocol === "https:") {
        const a = document.createElement("a");
        a.href = url.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = content.text;
        a.setAttribute("aria-label", `${content.text} (abre em nova aba)`);
        p.append(a);
      } else p.textContent = content.text;
    } else p.textContent = content.text;
    parent.append(p);
  }

  function print(contents, className = "terminal-result") {
    const block = document.createElement("div");
    block.className = className;
    contents.forEach((content) => line(typeof content === "string" ? { text: content } : content, block));
    output.append(block);
    // Limita o DOM em sessões longas sem gravar histórico no navegador.
    while (output.children.length > 100) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }

  function fail(message) {
    print([message], "terminal-result terminal-error");
  }

  function listDirectory(path) {
    if (!directories.has(path)) {
      fail(files.has(path) ? "Esse caminho é um arquivo. Use cat para lê-lo." : "Diretório não encontrado. Use ls para explorar.");
      return;
    }
    const prefix = path === "/" ? "/" : `${path}/`;
    const entries = [];
    directories.forEach((directory) => {
      if (directory.startsWith(prefix)) {
        const name = directory.slice(prefix.length);
        if (name && !name.includes("/")) entries.push(`${name}/`);
      }
    });
    files.forEach((_, filename) => {
      if (filename.startsWith(prefix)) {
        const name = filename.slice(prefix.length);
        if (name && !name.includes("/")) entries.push(name);
      }
    });
    print([entries.sort().join("\n") || "Diretório vazio."]);
  }

  function finishClose() {
    if (!closing) return;
    closing = false;
    window.clearTimeout(closeTimer);
    dialog.close();
  }

  function closeTerminal() {
    if (!dialog.open || closing) return;
    closing = true;
    if (motionPreference.matches) finishClose();
    else {
      dialog.classList.add("is-closing");
      closeTimer = window.setTimeout(finishClose, 200);
    }
  }

  function execute(raw) {
    const commandLine = raw.trim();
    if (!commandLine) return;
    print([`${prompt.textContent} ${commandLine}`], "terminal-command");
    history.push(commandLine);
    if (history.length > 100) history.shift();
    historyPosition = history.length;
    draft = "";
    input.value = "";
    updateCursor();
    status.textContent = "";
    if (commandLine.length > 240 || /[;&|`<>$\\\u0000-\u001f]/u.test(commandLine)) {
      fail("Use um comando por vez, sem operadores de shell. Digite help para ver exemplos.");
      return;
    }
    const [name, ...args] = commandLine.split(/\s+/u);
    // A descoberta do arquivo revela este comando, sem anunciá-lo no help.
    if (name === "unlock") {
      if (args.length !== 1) fail("Uso: unlock <senha>");
      else if (md5(args[0]) !== challengeDigest) fail("Access denied");
      else print([
        "Access granted. Desafio concluído! Sua recompensa está pronta.",
        { text: "Abrir recompensa surpresa", href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      ]);
      return;
    }
    if (!commands.has(name)) {
      fail(`Comando “${name}” não encontrado. Experimente help ou os botões de sugestões.`);
      return;
    }
    const pathCommands = ["ls", "cd", "cat"];
    if (args.length > (pathCommands.includes(name) ? 1 : 0) || (name === "cat" && !args.length)) {
      fail(`Uso: ${name}${pathCommands.includes(name) ? name === "cat" ? " caminho/arquivo.txt" : " [caminho]" : ""}`);
      return;
    }
    switch (name) {
      case "help":
        print([...commands].map(([command, description]) => `${command.padEnd(10)} ${description}`));
        print(["Exemplo: ls → cd projects → ls → cat projetos.txt → cd ..", "Tab completa comandos. Depois de um comando completo, Tab navega pelos controles."]);
        break;
      case "whoami": print([introduction]); break;
      case "about": print(about); break;
      case "skills": print(skills); break;
      case "projects": print(projects.flatMap(cardContent)); break;
      case "writeups": print(writeups.flatMap(cardContent)); break;
      case "contact": print(contacts); break;
      case "pwd": print([currentDirectory]); break;
      case "ls": listDirectory(resolvePath(args[0] || ".")); break;
      case "cd": {
        const path = resolvePath(args[0]);
        if (directories.has(path)) {
          currentDirectory = path;
          updatePrompt();
          status.textContent = `Diretório atual: ${currentDirectory}`;
        } else fail(files.has(path) ? "Esse caminho é um arquivo, não um diretório." : "Diretório não encontrado. Use ls para ver as opções.");
        break;
      }
      case "cat": {
        const path = resolvePath(args[0]);
        if (files.has(path)) print(files.get(path));
        else fail(directories.has(path) ? "Esse caminho é um diretório. Use ls para listar os arquivos." : "Arquivo virtual não encontrado. Use ls para ver os nomes disponíveis.");
        break;
      }
      case "clear": output.replaceChildren(); status.textContent = "Histórico visual limpo."; break;
      case "date": print([new Date().toLocaleString()]); break;
      case "exit": closeTerminal(); break;
    }
  }

  function openTerminal(event) {
    if (dialog.open) return;
    opener = event.currentTarget;
    dialog.classList.remove("is-closing");
    if (typeof closeMenu === "function") closeMenu();
    showWelcome();
    dialog.showModal();
    document.body.classList.add("terminal-open");
    input.focus({ preventScroll: true });
    updateCursor();
    output.scrollTop = output.scrollHeight;
  }

  triggers.forEach((button) => {
    button.hidden = false;
    button.disabled = false;
    button.addEventListener("click", openTerminal);
  });
  dialog.querySelector("#terminal-close").addEventListener("click", closeTerminal);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeTerminal(); });
  dialog.addEventListener("animationend", (event) => {
    if (event.target === dialog && event.animationName === "terminal-close") finishClose();
  });
  dialog.addEventListener("close", () => {
    window.clearTimeout(closeTimer);
    closing = false;
    dialog.classList.remove("is-closing");
    document.body.classList.remove("terminal-open");
    // No celular, a origem está no menu recolhido: reabra-o antes de devolver o foco.
    if (opener?.closest("#main-nav") && window.matchMedia("(max-width: 760px)").matches) {
      document.querySelector("#main-nav").classList.add("is-open");
      document.querySelector(".menu-toggle").setAttribute("aria-expanded", "true");
    }
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  motionPreference.addEventListener("change", () => {
    if (motionPreference.matches && closing) finishClose();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (closing) return;
    execute(input.value);
    if (!closing) input.focus({ preventScroll: true });
  });
  dialog.querySelectorAll("[data-terminal-command]").forEach((button) => {
    button.addEventListener("click", () => {
      if (closing) return;
      execute(button.dataset.terminalCommand);
      input.focus({ preventScroll: true });
    });
  });
  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (historyPosition === history.length) draft = input.value;
      historyPosition = Math.max(0, Math.min(history.length, historyPosition + (event.key === "ArrowUp" ? -1 : 1)));
      input.value = historyPosition === history.length ? draft : history[historyPosition];
      input.setSelectionRange(input.value.length, input.value.length);
      updateCursor();
    } else if (event.key === "Tab" && !event.shiftKey) {
      const prefix = input.value.trimStart();
      if (!prefix || /\s/u.test(prefix) || commands.has(prefix)) return;
      const matches = [...commands.keys()].filter((command) => command.startsWith(prefix));
      if (!matches.length) return;
      event.preventDefault();
      if (matches.length === 1) input.value = `${matches[0]} `;
      else print([`Possibilidades: ${matches.join(", ")}. Digite mais letras ou use Shift+Tab para navegar.`]);
      updateCursor();
    }
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    const controls = [...dialog.querySelectorAll("button, input, a[href], [tabindex='0']")]
      .filter((element) => !element.disabled && element.getClientRects().length);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  ["input", "keyup", "click", "select", "scroll", "focus"].forEach((event) => {
    input.addEventListener(event, updateCursor);
  });
  updatePrompt();
})();
