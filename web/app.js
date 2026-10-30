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

function staticConcept(themeA, themeB) {
  return {
    title: `Entre ${themeA} e ${themeB}`,
    premise: `Em um arquipélago que muda de forma a cada amanhecer, uma exploradora combina a curiosidade de ${themeA} com a inventividade de ${themeB} para reativar faróis adormecidos.`,
    loop: "Explore uma ilha procedural, recolha madeira e minério, e construa um farol antes que a névoa avance.",
    twist: "Cada estrutura altera o terreno ao redor e revela novas rotas, mas os recursos de cada ilha são limitados.",
  };
}

function showStaticSearch(themeA, themeB) {
  const query = `${themeA} ${themeB} game mechanics ideas`;
  showSources([{
    title: `Pesquisar “${themeA} + ${themeB}” na web`,
    url: `https://duckduckgo.com/?${new URLSearchParams({ q: query })}`,
    snippet: "Abra a pesquisa pública para consultar fontes, resultados e contextos originais.",
  }]);
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
    let response;
    try {
      response = await fetch(`api/idea?${params}`);
    } catch (error) {
      if (error instanceof TypeError) response = null;
      else throw error;
    }
    let data;
    if (response?.ok) {
      data = await response.json();
    } else if (!response || response.status === 404) {
      const themes = [values.get("a").trim(), values.get("b").trim()];
      data = { themes, concept: staticConcept(...themes), ai_notice: null };
      showStaticSearch(...themes);
      statusMessage.textContent = "Modo público estático: conceito local e busca externa.";
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || "Não foi possível criar a ideia.");
    }
    document.querySelector("#concept-heading").textContent = data.concept.title;
    document.querySelector("#premise").textContent = data.concept.premise;
    document.querySelector("#loop").textContent = data.concept.loop;
    document.querySelector("#twist").textContent = data.concept.twist;
    const notice = document.querySelector("#ai-notice");
    notice.hidden = !data.ai_notice;
    notice.textContent = data.ai_notice || "";
    if (data.sources) showSources(data.sources);
    results.hidden = false;
    if (data.sources) statusMessage.textContent = "";
    window.dispatchEvent(new CustomEvent("forja:world", { detail: { themes: data.themes } }));
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
