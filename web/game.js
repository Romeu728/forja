(() => {
  const canvas = document.querySelector("#world");
  const context = canvas.getContext("2d");
  const columns = 20;
  const rows = 12;
  const tile = 32;
  let world = [];
  let player = { x: 10, y: 6 };
  let wood = 0;
  let stone = 0;
  let built = false;
  let seed = 0;

  function randomGenerator(value) {
    let state = value || 1;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function createWorld(themes = ["vento", "jardim"]) {
    seed = Array.from(themes.join("|")).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 0) || 1;
    const random = randomGenerator(seed);
    world = Array.from({ length: rows }, () => Array(columns).fill("grass"));
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const edge = x < 2 || x > columns - 3 || y < 2 || y > rows - 3;
        if (edge && random() < 0.25) world[y][x] = "water";
        else if (random() < 0.10) world[y][x] = "wood";
        else if (random() < 0.07) world[y][x] = "stone";
      }
    }
    player = { x: 10, y: 6 };
    world[player.y][player.x] = "grass";
    for (const [resource, minimum] of [["wood", 4], ["stone", 2]]) {
      let available = world.flat().filter((cell) => cell === resource).length;
      for (let y = 2; available < minimum && y < rows - 2; y++) {
        for (let x = 2; available < minimum && x < columns - 2; x++) {
          if (world[y][x] === "grass" && (x !== player.x || y !== player.y)) {
            world[y][x] = resource;
            available++;
          }
        }
      }
    }
    wood = 0;
    stone = 0;
    built = false;
    document.querySelector("#seed-label").textContent = seed.toString(16).toUpperCase().slice(-5);
    updateInventory();
    setMessage("A ilha espera por você. Encontre madeira e minério.");
    draw();
  }

  function updateInventory() {
    document.querySelector("#wood-count").textContent = wood;
    document.querySelector("#stone-count").textContent = stone;
  }

  function setMessage(message) {
    document.querySelector("#game-message").textContent = message;
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const type = world[y][x];
        const px = x * tile;
        const py = y * tile;
        context.fillStyle = type === "water" ? "#315969" : ((x + y) % 2 ? "#526d4d" : "#597653");
        context.fillRect(px, py, tile, tile);
        context.strokeStyle = "#ffffff0b";
        context.strokeRect(px, py, tile, tile);
        if (type === "wood") {
          context.fillStyle = "#704c35";
          context.fillRect(px + 13, py + 18, 7, 11);
          context.fillStyle = "#a77a4e";
          context.beginPath();
          context.arc(px + 16, py + 15, 11, 0, Math.PI * 2);
          context.fill();
          context.fillStyle = "#c09463";
          context.beginPath();
          context.arc(px + 12, py + 13, 5, 0, Math.PI * 2);
          context.fill();
        } else if (type === "stone") {
          context.fillStyle = "#b5c6c1";
          context.beginPath();
          context.moveTo(px + 7, py + 25); context.lineTo(px + 11, py + 11);
          context.lineTo(px + 20, py + 7); context.lineTo(px + 27, py + 19);
          context.lineTo(px + 23, py + 27); context.closePath(); context.fill();
          context.fillStyle = "#e3d6a5";
          context.fillRect(px + 16, py + 13, 3, 3);
        }
      }
    }
    context.fillStyle = "#c5ed76";
    context.beginPath();
    context.arc(player.x * tile + 16, player.y * tile + 16, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#263523";
    context.beginPath();
    context.arc(player.x * tile + 13, player.y * tile + 14, 1.3, 0, Math.PI * 2);
    context.arc(player.x * tile + 19, player.y * tile + 14, 1.3, 0, Math.PI * 2);
    context.fill();
    if (built) {
      const x = player.x * tile;
      const y = player.y * tile;
      context.fillStyle = "#e8a56b";
      context.fillRect(x + 25, y + 11, 4, 17);
      context.fillRect(x + 22, y + 26, 10, 4);
      context.fillStyle = "#fbe4a2";
      context.beginPath();
      context.arc(x + 27, y + 8, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function move(dx, dy) {
    const x = player.x + dx;
    const y = player.y + dy;
    if (x < 0 || x >= columns || y < 0 || y >= rows || world[y][x] === "water") return;
    player = { x, y };
    draw();
  }

  function collect() {
    const neighbors = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]];
    for (const [dx, dy] of neighbors) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (y < 0 || y >= rows || x < 0 || x >= columns) continue;
      if (world[y][x] === "wood") {
        wood++;
        world[y][x] = "grass";
        updateInventory();
        setMessage("Madeira coletada. Continue explorando!");
        draw();
        return;
      }
      if (world[y][x] === "stone") {
        stone++;
        world[y][x] = "grass";
        updateInventory();
        setMessage("Minério coletado. Está ficando mais perto.");
        draw();
        return;
      }
    }
    setMessage("Chegue perto de uma árvore ou rocha para coletar.");
  }

  function build() {
    if (built) {
      setMessage("Seu farol já está aceso. A próxima expedição encontrou o caminho!");
      return;
    }
    if (wood < 4 || stone < 2) {
      setMessage(`Faltam ${Math.max(0, 4 - wood)} madeiras e ${Math.max(0, 2 - stone)} minérios.`);
      return;
    }
    wood -= 4;
    stone -= 2;
    built = true;
    updateInventory();
    setMessage("Farol construído! Uma luz nova aparece no horizonte.");
    draw();
  }

  function keydown(event) {
    if (event.target instanceof HTMLInputElement) return;
    const key = event.key.toLowerCase();
    const moves = {
      arrowup: [0, -1], w: [0, -1],
      arrowdown: [0, 1], s: [0, 1],
      arrowleft: [-1, 0], a: [-1, 0],
      arrowright: [1, 0], d: [1, 0],
    };
    if (moves[key]) {
      event.preventDefault();
      move(...moves[key]);
    } else if (key === "e") {
      event.preventDefault();
      collect();
    } else if (key === "b") {
      event.preventDefault();
      build();
    }
  }

  document.addEventListener("keydown", keydown);
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const movements = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      if (movements[action]) move(...movements[action]);
      else if (action === "collect") collect();
      else if (action === "build") build();
      canvas.focus();
    });
  });
  window.addEventListener("forja:world", (event) => createWorld(event.detail.themes));
  createWorld();
})();
