# Bug.io

Jogo multiplayer de navegador estilo .io — controle um inseto, coma recursos, evolua e enfrente outros jogadores num jardim gigante.

## Stack

- **Cliente:** Phaser 3 + TypeScript + Vite
- **Servidor:** Node.js + Socket.IO + TypeScript
- **Estado:** em memória (sem banco por enquanto)

## Como rodar

```bash
npm install
npm run dev
```

- Cliente: http://localhost:5173
- Servidor: http://localhost:3001

## Controles

| Ação | Tecla |
|------|--------|
| Mover | WASD |
| Mirar | Mouse |
| Ataque | Clique esquerdo |
| Habilidade | Espaço |
| Dash | Shift |

## Evolução

```
Formiga
 ├── Joaninha → Besouro
 ├── Abelha → Vespa
 └── Aranha → Escorpião
```

Ao juntar XP suficiente, escolha o próximo ramo na barra inferior.
