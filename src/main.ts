import './style.css';
import { GameClient } from './game/GameClient';
import { MockSessionTransport } from './net/MockSessionTransport';
import { WebSocketSessionTransport } from './net/WebSocketSessionTransport';

const app = document.getElementById('app');
if (!app) {
  throw new Error('missing #app container in index.html');
}

// `?offline` skips the Session Server entirely and plays solo against the
// in-memory MockSessionTransport; otherwise this connects to a real
// DaddyRacing Session Server (see WebSocketSessionTransport for how its URL
// is chosen, and how to override it with `?server=ws://host:port`).
const offline = new URLSearchParams(window.location.search).has('offline');
const transport = offline ? new MockSessionTransport() : new WebSocketSessionTransport();

const client = new GameClient(app, transport);
client.start();
