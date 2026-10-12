import Phaser from 'phaser';
import { HERO_PATH, HEROES, POWERS, heroFromXp, type JoinPayload } from '@bug-io/shared';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const boot = document.getElementById('boot')!;
const playBtn = document.getElementById('play') as HTMLButtonElement;
const nameInput = document.getElementById('name') as HTMLInputElement;
const evoPreview = document.getElementById('evo-preview')!;
const progressLabel = document.getElementById('progress-label')!;

type Progress = {
  name: string;
  xp: number;
  food: number;
  shieldTier?: number | null;
};

let game: Phaser.Game | null = null;
let starting = false;

function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem('bugio-progress');
    if (!raw) return null;
    const data = JSON.parse(raw) as Progress & { heroId?: string };
    return {
      name: data.name,
      xp: data.xp ?? 0,
      food: data.food ?? 0,
      shieldTier: data.shieldTier ?? null,
    };
  } catch {
    return null;
  }
}

function buildMenu() {
  const progress = loadProgress();
  nameInput.value = progress?.name || localStorage.getItem('bugio-name') || '';
  const xp = progress?.xp ?? 0;
  const current = heroFromXp(xp);

  evoPreview.innerHTML = '';
  for (const id of HERO_PATH) {
    const hero = HEROES[id];
    const card = document.createElement('div');
    card.className = `card${id === current ? ' selected' : ''}`;
    card.style.cursor = 'default';
    card.innerHTML = `
      <img src="${hero.preview}" alt="${hero.name}" />
      <div class="name">${hero.name}</div>
      <div class="name" style="opacity:0.7;margin-top:2px">${POWERS[hero.powerId].name}</div>
      <div class="name" style="opacity:0.55;margin-top:2px">${hero.next ? `XP ${hero.xpToEvolve}` : 'Forma final'}</div>
    `;
    evoPreview.appendChild(card);
  }

  if (progress) {
    progressLabel.textContent = `Você volta como ${HEROES[current].name} - XP ${xp} - Poder: ${POWERS[HEROES[current].powerId].name}`;
  } else {
    progressLabel.textContent =
      'Começa no Anjo Caído I. Ao juntar XP, evolui sozinho e muda de poder. Morte: -50% XP.';
  }
}

async function startGame() {
  if (starting) return;
  starting = true;

  const progress = loadProgress();
  const name = nameInput.value.trim() || 'Herói';
  localStorage.setItem('bugio-name', name);

  const payload: JoinPayload = {
    name,
    xp: progress?.xp ?? 0,
    food: progress?.food ?? 0,
    shieldTier: null,
  };

  boot.classList.add('hidden');
  document.getElementById('game')!.innerHTML = '';

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#5f8f45',
    scene: [],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  game.scene.add('BootScene', BootScene, true, payload);
  game.scene.add('GameScene', GameScene, false);
  starting = false;
}

playBtn.addEventListener('click', () => {
  void startGame();
});
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void startGame();
});

window.addEventListener('bugio-return-menu', () => {
  game = null;
  buildMenu();
});

buildMenu();
