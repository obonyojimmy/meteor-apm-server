import Alert from './alert';
import { EventEmitter } from 'events';
import { Operations } from './operations';

const debug = require('debug')('alertsman:altersStore');

export default class AlertsStore extends EventEmitter {
  constructor(strategy) {
    super();
    this.reset = this.reset.bind(this);
    this.alerts = new Map();
    this.resetInterval = 1000 * 60 * 60; // Reset alerts ever hour

    this.alertsCol = Alerts;

    this._strategy = strategy;
    this._strategy.on('operation', (data) => this.onOperationReceived(data));
  }

  load() {
    const promise = this._strategy.run();
    this.reset();
    this._resetHandler = setInterval(this.reset, this.resetInterval);
    return promise;
  }

  async reset() {
    const selector = { 'meta.enabled': true };
    const alerts = await this.alertsCol.find(selector).fetch();
    debug(`reset and load ${alerts.length} alerts`);

    // disable exisitng alerts
    for (const alert of this.alerts.values()) {
      this.emit('disabled', new Alert(alert));
    }
    this.alerts.clear();

    // enable loaded alerts
    for (const a of alerts) {
      this.alerts.set(a._id, a);
      this.emit('enabled', new Alert(a));
    }
  }

  stopReseting() {
    clearTimeout(this._resetHandler);
  }

  async onOperationReceived({ operation, alertId, lastCheckedDate }) {
    debug(`new alerts update type=${operation} id=${alertId}`);

    switch (operation) {
      case Operations.UpdateLastCheckedDate: {
        const alert = this.alerts.get(alertId);
        if (alert) {
          alert.lastCheckedDate = lastCheckedDate;
          this.emit('disabled', new Alert(alert));
          this.emit('enabled', new Alert(alert));
        }
        break;
      }
      default:
        const selecter = { _id: alertId };
        const rawAlert = await this.alertsCol.findOne(selecter);
        const cachedAlert = this.alerts.get(alertId);
        // If the alert removed or disabled we need to branch it out.
        if (!rawAlert || !rawAlert.meta.enabled) {
          // If there is a cached alert already. Simply disable it
          if (cachedAlert) {
            this.emit('disabled', new Alert(cachedAlert));
          }
          return;
        }

        // For alerts which are enabled

        // If we've a cache, disable it
        if (cachedAlert) {
          this.emit('disabled', new Alert(cachedAlert));
        }

        // Assign the new rawAlert to cache and enable it
        this.alerts.set(alertId, rawAlert);
        this.emit('enabled', new Alert(rawAlert));
    }
  }

  async setArmed(alert, isArmed) {
    const mutations = {};

    if (isArmed) {
      // If armed, we need to set the armedDate and
      // clear the `lastArmedClearedDate` if there is
      mutations.armedDate = new Date();
      mutations.lastArmedClearedDate = null;
    } else {
      // If armed state cleared, we need to remove the armedDate
      // and set the lastArmedClearedDate
      mutations.armedDate = null;
      mutations.lastArmedClearedDate = new Date();
    }

    await this.alertsCol.update(alert.getId(), {
      $set: mutations
    });
  }

  async updateLastCheckedDate(alert, lastCheckedDate = new Date()) {
    if (!(lastCheckedDate instanceof Date)) {
      throw new Error('Expect lastChecked as a Date object');
    }

    await this.alertsCol.update(alert.getId(), {
      $set: {
        lastCheckedDate
      }
    });
  }

  close() {
    this._strategy.stop();
    this._strategy.removeAllListeners();
    this.removeAllListeners();
  }
}
