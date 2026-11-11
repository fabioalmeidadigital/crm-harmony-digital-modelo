import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

// Tradutores do navegador (Google Tradutor etc.) trocam os textos da página por elementos próprios.
// Quando o React depois tenta atualizar/remover esses textos, o navegador lança erro e a tela quebra.
// Esta proteção faz o React ignorar com segurança nós que o tradutor já moveu.
if (typeof Node === "function" && Node.prototype) {
  const origRemove = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) child.parentNode.removeChild(child);
      return child;
    }
    return origRemove.call(this, child) as T;
  };
  const origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, node: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) return origInsert.call(this, node, null) as T;
    return origInsert.call(this, node, ref) as T;
  };
}

// Após uma publicação, abas antigas tentam carregar arquivos que não existem mais → tela branca.
// Recarrega a página uma vez automaticamente.
const RELOAD_KEY = "chunk-reload-at";
function reloadOnce() {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last > 30000) {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  }
  return false;
}
window.addEventListener("vite:preloadError", (e) => {
  e.preventDefault();
  reloadOnce();
});

class RootBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[RootBoundary]", error);
    if (/dynamically imported module|Loading chunk|Importing a module script/i.test(error.message)) reloadOnce();
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: 40, fontFamily: "Montserrat, sans-serif", textAlign: "center" }}>
        <h2>Algo deu errado ao carregar o CRM.</h2>
        <p style={{ margin: "12px 0" }}>Clique abaixo para recarregar a página.</p>
        <button
          onClick={() => {
            sessionStorage.removeItem(RELOAD_KEY);
            window.location.reload();
          }}
          style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid currentColor", cursor: "pointer" }}
        >
          Recarregar
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <RootBoundary>
    <App />
  </RootBoundary>,
);
