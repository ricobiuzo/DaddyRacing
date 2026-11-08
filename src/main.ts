import './style.css';
import { GameClient } from './game/GameClient';

const app = document.getElementById('app');
if (!app) {
  throw new Error('missing #app container in index.html');
}

const client = new GameClient(app);
client.start();
