const form = document.querySelector("#idea-form");
const statusMessage = document.querySelector("#status");
const results = document.querySelector("#results");

function showSources(sources) {
  const list = document.querySelector("#sources");
  list.replaceChildren();
  document.querySelector("#source-count").textContent = `${sources.length} FONTES`;
  if (!sources.length) {
    const empty = document.createElement("p");
    empty.className = "empty-sources";
    empty.textContent = "Nenhum resultado relevante apareceu. Tente outros termos.";
    list.append(empty);
    return;
  }
  for (const source of sources) {
    const card = document.createElement("a");
    card.className = "source-card";
    card.href = source.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    const title = document.createElement("strong");
    title.textContent = source.title;
    const snippet = document.createElement("span");
    snippet.textContent = source.snippet || "Abra a fonte para consultar o resultado.";
    const url = document.createElement("small");
    url.textContent = source.url;
    card.append(title, snippet, url);
    list.append(card);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  const values = new FormData(form);
  const params = new URLSearchParams({ a: values.get("a"), b: values.get("b") });
  button.disabled = true;
  statusMessage.textContent = "Pesquisando referências e forjando um conceito…";
  results.hidden = true;
  try {
    const response = await fetch(`/api/idea?${params}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível criar a ideia.");
    document.querySelector("#concept-heading").textContent = data.concept.title;
    document.querySelector("#premise").textContent = data.concept.premise;
    document.querySelector("#loop").textContent = data.concept.loop;
    document.querySelector("#twist").textContent = data.concept.twist;
    const notice = document.querySelector("#ai-notice");
    notice.hidden = !data.ai_notice;
    notice.textContent = data.ai_notice || "";
    showSources(data.sources);
    results.hidden = false;
    statusMessage.textContent = "";
    window.dispatchEvent(new CustomEvent("forja:world", { detail: { themes: data.themes } }));
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
