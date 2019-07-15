import { EventEmitter } from 'events';

export default class BaseStrategy extends EventEmitter {
  constructor() {
    super();
  }

  async run() { }
  async stop() { }
}